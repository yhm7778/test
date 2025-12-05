import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
