import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationList from '@/components/application-list'
import WithdrawalModal from '@/components/withdrawal-modal'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

type ApplicationRow = Database['public']['Tables']['applications']['Row']

export default async function MyPage() {
    const supabase = await createClient() as SupabaseClient<Database>

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin'

    const applicationsResponse = await supabase
        .from('applications')
        .select('*')
        .eq<'user_id'>('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    const applications = (applicationsResponse.data ?? []) as ApplicationRow[]

    return (
        <div className="py-8 animate-slide-up">
            {/* 헤더 섹션 */}
            <div className="mb-8 flex justify-between items-end">
                <div className="inline-flex items-center gap-3">
                    <div className="w-1 h-12 bg-gradient-to-b from-gray-900 to-gray-700 rounded-full"></div>
                    <div>
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                            내 신청 내역
                        </h1>
                        <p className="text-gray-500 text-lg">신청하신 내역을 확인하실 수 있습니다</p>
                    </div>
                </div>
                <div className="pb-2">
                    {!isAdmin && <WithdrawalModal email={user.email || ''} />}
                </div>
            </div>

            {/* 컨텐츠 영역 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <ApplicationList initialApplications={applications} isAdmin={false} />
            </div>
        </div>
    )
}
