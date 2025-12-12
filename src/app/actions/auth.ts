'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined. Please check your .env.local file.')
    }
    
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined. Please check your .env.local file.')
    }
    
    return createSupabaseAdminClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}

export async function signIn(username: string, password: string) {
    const supabase = await createClient()

    // 1. username으로 email 조회 (Admin 권한 필요)
    const adminClient = getAdminClient()
    const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single()

    if (profileError || !profile) {
        return { error: '존재하지 않는 아이디입니다.' }
    }

    // 2. 조회된 email로 로그인
    const { error } = await supabase.auth.signInWithPassword({
        email: profile.email!,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function signUp(username: string, password: string, phone: string) {
    const supabase = await createClient()
    const adminClient = getAdminClient()

    // 1. 중복 아이디 체크
    const { data: existingUser } = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

    if (existingUser) {
        return { error: '이미 존재하는 아이디입니다.' }
    }

    // 2. 이메일 생성 (UUID 사용)
    const email = `${crypto.randomUUID()}@vision.local`

    // 3. 회원가입
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                phone,
                role: 'client'
            }
        }
    })

    if (error) {
        return { error: error.message }
    }

    if (!data.user) {
        return { error: '회원가입 실패 (User creation failed)' }
    }

    // 4. Profiles 테이블에 username과 phone 저장
    // 트리거가 있을 수 있지만 안전을 위해 명시적으로 업데이트
    const { error: updateError } = await adminClient
        .from('profiles')
        .upsert({
            id: data.user.id,
            email: email,
            username: username,
            phone: phone,
            role: 'client'
        })

    if (updateError) {
        console.error('Profile update error:', updateError)
    }

    return { success: true }
}

export async function signOut() {
    const supabase = await createClient()

    // Sign out from Supabase - this will clear server-side cookies
    const { error } = await supabase.auth.signOut()

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
