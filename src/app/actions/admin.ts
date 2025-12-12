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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && serviceRoleKey) {
        adminSupabase = createSupabaseClient<Database>(
            supabaseUrl,
            serviceRoleKey,
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
        return { error: 'Server configuration error: NEXT_PUBLIC_SUPABASE_URL is missing. Please check your .env.local file.' }
    }
    
    if (!serviceRoleKey) {
        return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing. Please check your .env.local file.' }
    }

    const adminSupabase = createSupabaseClient<Database>(
        supabaseUrl,
        serviceRoleKey,
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

export async function updateUserInfo(userId: string, updates: { name?: string; phone?: string; password?: string }) {
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
        return { error: 'Server configuration error: NEXT_PUBLIC_SUPABASE_URL is missing. Please check your .env.local file.' }
    }
    
    if (!serviceRoleKey) {
        return { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing. Please check your .env.local file.' }
    }

    const adminSupabase = createSupabaseClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Update password if provided
    if (updates.password) {
        const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
            userId,
            { password: updates.password }
        )
        if (passwordError) {
            return { error: `비밀번호 업데이트 실패: ${passwordError.message}` }
        }
    }

    // Update profile (name and phone)
    const profileUpdates: { username?: string; phone?: string } = {}
    if (updates.name !== undefined) {
        profileUpdates.username = updates.name
    }
    if (updates.phone !== undefined) {
        profileUpdates.phone = updates.phone
    }

    if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId)

        if (profileError) {
            return { error: `프로필 업데이트 실패: ${profileError.message}` }
        }
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
            // Get application data to extract blog count
            const { data: application } = await supabase
                .from('applications')
                .select('notes')
                .eq('id', applicationId)
                .single()

            // Extract blog count from notes if blog-reporter type
            let blogCount: number | undefined
            if ((marketingType === 'blog-reporter' || marketingType === 'blog_reporter') && application?.notes) {
                const match = application.notes.match(/블로그 리뷰 갯수:\s*(\d+)개/)
                blogCount = match ? parseInt(match[1]) : undefined
            }

            // Get user profile for phone and username
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('phone, username')
                .eq('id', userId)
                .single() as { data: { phone?: string; username?: string } | null }

            if (userProfile?.phone) {
                // Notification sending is now handled in application-list.tsx
                console.log('[Admin] Notification will be sent via application-list completion handler')
            }
        } catch (err) {
            console.error('Notification setup error:', err)
            // Don't fail the status update if notification fails
        }
    }

    return { success: true }
}
