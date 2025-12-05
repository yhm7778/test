import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
    const cookieStore = await cookies()

    // Pre-fetch all cookies to avoid async issues and potential context loss
    const allCookies = cookieStore.getAll()
    console.log('Server client created. Cookies count:', allCookies.length)

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return allCookies
                },
                get(name: string) {
                    // Safe implementation using pre-fetched cookies
                    const cookie = allCookies.find(c => c.name === name)
                    return cookie?.value
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
