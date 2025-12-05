import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminTabs from '@/components/admin-tabs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: 'admin' | 'staff' | 'client' } | null }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        redirect('/')
    }

    const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

    const isAdmin = profile.role === 'admin'

    return (
        <div className="py-6 sm:py-8 animate-slide-up">
            {/* 헤더 섹션 */}
            <div className="mb-6 sm:mb-8">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                    <div className="w-1 h-10 sm:h-12 bg-gradient-to-b from-gray-900 to-gray-700 rounded-full"></div>
                    <div className="flex-1 min-w-[200px]">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                            관리자 대시보드
                        </h1>
                        <p className="text-gray-500 text-base sm:text-lg">신청 내역 관리 및 시스템 설정</p>
                    </div>
                </div>
            </div>
            
            {/* 탭 컨텐츠 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <AdminTabs 
                    initialApplications={applications || []} 
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    )
}
