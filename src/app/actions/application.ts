'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function submitApplication(data: {
    storeName: string,
    keywords: string[],
    advantages: string,
    tags: string[],
    notes: string,
    photoUrls: string[],
    marketingType: string | null,
    targetUserId?: string
}) {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const userId = data.targetUserId || user.id

    // If targetUserId is provided, check if requester is admin/staff
    if (data.targetUserId && data.targetUserId !== user.id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
            return { error: '권한이 없습니다.' }
        }
    }

    // 2. Setup Admin Client for Reliable Counting
    let adminSupabase: SupabaseClient<Database> | null = null
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

    const db = adminSupabase || supabase

    // 3. Check Limit
    // Calculate Month Range (KST: UTC+9)
    // To match "This Month" in Korea, we want applications where created_at (UTC) falls within KST Month.
    // simpler: Just use UTC month. 
    // If strict KST is needed: 
    // Start: YYYY-MM-01 00:00:00 KST -> YYYY-MM-01 15:00:00 (Prev Day) UTC
    // Let's stick to UTC for now as it's standard, unless user complains about 9AM reset.
    // The previous client code used UTC.

    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString()

    // Count
    const { count, error: countError } = await db
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', start)
        .lte('created_at', end)

    if (countError) {
        console.error('Count error:', countError)
        return { error: '신청 횟수 확인 중 오류가 발생했습니다.' }
    }

    // Get Limit
    const { data: profile } = await db
        .from('profiles')
        .select('max_requests')
        .eq('id', userId)
        .single()

    const limit = profile?.max_requests ?? 10
    const currentCount = count || 0

    if (currentCount >= limit) {
        return { error: `이번 달 신청 가능 횟수(${limit}회)를 초과했습니다. (현재 ${currentCount}/${limit}회)` }
    }

    // 4. Insert
    const { error: insertError } = await db
        .from('applications')
        .insert({
            user_id: userId,
            store_name: data.storeName,
            keywords: data.keywords,
            advantages: data.advantages,
            tags: data.tags,
            notes: data.notes,
            photo_urls: data.photoUrls,
            marketing_type: data.marketingType,
            status: 'pending'
        })

    if (insertError) {
        console.error('Insert error:', insertError)
        return { error: insertError.message }
    }

    return { success: true }
}
