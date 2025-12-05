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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
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
                    role: metadataRole ?? 'client',
                    created_at: new Date().toISOString(),
                }
                : null

            if (session?.user) {
                const { data: profileData, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single<Profile>()

                if (!isMounted) return

                if (error) {
                    console.warn('Failed to load profile, using metadata fallback', error)
                    setProfile(fallbackProfile)
                } else {
                    const normalizedDbRole = normalizeRole(profileData?.role)
                    const mergedProfile = profileData && normalizedDbRole
                        ? { ...profileData, role: normalizedDbRole }
                        : fallbackProfile
                    setProfile(mergedProfile)
                }
            } else {
                setProfile(null)
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
            // Always clear local state even if network/logout failed/timed out
            setUser(null)
            setSession(null)
            setProfile(null)
            router.replace('/')
            router.refresh()
            setIsSigningOut(false)
        }
    }

    const normalizeRole = (role: unknown): Profile['role'] | undefined => {
        if (typeof role !== 'string') return undefined
        const value = role.trim().toLowerCase()
        if (value === 'admin' || value === 'staff' || value === 'client') return value as Profile['role']
        return undefined
    }

    const derivedRole =
        normalizeRole(profile?.role) ||
        normalizeRole(session?.user?.user_metadata?.role) ||
        normalizeRole(session?.user?.app_metadata?.role) ||
        (Array.isArray(session?.user?.app_metadata?.roles)
            ? normalizeRole(session?.user?.app_metadata?.roles[0])
            : undefined)
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
