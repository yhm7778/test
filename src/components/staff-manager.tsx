'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Check, X, Mail, UserPlus, UserCheck, Users, UserMinus } from 'lucide-react'
import { Database } from '@/types/supabase'
import { updateUserRole } from '@/app/actions/staff'

type Profile = Database['public']['Tables']['profiles']['Row']
type StaffRequest = {
    id: string
    email: string
    name?: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
}

export default function StaffManager() {
    const [staffRequests, setStaffRequests] = useState<StaffRequest[]>([])
    const [staffMembers, setStaffMembers] = useState<Profile[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [createForm, setCreateForm] = useState({ email: '', password: '', name: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createStatus, setCreateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const supabase = createClient()

    const loadStaffRequests = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('staff_requests')
                .select('*')
                .order('created_at', { ascending: false })

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading staff requests:', error)
            } else {
                setStaffRequests((data ?? []) as StaffRequest[])
            }
        } catch (error) {
            console.error('Error loading staff requests:', error)
        }
    }, [supabase])

    const loadStaffMembers = useCallback(async () => {
        try {
            const response = await fetch('/api/staff/members', { cache: 'no-store' })
            const result = await response.json()

            if (!response.ok) {
                console.error('Error loading staff members:', result.error)
                return
            }

            setStaffMembers(result.data || [])
        } catch (error) {
            console.error('Error loading staff members:', error)
        }
    }, [])

    useEffect(() => {
        loadStaffRequests()
        loadStaffMembers()
    }, [loadStaffRequests, loadStaffMembers])

    const handleCreateStaff = async () => {
        const email = createForm.email.trim().toLowerCase()
        const password = createForm.password.trim()
        const name = createForm.name.trim()

        if (!email || !password) {
            setCreateStatus({ type: 'error', message: '이메일과 비밀번호를 입력해주세요.' })
            return
        }

        setIsSubmitting(true)
        setCreateStatus(null)
        try {
            const response = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: name || undefined }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || '계정 생성 중 오류가 발생했습니다.')
            }

            setCreateStatus({ type: 'success', message: '직원 계정이 생성되었습니다.' })
            setCreateForm({ email: '', password: '', name: '' })
            await loadStaffMembers()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '계정 생성 중 오류가 발생했습니다.'
            setCreateStatus({ type: 'error', message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleApproveRequest = async (requestId: string, email: string) => {
        try {
            // Update request status
            const { error: updateError } = await supabase
                .from('staff_requests')
                .update({ status: 'approved' })
                .eq('id', requestId)

            if (updateError && updateError.code !== '42P01') throw updateError

            // Find user by email and update role
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single()

            if (profileData) {
                const result = await updateUserRole(profileData.id, 'staff')
                if (result.error) {
                    alert('역할 업데이트 중 오류: ' + result.error)
                    return
                }
            } else {
                alert('해당 이메일의 사용자를 찾을 수 없습니다.')
                return
            }

            alert('직원 신청이 승인되었습니다.')
            await loadStaffRequests()
            await loadStaffMembers()
        } catch (error: unknown) {
            console.error('Error approving request:', error)
            if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '42P01') {
                alert('staff_requests 테이블이 존재하지 않습니다. 데이터베이스에 테이블을 생성해주세요.')
            } else {
                const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
                alert('승인 중 오류가 발생했습니다: ' + message)
            }
        }
    }

    const handleRejectRequest = async (requestId: string) => {
        if (!confirm('정말 거절하시겠습니까?')) return

        try {
            const { error } = await supabase
                .from('staff_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId)

            if (error) throw error

            alert('직원 신청이 거절되었습니다.')
            await loadStaffRequests()
        } catch (error: unknown) {
            console.error('Error rejecting request:', error)
            alert('거절 중 오류가 발생했습니다.')
        }
    }

    const handleProcessResignation = async (userId: string) => {
        if (!confirm('퇴사 처리 시 해당 직원의 관리자/직원 권한이 제거됩니다. 진행하시겠습니까?')) return

        try {
            const result = await updateUserRole(userId, 'client')
            if (result.error) {
                alert('퇴사 처리 중 오류: ' + result.error)
                return
            }

            alert('퇴사 처리가 완료되었습니다. (권한이 제거되었습니다)')
            await loadStaffMembers()
        } catch (error: unknown) {
            console.error('Error processing resignation:', error)
            const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
            alert('퇴사 처리 중 오류가 발생했습니다: ' + message)
        }
    }

    return (
        <div className="space-y-6">
            {/* Create Staff Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 gap-3 flex-wrap">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">직원 계정 생성</h2>
                        <p className="text-gray-500 text-sm mt-1">새로운 직원 계정을 직접 생성합니다</p>
                    </div>
                    <button
                        onClick={() => {
                            setCreateStatus(null)
                            setIsCreating(!isCreating)
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transform hover:-translate-y-0.5 whitespace-nowrap"
                    >
                        <UserPlus className="h-4 w-4" />
                        {isCreating ? '취소' : '직원 생성'}
                    </button>
                </div>

                {isCreating && (
                    <div className="mt-6 space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
                            <input
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                placeholder="staff@example.com"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
                            <input
                                type="password"
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                placeholder="비밀번호 입력"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">이름 (선택사항)</label>
                            <input
                                type="text"
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                placeholder="이름"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-400"
                            />
                        </div>
                        {createStatus && (
                            <div
                                className={`text-sm font-semibold rounded-xl px-4 py-3 ${
                                    createStatus.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-100'
                                        : 'bg-red-50 text-red-600 border border-red-100'
                                }`}
                                role="status"
                                aria-live="polite"
                            >
                                {createStatus.message}
                            </div>
                        )}
                        <button
                            onClick={handleCreateStaff}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-sm font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {isSubmitting ? '생성 중...' : '계정 생성'}
                        </button>
                    </div>
                )}
            </div>

            {/* Staff Requests Section */}
            <div>
                <div className="mb-4 pb-4 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">직원 신청 관리</h2>
                    <p className="text-gray-500 text-sm mt-1">대기 중인 직원 신청을 승인하거나 거절합니다</p>
                </div>
                <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/60">
                    {staffRequests.filter(req => req.status === 'pending').length === 0 ? (
                        <div className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                                                <Mail className="h-8 w-8 text-slate-500" />
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium">대기 중인 직원 신청이 없습니다.</p>
                                        </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-800/40">
                                <thead className="bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-slate-800/95 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            이메일
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            신청일
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            상태
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            관리
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-950/30 divide-y divide-slate-800/40">
                                    {staffRequests
                                        .filter(req => req.status === 'pending')
                                        .map((request) => (
                                            <tr key={request.id} className="hover:bg-slate-800/50 transition-all duration-200 group border-b border-slate-800/30">
                                                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-50 group-hover:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-slate-400" />
                                                        {request.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                                    {new Date(request.created_at).toLocaleDateString('ko-KR')}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/40 backdrop-blur-sm shadow-sm">
                                                        대기중
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveRequest(request.id, request.email)}
                                                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                                            title="승인"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRequest(request.id)}
                                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                            title="거절"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Staff Members Section */}
            <div>
                <div className="mb-4 pb-4 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">직원 목록</h2>
                    <p className="text-gray-500 text-sm mt-1">현재 등록된 직원 및 관리자 목록</p>
                </div>
                <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/60">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800/40">
                            <thead className="bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-slate-800/95 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                        이메일
                                    </th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                                        역할
                                    </th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider whitespace-nowrap">
                                        가입일
                                    </th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-200 uppercase tracking-wider text-center w-24 whitespace-nowrap">
                                        관리
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-950/30 divide-y divide-slate-800/40">
                                {staffMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                                                <Users className="h-8 w-8 text-slate-500" />
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium">직원이 없습니다.</p>
                                        </div>
                                        </td>
                                    </tr>
                                ) : (
                                    staffMembers.map((staff) => (
                                        <tr key={staff.id} className="hover:bg-slate-800/50 transition-all duration-200 group border-b border-slate-800/30">
                                            <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-50 group-hover:text-white">
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="h-4 w-4 text-slate-400" />
                                                    {staff.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-sm shadow-sm ${
                                                    staff.role === 'admin' 
                                                        ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40'
                                                        : 'bg-blue-500/25 text-blue-200 border border-blue-400/40'
                                                }`}>
                                                    {staff.role === 'admin' ? '관리자' : '직원'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                                {staff.created_at ? new Date(staff.created_at).toLocaleDateString('ko-KR') : '-'}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                <div className="flex justify-center sm:justify-end">
                                                    {staff.role !== 'admin' ? (
                                                        <button
                                                            onClick={() => handleProcessResignation(staff.id)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-red-100 bg-red-500/20 border border-red-400/40 hover:bg-red-500/30 transition-colors"
                                                        >
                                                            <UserMinus className="h-3.5 w-3.5" />
                                                            퇴사 처리
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

