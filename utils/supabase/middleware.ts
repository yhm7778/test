import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get user session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Protected routes - require authentication
    // Added '/apply' as requested
    const protectedRoutes = ['/admin', '/my', '/apply']
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

    if (isProtectedRoute && !user) {
        // Redirect to login if not authenticated
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(redirectUrl)
    }

    // Admin-only routes
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
        "connect-src 'self' https://*.supabase.co; " +
        "frame-ancestors 'none';"
    )

    return supabaseResponse
}
