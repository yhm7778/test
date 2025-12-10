'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function getClients() {
    const supabase = await createClient()

    // Check admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return { error: 'Unauthorized' }
    }

    // Use Service Role if available to bypass RLS, otherwise use authenticated client
    let adminSupabase: SupabaseClient<Database> | Awaited<ReturnType<typeof createClient>> = supabase
    let warning: string | undefined;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        adminSupabase = createSupabaseClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
    } else {
        console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. RLS bypassing will not work.')
        warning = 'Service Role Key가 설정되지 않아 전체 사용자 목록을 불러올 수 없습니다. (RLS 제한됨)';
    }

    // Fetch clients
    const { data: clients, error } = await adminSupabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    return { data: clients, warning }
}

export async function updateUserLimit(userId: string, limit: number) {
    const supabase = await createClient()

    // Check admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return { error: 'Unauthorized' }
    }

    // Use Service Role if available to bypass RLS, otherwise use authenticated client
    let adminSupabase: SupabaseClient<Database> | Awaited<ReturnType<typeof createClient>> = supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        adminSupabase = createSupabaseClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )
    }

    const { error } = await adminSupabase
        .from('profiles')
        .update({ max_requests: limit })
        .eq('id', userId)

    if (error) return { error: error.message }

    return { success: true }
}

export async function createClientAccount(email: string, password: string, name?: string) {
    const supabase = await createClient()

    // Check admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return { error: 'Unauthorized' }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { error: 'Server configuration error: Service Role Key missing' }
    }

    const adminSupabase = createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Create user
    const { data: newUser, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm
        user_metadata: {
            role: 'client', // Force client role
            full_name: name
        }
    })

    if (error) return { error: error.message }

    // Ensure profile exists (triggers usually handle this, but if we need manual update):
    // If triggers rely on public.users, auth.users insert triggers it.
    // If we need to set specific fields in profiles that trigger missed (like name?), update it here.
    if (newUser.user && name) {
        // Wait a small bit for trigger or just update
        await new Promise(r => setTimeout(r, 500)); // weak consistency for trigger
        await adminSupabase
            .from('profiles')
            .update({ username: name })
            .eq('id', newUser.user.id)
    }

    return { success: true }
}
