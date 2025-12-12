'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createSupabaseAdminClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

type SupabaseAdminClient = SupabaseClient<Database>

async function syncStaffProfile(supabaseAdmin: SupabaseAdminClient, userId: string, email: string, username: string) {
    const profileResult = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq<'id'>('id', userId as ProfileRow['id'])
        .maybeSingle<Pick<ProfileRow, 'id'>>()

    if (profileResult.error) {
        return { error: profileResult.error }
    }

    if (profileResult.data) {
        const updatePayload: ProfileUpdate = {
            role: 'staff',
            email,
            username,
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq<'id'>('id', userId as ProfileRow['id'])

        if (error) {
            return { error }
        }

        return { success: true }
    }

    const insertPayload: ProfileInsert = {
        id: userId,
        email,
        role: 'staff',
        username,
    }

    const { error } = await supabaseAdmin.from('profiles').insert(insertPayload)
    if (error) {
        return { error }
    }

    return { success: true }
}

export async function createStaffAccount(username: string, password: string, name?: string) {
    const trimmedUsername = username?.trim()
    if (!trimmedUsername || !password) {
        return { error: '아이디와 비밀번호를 입력해주세요.' }
    }

    const supabase = await createServerClient() as SupabaseClient<Database>

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const profileResult = await supabase
        .from('profiles')
        .select('id, role')
        .eq<'id'>('id', user.id as ProfileRow['id'])
        .maybeSingle<Pick<ProfileRow, 'id' | 'role'>>()

    if (profileResult.error) {
        return { error: '프로필 정보를 불러오지 못했습니다.' }
    }

    const profile = profileResult.data

    if (!profile || profile.role !== 'admin') {
        return { error: '관리자 권한이 필요합니다.' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
        return { error: 'Supabase URL이 설정되지 않았습니다. 환경 변수 NEXT_PUBLIC_SUPABASE_URL를 확인해주세요.' }
    }
    
    if (!serviceRoleKey) {
        return { error: '서비스 역할 키가 설정되지 않았습니다. 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.' }
    }

    const supabaseAdmin = createSupabaseAdminClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )

    // Check username duplication
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .maybeSingle()

    if (existingProfile) {
        return { error: '이미 존재하는 아이디입니다.' }
    }

    const email = `${crypto.randomUUID()}@vision.local`

    const { data: createResult, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password,
        email_confirm: true,
        user_metadata: {
            name,
            username: trimmedUsername,
        },
    })

    if (createError) {
        return { error: `계정 생성 중 오류가 발생했습니다: ${createError.message}` }
    }

    const newUserId = createResult.user?.id
    if (newUserId) {
        const syncResult = await syncStaffProfile(supabaseAdmin, newUserId, email, trimmedUsername)
        if (syncResult.error) {
            console.error('[createStaffAccount] Failed to sync profile for new auth user', syncResult.error)
            return { error: '프로필 동기화 중 오류가 발생했습니다.' }
        }
    }

    return { success: true }
}

export async function updateUserRole(userId: string, role: 'admin' | 'staff' | 'client') {
    const supabase = await createServerClient() as SupabaseClient<Database>

    // Check if current user is admin (session-based)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const profileResult = await supabase
        .from('profiles')
        .select('id, role')
        .eq<'id'>('id', user.id as ProfileRow['id'])
        .maybeSingle<Pick<ProfileRow, 'id' | 'role'>>()

    if (profileResult.error) {
        return { error: '프로필 정보를 불러오지 못했습니다.' }
    }

    const profile = profileResult.data

    if (!profile || profile.role !== 'admin') {
        return { error: '관리자 권한이 필요합니다.' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
        return { error: 'Supabase URL이 설정되지 않았습니다. 환경 변수 NEXT_PUBLIC_SUPABASE_URL를 확인해주세요.' }
    }
    
    if (!serviceRoleKey) {
        return { error: '서비스 역할 키가 설정되지 않았습니다. 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.' }
    }

    // Use service-role client to bypass RLS for role updates
    const supabaseAdmin = createSupabaseAdminClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )

    const profileUpdates: ProfileUpdate = { role }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq<'id'>('id', userId as ProfileRow['id'])

    if (error) {
        return { error: error.message }
    }

    // Keep auth user metadata in sync so client-side fallback can read role
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { role },
    })

    if (authUpdateError) {
        return { error: authUpdateError.message }
    }

    return { success: true }
}

export async function deleteUser(userId: string) {
    const supabase = await createServerClient() as SupabaseClient<Database>

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const profileResult = await supabase
        .from('profiles')
        .select('id, role')
        .eq<'id'>('id', user.id as ProfileRow['id'])
        .maybeSingle<Pick<ProfileRow, 'id' | 'role'>>()

    if (profileResult.error) {
        return { error: '프로필 정보를 불러오지 못했습니다.' }
    }

    const profile = profileResult.data

    if (!profile || profile.role !== 'admin') {
        return { error: '관리자 권한이 필요합니다.' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
        return { error: 'Supabase URL이 설정되지 않았습니다. 환경 변수 NEXT_PUBLIC_SUPABASE_URL를 확인해주세요.' }
    }
    
    if (!serviceRoleKey) {
        return { error: '서비스 역할 키가 설정되지 않았습니다. 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.' }
    }

    const supabaseAdmin = createSupabaseAdminClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )

    // 1. Delete completion data (before/after media files)
    const { data: apps } = await supabaseAdmin
        .from('applications')
        .select('id, before_media_urls, after_media_urls')
        .eq('user_id', userId)

    if (apps && apps.length > 0) {
        const allPaths: string[] = []
        
        for (const app of apps) {
            // Extract paths from before_media_urls
            if (app.before_media_urls && app.before_media_urls.length > 0) {
                app.before_media_urls.forEach(url => {
                    try {
                        const urlObj = new URL(url)
                        const pathParts = urlObj.pathname.split('/applications/')
                        if (pathParts.length > 1) {
                            allPaths.push(pathParts[1])
                        }
                    } catch {
                        // Ignore invalid URLs
                    }
                })
            }
            
            // Extract paths from after_media_urls
            if (app.after_media_urls && app.after_media_urls.length > 0) {
                app.after_media_urls.forEach(url => {
                    try {
                        const urlObj = new URL(url)
                        const pathParts = urlObj.pathname.split('/applications/')
                        if (pathParts.length > 1) {
                            allPaths.push(pathParts[1])
                        }
                    } catch {
                        // Ignore invalid URLs
                    }
                })
            }
        }

        if (allPaths.length > 0) {
            await supabaseAdmin.storage
                .from('applications')
                .remove(allPaths)
        }
    }

    // 2. Delete user from auth (this will cascade delete profile due to FK constraint)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
