import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createSupabaseAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export async function GET() {
    const supabase = await createServerClient() as SupabaseClient<Database>

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq<'id'>('id', user.id as ProfileRow['id'])
        .maybeSingle<{ role: 'admin' | 'staff' | 'client' }>()

    if (profileError) {
        return NextResponse.json({ error: '프로필 정보를 불러오지 못했습니다.' }, { status: 500 })
    }

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        return NextResponse.json({ error: '서비스 역할 키가 설정되지 않았습니다.' }, { status: 500 })
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

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'staff'])
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
}
