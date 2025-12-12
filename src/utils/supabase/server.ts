import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
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

    const cookieStore = await cookies()

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options?: CookieOptions) {
                    try {
                        (cookieStore as unknown as { set: (name: string, value: string, options?: CookieOptions) => void }).set(name, value, options)
                    } catch {
                        // ignore if we're in a read-only context
                    }
                },
                remove(name: string, options?: CookieOptions) {
                    try {
                        (cookieStore as unknown as { delete: (name: string, options?: CookieOptions) => void }).delete(name, options)
                    } catch {
                        // ignore if we're in a read-only context
                    }
                },
            },
        }
    )
}
