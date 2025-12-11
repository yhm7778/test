import { useState, useEffect, useCallback } from 'react'
import { Database } from '@/types/supabase'
import { format, parseISO } from 'date-fns'
import { Loader2, Save, Search, User, RefreshCw, Plus, X, Settings } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

import { updateUserLimit, getClients, createClientAccount } from '@/app/actions/admin'

export default function UserManager() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [limitValues, setLimitValues] = useState<{ [key: string]: string }>({})
    const [warning, setWarning] = useState<string | null>(null)

    // Account Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newUserId, setNewUserId] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserName, setNewUserName] = useState('')
    const [newUserPhone, setNewUserPhone] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false)

    const fetchProfiles = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error, warning: warningMsg } = await getClients()

            if (error) throw new Error(error)

            if (warningMsg) {
                setWarning(warningMsg)
            } else {
                setWarning(null)
            }

            if (data) {
                const profilesData = data as unknown as Profile[]
                setProfiles(profilesData)
                const initialValues: { [key: string]: string } = {}
                profilesData.forEach(p => {
                    initialValues[p.id] = (p.max_requests ?? 10).toString()
                })
                setLimitValues(initialValues)
            }
        } catch (error) {
            console.error('Error fetching profiles:', error)
            alert('사용자 목록을 불러오는 중 오류가 발생했습니다.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchProfiles()
    }, [fetchProfiles])

    const handleLimitChange = (id: string, value: string) => {
        // Allow empty string or numbers
        if (value === '' || /^\d+$/.test(value)) {
            setLimitValues(prev => ({ ...prev, [id]: value }))
        }
    }

    const saveLimit = async (profile: Profile) => {
        const newValue = parseInt(limitValues[profile.id])
        if (isNaN(newValue)) {
            alert('유효한 숫자를 입력해주세요.')
            return
        }

        setUpdatingId(profile.id)
        try {
            const result = await updateUserLimit(profile.id, newValue)
            if (result.error) throw new Error(result.error)

            setProfiles(prev => prev.map(p =>
                p.id === profile.id ? { ...p, max_requests: newValue } : p
            ))
            alert('신청 한도가 수정되었습니다.')
        } catch (error) {
            console.error('Error updating limit:', error)
            alert('수정 중 오류가 발생했습니다.')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newUserId || !newUserPassword) {
            alert('아이디와 비밀번호를 입력해주세요.')
            return
        }
        if (!newUserPhone) {
            alert('전화번호를 입력해주세요.')
            return
        }

        setIsCreating(true)
        try {
            const result = await createClientAccount(newUserId, newUserPassword, newUserName, newUserPhone)
            if (result.error) throw new Error(result.error)

            alert('계정이 생성되었습니다.')
            setIsCreateModalOpen(false)
            setNewUserId('')
            setNewUserPassword('')
            setNewUserName('')
            setNewUserPhone('')
            fetchProfiles() // Refresh list
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            alert(`계정 생성 실패: ${message}`)
        } finally {
            setIsCreating(false)
        }
    }

    const filteredProfiles = profiles.filter(p =>
        (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-4">
            {warning && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                {warning}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="이메일 또는 이름 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-9 py-2 text-sm w-full"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAccountManagerOpen(true)}
                        className="btn-secondary py-2 px-3 text-sm flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                    >
                        <Settings className="h-4 w-4" />
                        블로그 계정 관리
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary py-2 px-3 text-sm flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        계정 생성
                    </button>
                    <button
                        onClick={fetchProfiles}
                        className="btn-secondary py-2 px-3 text-sm flex items-center gap-2"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        새로고침
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    사용자 정보
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    가입일
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    권한
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    월간 신청 한도 (기본 10회)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    관리
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        데이터를 불러오는 중...
                                    </td>
                                </tr>
                            ) : filteredProfiles.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {profile.username || '이름 없음'}
                                                    </div>
                                                    {!profile.email?.includes('@vision.local') && (
                                                        <div className="text-sm text-gray-500">
                                                            {profile.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(parseISO(profile.created_at), 'yyyy-MM-dd')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${profile.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    profile.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {profile.role === 'admin' ? '관리자' :
                                                    profile.role === 'staff' ? '직원' : '일반'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={limitValues[profile.id] || ''}
                                                    onChange={(e) => handleLimitChange(profile.id, e.target.value)}
                                                    className="input-field w-20 py-1 px-2 text-sm text-center"
                                                    placeholder="10"
                                                />
                                                <span className="text-sm text-gray-500">회</span>
                                                <button
                                                    onClick={() => saveLimit(profile)}
                                                    disabled={updatingId === profile.id || limitValues[profile.id] === String(profile.max_requests ?? 10)}
                                                    className={`ml-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1
                                                        ${limitValues[profile.id] !== String(profile.max_requests ?? 10)
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                >
                                                    {updatingId === profile.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Save className="h-3 w-3" />
                                                    )}
                                                    저장
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {/* 기존 관리 버튼 영역 */}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Account Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">클라이언트 계정 생성</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500"
                                aria-label="닫기"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">아이디 <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field w-full"
                                    value={newUserId}
                                    onChange={(e) => setNewUserId(e.target.value)}
                                    placeholder="아이디 입력"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 <span className="text-red-500">*</span></label>
                                <input
                                    type="password"
                                    required
                                    className="input-field w-full"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    placeholder="6자 이상 입력"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이름 (선택)</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    placeholder="사용자 이름"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">전화번호 <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    className="input-field w-full"
                                    value={newUserPhone}
                                    onChange={(e) => setNewUserPhone(e.target.value)}
                                    placeholder="010-1234-5678"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">알림톡 수신용 전화번호</p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="btn-secondary flex-1"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    계정 생성
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Blog Account Manager Modal (Placeholder) */}
            {isAccountManagerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">블로그 계정 관리</h3>
                            <button onClick={() => setIsAccountManagerOpen(false)} aria-label="닫기">
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4 text-center py-4">
                            <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Settings className="h-8 w-8 text-purple-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900">기능 준비중입니다</h4>
                            <p className="text-gray-500">
                                자동 포스팅을 위한 블로그 계정(Naver, Tistory 등)을<br />
                                등록하고 관리하는 기능이 곧 업데이트 될 예정입니다.
                            </p>
                            <div className="pt-4">
                                <button onClick={() => setIsAccountManagerOpen(false)} className="btn-primary w-full justify-center">
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
