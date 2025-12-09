'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import { signOut as serverSignOut } from '@/app/actions/auth'

type Profile = Database['public']['Tables']['profiles']['Row']

type AuthContextType = {
    user: User | null
    session: Session | null
    profile: Profile | null
    isLoading: boolean
    isSigningOut: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ 
    children, 
    initialSession = null,
    initialProfile = null
}: { 
    children: React.ReactNode
    initialSession?: Session | null
    initialProfile?: Profile | null
}) {
    const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
    const [session, setSession] = useState<Session | null>(initialSession)
    
    // Initialize profile from initialProfile (server-fetched) or metadata
    const getInitialProfile = (): Profile | null => {
        if (initialProfile) return initialProfile
        if (!initialSession?.user) return null
        
        const normalizeRole = (role: unknown): Profile['role'] | undefined => {
            if (typeof role !== 'string') return undefined
            const value = role.trim().toLowerCase()
            if (value === 'admin' || value === 'staff' || value === 'client') {
                return value as Profile['role']
            }
            return undefined
        }

        const metadataRole =
            normalizeRole(initialSession.user.user_metadata?.role) ||
            normalizeRole(initialSession.user.app_metadata?.role) ||
            (Array.isArray(initialSession.user.app_metadata?.roles)
                ? normalizeRole(initialSession.user.app_metadata?.roles[0])
                : undefined)
                
        return {
            id: initialSession.user.id,
            email: initialSession.user.email ?? null,
            username: initialSession.user.user_metadata?.username ?? initialSession.user.email?.split('@')[0] ?? null,
            role: metadataRole ?? 'client',
            created_at: initialSession.user.created_at,
            scheduled_deletion_at: null,
            max_requests: null,
        }
    }

    const [profile, setProfile] = useState<Profile | null>(getInitialProfile())
    // If we have an initial session, we aren't "loading" in the blocking sense
    const [isLoading, setIsLoading] = useState(!initialSession) 
    const [isSigningOut, setIsSigningOut] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        let isMounted = true

        const hydrateSession = async (session: Session | null) => {
            if (!isMounted) return
            setSession(session)
            setUser(session?.user ?? null)

            const normalizeRole = (role: unknown): Profile['role'] | undefined => {
                if (typeof role !== 'string') return undefined
                const value = role.trim().toLowerCase()
                if (value === 'admin' || value === 'staff' || value === 'client') {
                    return value as Profile['role']
                }
                return undefined
            }

            const metadataRole =
                normalizeRole(session?.user?.user_metadata?.role) ||
                normalizeRole(session?.user?.app_metadata?.role) ||
                (Array.isArray(session?.user?.app_metadata?.roles)
                    ? normalizeRole(session?.user?.app_metadata?.roles[0])
                    : undefined)

            const fallbackProfile: Profile | null = session?.user
                ? {
                    id: session.user.id,
                    email: session.user.email ?? null,
                    username: session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? null,
                    role: metadataRole ?? 'client',
                    created_at: session.user.created_at,
                    scheduled_deletion_at: null,
                    max_requests: null,
                }
                : null

            if (session?.user) {
                // Check session storage cache first for immediate feedback
                const cacheKey = `profile_${session.user.id}`
                const cachedProfileStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
                
                if (cachedProfileStr) {
                    try {
                        const cached = JSON.parse(cachedProfileStr)
                        setProfile(cached)
                        // If we have a cache, we can stop loading immediately
                        setIsLoading(false) 
                    } catch (e) {
                        console.error('Error parsing cached profile', e)
                    }
                }

                try {
                    // Add timeout to profile fetch to prevent hanging
                    const fetchProfile = supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single<Profile>()

                    const timeoutPromise = new Promise<{ data: null, error: { message: string } }>((resolve) => {
                        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 2000)
                    })

                    const { data: profileData, error } = await Promise.race([fetchProfile, timeoutPromise])

                    if (!isMounted) return

                    if (error) {
                        // If we didn't have a cache, we must fallback now. 
                        // If we had a cache, we keep it (or fallback if it was invalid/cleared)
                        if (!cachedProfileStr) {
                            console.warn('Failed to load profile (or timed out), using metadata fallback', error)
                            setProfile(fallbackProfile)
                        }
                    } else {
                        const normalizedDbRole = normalizeRole(profileData?.role)
                        const mergedProfile = profileData && normalizedDbRole
                            ? { ...profileData, role: normalizedDbRole }
                            : fallbackProfile
                        
                        setProfile(mergedProfile)
                        
                        // Update cache
                        if (typeof sessionStorage !== 'undefined') {
                            sessionStorage.setItem(cacheKey, JSON.stringify(mergedProfile))
                        }
                    }
                } catch (err) {
                    console.error('Unexpected error loading profile:', err)
                    if (!cachedProfileStr) {
                        setProfile(fallbackProfile)
                    }
                }
            } else {
                setProfile(null)
                if (typeof sessionStorage !== 'undefined') {
                    // Clear cache on logout
                    Object.keys(sessionStorage).forEach(key => {
                        if (key.startsWith('profile_')) {
                            sessionStorage.removeItem(key)
                        }
                    })
                }
            }

            setIsLoading(false)
        }

        supabase.auth.getSession().then(({ data }) => {
            hydrateSession(data.session)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            await hydrateSession(session)

            if (event === 'SIGNED_OUT') {
                router.push('/')
                router.refresh()
            }
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [router, supabase])

    const signOut = async () => {
        if (isSigningOut) return

        setIsSigningOut(true)
        const timeoutMs = 4000

        try {
            // Fast client-side cleanup first
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.clear()
            }
            
            const signOutTasks = Promise.allSettled([
                supabase.auth.signOut(),
                serverSignOut(),
            ])

            await Promise.race([
                signOutTasks,
                new Promise(resolve => setTimeout(resolve, timeoutMs)),
            ])
        } catch (error) {
            console.error('Logout failed', error)
        } finally {
            // Hard navigation for fastest state reset
            window.location.href = '/'
        }
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, isSigningOut, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
