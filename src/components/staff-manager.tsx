'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, UserMinus, Users, UserCheck } from 'lucide-react'
import { Database } from '@/types/supabase'
import { updateUserRole } from '@/app/actions/staff'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function StaffManager() {
    const [staffMembers, setStaffMembers] = useState<Profile[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [createForm, setCreateForm] = useState({ username: '', password: '', name: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createStatus, setCreateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const [isLoading, setIsLoading] = useState(true)

    const loadStaffMembers = useCallback(async () => {
        setIsLoading(true)
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
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadStaffMembers()
    }, [loadStaffMembers])

    const handleCreateStaff = async () => {
        const username = createForm.username.trim()
        const password = createForm.password.trim()
        const name = createForm.name.trim()

        if (!username || !password) {
            setCreateStatus({ type: 'error', message: '아이디와 비밀번호를 입력해주세요.' })
            return
        }

        setIsSubmitting(true)
        setCreateStatus(null)
        try {
            const response = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, name: name || undefined }),
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || '계정 생성 중 오류가 발생했습니다.')
            }

            setCreateStatus({ type: 'success', message: '직원 계정이 생성되었습니다.' })
            setCreateForm({ username: '', password: '', name: '' })
            await loadStaffMembers()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '계정 생성 중 오류가 발생했습니다.'
            setCreateStatus({ type: 'error', message })
        } finally {
            setIsSubmitting(false)
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
                            <label className="block text-sm font-semibold text-gray-700 mb-2">아이디</label>
                            <input
                                type="text"
                                value={createForm.username}
                                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                placeholder="아이디 입력 (예: staff1)"
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

            {/* Staff Members Section */}
            <div>
                <div className="mb-4 pb-4 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">직원 목록</h2>
                    <p className="text-gray-500 text-sm mt-1">현재 등록된 직원 및 관리자 목록</p>
                </div>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        아이디
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        역할
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        가입일
                                    </th>
                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24 whitespace-nowrap">
                                        관리
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                                                <span className="text-sm text-gray-500">목록을 불러오는 중...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : staffMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                                <Users className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium">직원이 없습니다.</p>
                                        </div>
                                        </td>
                                    </tr>
                                ) : (
                                    staffMembers.map((staff) => (
                                        <tr key={staff.id} className="hover:bg-gray-50 transition-colors duration-150 group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="h-4 w-4 text-gray-400" />
                                                    {staff.username || staff.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                    staff.role === 'admin' 
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {staff.role === 'admin' ? '관리자' : '직원'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {staff.created_at ? new Date(staff.created_at).toLocaleDateString('ko-KR') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex justify-center sm:justify-end">
                                                    {staff.role !== 'admin' ? (
                                                        <button
                                                            onClick={() => handleProcessResignation(staff.id)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                                                        >
                                                            <UserMinus className="h-3.5 w-3.5" />
                                                            퇴사 처리
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
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

