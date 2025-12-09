'use server'

import { createClient } from '@/utils/supabase/server'
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
        .select('id, email, username, role')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }

    return { data: clients }
}
