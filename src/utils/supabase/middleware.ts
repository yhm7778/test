import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('CRITICAL: Supabase environment variables are missing in middleware.')
        // Return error page or redirect to setup page
        return NextResponse.json(
            { 
                error: 'Server configuration error',
                message: 'Supabase environment variables are missing. Please check your .env.local file.'
            },
            { status: 500 }
        )
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const path = request.nextUrl.pathname

    // Skip auth check for static files and API routes (except protected ones)
    const isStaticFile = path.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i)
    const isApiRoute = path.startsWith('/api/')
    const isPublicApiRoute = isApiRoute && !path.startsWith('/api/auth/') && !path.startsWith('/api/staff/')

    // Only check auth for routes that need it
    const protectedRoutes = ['/admin', '/my', '/apply']
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    const needsAuthCheck = isProtectedRoute || path === '/login' || path.startsWith('/admin')

    let user = null
    if (needsAuthCheck && !isStaticFile && !isPublicApiRoute) {
        // Get user session only when needed
        try {
            const {
                data: { user: authUser },
                error,
            } = await supabase.auth.getUser()
            
            // If refresh token is invalid/expired or session is missing, treat as no user (normal case)
            if (error && (error.code === 'refresh_token_not_found' || error.message === 'Auth session missing!')) {
                user = null
            } else if (error) {
                // Log other auth errors but don't break the flow
                console.warn('Auth error in middleware:', error.message)
                user = null
            } else {
                user = authUser
            }
        } catch (error) {
            // Handle any unexpected errors gracefully
            console.warn('Unexpected error getting user in middleware:', error)
            user = null
        }
    }

    // Prevent showing login page to already authenticated users
    if (path === '/login' && user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/'
        return NextResponse.redirect(redirectUrl)
    }

    // Protected routes - require authentication
    if (isProtectedRoute && !user) {
        // Redirect to login if not authenticated
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(redirectUrl)
    }

    // Admin-only routes - only check if user exists and path is admin
    if (path.startsWith('/admin') && user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single() as { data: { role: 'admin' | 'staff' | 'client' } | null }

        if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
            // Redirect to home if not admin/staff
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/'
            return NextResponse.redirect(redirectUrl)
        }
    }

    // Add security headers
    supabaseResponse.headers.set('X-Frame-Options', 'DENY')
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
    supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    supabaseResponse.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
    )

    // Content Security Policy
    supabaseResponse.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "media-src 'self' data: https: blob:; " +
        "connect-src 'self' https://*.supabase.co; " +
        "frame-ancestors 'none';"
    )

    return supabaseResponse
}
