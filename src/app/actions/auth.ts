'use server'

import { createClient } from '@/utils/supabase/server'

export async function signOut() {
    const supabase = await createClient()
    
    // Sign out from Supabase - this will clear server-side cookies
    const { error } = await supabase.auth.signOut()
    
    if (error) {
        return { error: error.message }
    }
    
    return { success: true }
}

