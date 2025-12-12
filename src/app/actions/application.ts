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

    // Count applications for this specific solution type
    const { count, error: countError } = await db
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('marketing_type', data.marketingType || 'etc')  // 솔루션별 카운트
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
        const solutionNames: Record<string, string> = {
            'blog-reporter': '블로그 기자단',
            'blog_reporter': '블로그 기자단',
            'blog-experience': '블로그 체험단',
            'blog_experience': '블로그 체험단',
            'instagram-popular': '인스타그램 인기게시물',
            'instagram_popular': '인스타그램 인기게시물',
            'seo-optimization': 'SEO 최적화작업',
            'seo_optimization': 'SEO 최적화작업',
            'photo-shooting': '사진촬영',
            'photo_shooting': '사진촬영',
            'etc': '기타'
        }
        const solutionName = solutionNames[data.marketingType || ''] || data.marketingType
        return { error: `${solutionName} 이번 달 신청 가능 횟수(${limit}회)를 초과했습니다. (현재 ${currentCount}/${limit}회)` }
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

export async function getLastApplication(marketingType: string): Promise<{
    data: Database['public']['Tables']['applications']['Row'] | null
    error: string | null
}> {
    const supabase = await createClient()

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { data: null, error: '로그인이 필요합니다.' }
    }

    // 2. Fetch Last Application
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('marketing_type', marketingType.replace(/-/g, '_'))
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            return { data: null, error: '이전 신청 내역이 없습니다.' }
        }
        console.error('Error fetching last application:', error)
        return { data: null, error: '이전 신청 내역을 불러오는 중 오류가 발생했습니다.' }
    }

    return { data: data as Database['public']['Tables']['applications']['Row'], error: null }
}

