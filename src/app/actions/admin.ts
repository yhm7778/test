'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

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

    // Fetch clients
    const { data: clients, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    return { data: clients }
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
    let adminSupabase = supabase
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        ) as any // Type casting to avoid mismatch if types differ slightly
    }

    const { error } = await adminSupabase
        .from('profiles')
        .update({ max_requests: limit })
        .eq('id', userId)

    if (error) return { error: error.message }

    return { success: true }
}
