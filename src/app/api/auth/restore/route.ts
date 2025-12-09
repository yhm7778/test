import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST() {
    const supabase = await createClient() as SupabaseClient<Database>
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Cancel deletion by setting to null
    const { error } = await supabase
        .from('profiles')
        .update({ scheduled_deletion_at: null })
        .eq('id', user.id)

    if (error) {
        console.error('Restore error:', error)
        return new NextResponse('Database error', { status: 500 })
    }

    return new NextResponse('OK')
}
