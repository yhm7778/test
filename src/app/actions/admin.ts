'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { sendApplicationCompletedNotification } from './notification'

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

export async function createClientAccount(userId: string, password: string, name?: string, phone?: string) {
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

    // 1. Check if ID (username) already exists
    const { data: existingUser } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('username', userId)
        .single()

    if (existingUser) {
        return { error: '이미 존재하는 아이디입니다.' }
    }

    // 2. Generate dummy email
    const email = `${crypto.randomUUID()}@vision.local`

    // 3. Create user
    const { data: newUser, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm
        user_metadata: {
            role: 'client', // Force client role
            full_name: name,
            phone: phone
        }
    })

    if (error) return { error: error.message }

    // 4. Update profile with correct username (ID) and phone
    if (newUser.user) {
        // Wait a small bit for trigger or just update
        await new Promise(r => setTimeout(r, 500)); // weak consistency for trigger
        await adminSupabase
            .from('profiles')
            .update({
                username: userId,
                phone: phone
            })
            .eq('id', newUser.user.id)
    }

    return { success: true }
}

/**
 * Update application status and send notification if completed
 */
export async function updateApplicationStatus(
    applicationId: string,
    newStatus: 'pending' | 'completed',
    userId: string,
    marketingType: string | null
) {
    const supabase = await createClient()

    // Check admin/staff permission
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

    // Update status
    const { error: updateError } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)

    if (updateError) {
        return { error: updateError.message }
    }

    // Send notification if completed
    if (newStatus === 'completed') {
        try {
            // Get user profile for phone and username
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('phone, username')
                .eq('id', userId)
                .single() as { data: { phone?: string; username?: string } | null }

            if (userProfile?.phone) {
                // Send notification (don't await to avoid blocking)
                sendApplicationCompletedNotification({
                    recipientPhone: userProfile.phone,
                    applicationType: marketingType || 'etc'
                }).catch(err => {
                    console.error('Notification error:', err)
                })
            }
        } catch (err) {
            console.error('Notification setup error:', err)
            // Don't fail the status update if notification fails
        }
    }

    return { success: true }
}
