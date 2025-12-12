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
        
        // If refresh token is invalid/expired, treat as no user (normal case)
        if (error && error.code === 'refresh_token_not_found') {
            user = null;
        } else if (error) {
            // Log other auth errors but don't break the flow
            console.warn('Auth error in restore route:', error.message);
            user = null;
        } else {
            user = authUser;
        }
    } catch (error) {
        // Handle any unexpected errors gracefully
        console.warn('Unexpected error getting user in restore route:', error);
        user = null;
    }

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
