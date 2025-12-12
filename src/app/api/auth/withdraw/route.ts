import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST() {
    const supabase = await createClient() as SupabaseClient<Database>
    let user = null;
    try {
        const {
            data: { user: authUser },
            error,
        } = await supabase.auth.getUser();
        
        // If refresh token is invalid/expired or session is missing, treat as no user (normal case)
        if (error && (error.code === 'refresh_token_not_found' || error.message === 'Auth session missing!')) {
            user = null;
        } else if (error) {
            // Log other auth errors but don't break the flow
            console.warn('Auth error in withdraw route:', error.message);
            user = null;
        } else {
            user = authUser;
        }
    } catch (error) {
        // Handle any unexpected errors gracefully
        console.warn('Unexpected error getting user in withdraw route:', error);
        user = null;
    }

    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Set scheduled_deletion_at to 7 days from now
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const { error } = await supabase
        .from('profiles')
        .update({ scheduled_deletion_at: sevenDaysLater.toISOString() })
        .eq('id', user.id)

    if (error) {
        console.error('Withdrawal error:', error)
        return new NextResponse('Database error', { status: 500 })
    }

    return new NextResponse('OK')
}
