'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createSupabaseAdminClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

type SupabaseAdminClient = SupabaseClient<Database>
type AdminApi = SupabaseAdminClient['auth']['admin']

type AdminApiWithEmail = AdminApi & {
    getUserByEmail?: (email: string) => Promise<{
        data: { user: User | null } | null
        error: { status?: number; message: string } | null
    }>
}

type MinimalAdminUser = { id: string; email?: string | null }

async function findAdminUserByEmail(adminAuth: AdminApiWithEmail, email: string) {
    if (typeof adminAuth.getUserByEmail === 'function') {
        const { data, error } = await adminAuth.getUserByEmail(email)
        if (error && error.status !== 404) {
            return { error }
        }
        return { user: data?.user ?? null }
    }

    const normalizedEmail = email.toLowerCase()
    let page = 1
    const perPage = 100

    while (true) {
        const { data, error } = await adminAuth.listUsers({ page, perPage })
        if (error) {
            return { error }
        }

        const users = (data?.users || []) as MinimalAdminUser[]
        const match = users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null
        if (match) {
            return { user: match }
        }

        if (!data || !data.users || data.users.length < perPage) {
            break
        }

        page += 1
    }

    return { user: null }
}

async function syncStaffProfile(supabaseAdmin: SupabaseAdminClient, userId: string, email: string) {
    const username = email.split('@')[0]
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

export async function createStaffAccount(email: string, password: string, name?: string) {
    const trimmedEmail = email?.trim().toLowerCase()
    if (!trimmedEmail || !password) {
        console.error('[createStaffAccount] Missing credentials', { trimmedEmailPresent: !!trimmedEmail, passwordPresent: !!password })
        return { error: '이메일과 비밀번호를 입력해주세요.' }
    }

    const supabase = await createServerClient() as SupabaseClient<Database>
    
    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[createStaffAccount] No authenticated user found')
        return { error: '로그인이 필요합니다.' }
    }

    const profileResult = await supabase
        .from('profiles')
        .select('id, role')
        .eq<'id'>('id', user.id as ProfileRow['id'])
        .maybeSingle<Pick<ProfileRow, 'id' | 'role'>>()

    if (profileResult.error) {
        console.error('[createStaffAccount] Failed to load profile', profileResult.error)
        return { error: '프로필 정보를 불러오지 못했습니다.' }
    }

    const profile = profileResult.data

    if (!profile || profile.role !== 'admin') {
        console.error('[createStaffAccount] Insufficient role', { profile })
        return { error: '관리자 권한이 필요합니다.' }
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        console.error('[createStaffAccount] Missing service role key')
        return { error: '서비스 역할 키가 설정되지 않았습니다. 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.' }
    }

    const supabaseAdmin = createSupabaseAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )

    const adminAuth = supabaseAdmin.auth.admin as AdminApiWithEmail
    const { user: existingUser, error: userLookupError } = await findAdminUserByEmail(adminAuth, trimmedEmail)

    if (userLookupError) {
        console.error('[createStaffAccount] Failed to look up existing user', userLookupError)
        return { error: `중복 확인 중 오류가 발생했습니다: ${userLookupError.message}` }
    }

    if (existingUser) {
        console.warn('[createStaffAccount] Existing auth user found, updating profile instead', { email: trimmedEmail })

        const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: {
                name,
            },
        })

        if (updateUserError) {
            console.error('[createStaffAccount] Failed to update existing auth user', updateUserError)
            return { error: `기존 계정 업데이트 중 오류가 발생했습니다: ${updateUserError.message}` }
        }

        const syncResult = await syncStaffProfile(supabaseAdmin, existingUser.id, trimmedEmail)
        if (syncResult.error) {
            console.error('[createStaffAccount] Failed to sync profile for existing auth user', syncResult.error)
            return { error: '기존 계정의 프로필 동기화 중 오류가 발생했습니다.' }
        }

        return { success: true }
    }

    const { data: createResult, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
            name,
        },
    })

    if (createError) {
        console.error('[createStaffAccount] createUser failed', createError)
        return { error: `계정 생성 중 오류가 발생했습니다: ${createError.message}` }
    }

    const newUserId = createResult.user?.id
    if (newUserId) {
        const syncResult = await syncStaffProfile(supabaseAdmin, newUserId, trimmedEmail)
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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        return { error: '서비스 역할 키가 설정되지 않았습니다. 환경 변수 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.' }
    }

    // Use service-role client to bypass RLS for role updates
    const supabaseAdmin = createSupabaseAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

