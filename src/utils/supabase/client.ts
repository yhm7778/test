import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

type ClientCookieOptions = {
    maxAge?: number
}

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        const errorMessage = 'CRITICAL: Supabase environment variables are missing. Please check your .env.local file.\n' +
            'Required variables:\n' +
            '- NEXT_PUBLIC_SUPABASE_URL\n' +
            '- NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
            'See QUICK_SETUP.md for setup instructions.'
        console.error(errorMessage)
        throw new Error(errorMessage)
    }

    return createBrowserClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    if (!isBrowser()) return null
                    const cookies = document.cookie.split(';')
                    for (const cookie of cookies) {
                        const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim())
                        if (cookieName === name) {
                            return decodeURIComponent(cookieValue)
                        }
                    }
                    return null
                },
                set(name: string, value: string, options?: ClientCookieOptions) {
                    if (!isBrowser()) return
                    let cookie = `${name}=${encodeURIComponent(value)}`

                    // Always set path to root
                    cookie += '; path=/'

                    // Set max-age if provided (0 should remove the cookie)
                    if (options && Object.prototype.hasOwnProperty.call(options, 'maxAge')) {
                        const maxAge = options.maxAge ?? 0
                        cookie += `; max-age=${maxAge}`
                        // Ensure immediate removal when maxAge is 0 or less
                        if (maxAge <= 0) {
                            cookie += '; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                        }
                    } else {
                        // Default to 1 year if not specified
                        cookie += '; max-age=31536000'
                    }

                    // Set SameSite to Lax for better compatibility
                    cookie += '; samesite=lax'

                    // Set secure in production
                    if (window.location.protocol === 'https:') {
                        cookie += '; secure'
                    }

                    document.cookie = cookie

                    // Log for debugging
                    console.log('Setting cookie:', name, 'Value length:', value.length)
                },
                remove(name: string, options?: ClientCookieOptions) {
                    if (!isBrowser()) return
                    this.set(name, '', { ...options, maxAge: 0 })
                },
            },
        }
    )
}
