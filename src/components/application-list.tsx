'use client'

import { useState, useMemo, useEffect } from 'react'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Download, Search, Trash2, X, Eye, CheckSquare, Square, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ApplicationForm from './application-form'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

interface ApplicationListProps {
    initialApplications: Application[]
    isAdmin?: boolean
}

export default function ApplicationList({ initialApplications, isAdmin = false }: ApplicationListProps) {
    const [applications, setApplications] = useState<Application[]>(initialApplications)
    const [searchTerm, setSearchTerm] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [viewingApp, setViewingApp] = useState<Application | null>(null)
    const [isDownloading, setIsDownloading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const supabase = createClient() as SupabaseClient<Database>
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Sync with server data when it changes
    useEffect(() => {
        setApplications(initialApplications)
    }, [initialApplications])

    const refreshData = async () => {
        setIsRefreshing(true)
        try {
            router.refresh()
            // Also manual fetch for immediate update
            const { data } = await supabase
                .from('applications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)

            if (data) {
                setApplications(data as Application[])
            }
        } catch (error) {
            console.error('Refresh error:', error)
        } finally {
            setIsRefreshing(false)
        }
    }

    // Filtering logic
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            // Hide hidden applications for non-admins
            if (!isAdmin && app.is_hidden) return false

            // Search term filter
            const matchesSearch =
                app.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
                app.user_id?.toLowerCase().includes(searchTerm.toLowerCase())

            // Date range filter
            let matchesDate = true
            if (startDate || endDate) {
                const appDate = parseISO(app.created_at)
                const start = startDate ? startOfDay(parseISO(startDate)) : new Date(0)
                const end = endDate ? endOfDay(parseISO(endDate)) : new Date(8640000000000000)

                matchesDate = isWithinInterval(appDate, { start, end })
            }

            return matchesSearch && matchesDate
        })
    }, [applications, searchTerm, startDate, endDate, isAdmin])

    // Score Calculation
    const getScore = (type: string | null) => {
        switch (type) {
            case 'blog_reporter': return 3
            case 'blog_experience': return 5
            case 'instagram_popular': return 5
            default: return 0
        }
    }

    const totalScore = useMemo(() => {
        const scores = filteredApplications.map(app => getScore(app.marketing_type))
        if (scores.length === 0) return 0
        const sum = scores.reduce((a: number, b: number) => a + b, 0)
        return (sum / scores.length).toFixed(1)
    }, [filteredApplications])

    // Status Toggle
    const handleStatusToggle = async (app: Application) => {
        const newStatus = app.status === 'completed' ? 'pending' : 'completed'
        const updates: ApplicationUpdate = { status: newStatus }

        if (newStatus === 'completed') {
            updates.completion_date = new Date().toISOString()
        } else {
            updates.completion_date = null
        }

        const { data, error } = await supabase
            .from('applications')
            .update(updates)
            .eq('id', app.id)
            .select()

        if (error) {
            console.error('Status update error:', error)
            alert(`상태 변경 중 오류가 발생했습니다: ${error.message}`)
            return
        }

        if (!data || data.length === 0) {
            console.error('No rows updated. Possible RLS issue or missing ID.')
            alert('상태 변경에 실패했습니다. (권한 부족 또는 데이터 없음)')
            return
        }

        if (newStatus === 'completed') {
            // Kakao Notification Stub
            console.log(`[Kakao Notification] Sending completion notification to user ${app.user_id} for application ${app.id}`)
            alert('상태가 완료로 변경되었습니다. (카카오톡 알림 발송 - Stub)')
        }

        setApplications(prev => prev.map(p =>
            p.id === app.id ? { ...p, ...updates } : p
        ))

        // Refresh server data
        refreshData()
    }

    // Bulk Status Update
    const handleBulkStatusUpdate = async (status: 'completed' | 'pending') => {
        if (selectedIds.length === 0) return

        // Filter out items that already have the target status
        const targetIds = selectedIds.filter(id => {
            const app = applications.find(a => a.id === id)
            return app && app.status !== status
        })

        const statusText = status === 'completed' ? '완료' : '미완료'

        if (targetIds.length === 0) {
            alert(`선택한 모든 항목이 이미 '${statusText}' 상태입니다.`)
            return
        }

        if (!confirm(`${targetIds.length}개의 신청서를 ${statusText} 상태로 변경하시겠습니까?`)) return

        try {
            const updates: ApplicationUpdate = { status }
            if (status === 'completed') {
                updates.completion_date = new Date().toISOString()
            } else {
                updates.completion_date = null
            }

            const { data, error } = await supabase
                .from('applications')
                .update(updates)
                .in('id', targetIds)
                .select()

            if (error) throw error

            if (!data || data.length === 0) {
                throw new Error('No rows updated. Possible RLS issue.')
            }

            if (status === 'completed') {
                // Kakao Notification Stub for Bulk
                console.log(`[Kakao Notification] Sending completion notifications to ${targetIds.length} users`)
                alert(`${targetIds.length}개의 신청서가 완료 처리되었습니다. (카카오톡 알림 발송 - Stub)`)
            } else {
                alert(`${targetIds.length}개의 신청서가 미완료 처리되었습니다.`)
            }

            setApplications(prev => prev.map(app =>
                targetIds.includes(app.id) ? { ...app, ...updates } : app
            ))
            setSelectedIds([]) // Optional: Clear selection after action

            // Refresh server data with a small delay to ensure DB propagation
            refreshData()
        } catch (error) {
            console.error('Bulk status update error:', error)
            alert('상태 변경 중 오류가 발생했습니다.')
        }
    }

    // Selection handlers
    const handleSelectAll = () => {
        if (selectedIds.length === filteredApplications.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredApplications.map(app => app.id))
        }
    }

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(prevId => prevId !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    // Hide handler (Client side delete) - Removed as per request
    // const handleHide = async (id: string) => { ... }


    // Delete handlers
    const handleDelete = async (ids: string[]) => {
        if (!confirm(`${ids.length}개의 신청서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return

        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('applications')
                .delete()
                .in('id', ids)

            if (error) throw error

            setApplications(prev => prev.filter(app => !ids.includes(app.id)))
            setSelectedIds(prev => prev.filter(id => !ids.includes(id)))
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Delete error:', error)
            alert('삭제 중 오류가 발생했습니다.')
        } finally {
            setIsDeleting(false)
        }
    }

    // Cost Calculation
    // const [unitPrice] = useState(10000) // Default unit price

    // ZIP Download logic (Server-side)
    const handleDownloadZip = async () => {
        const targetIds = selectedIds.length > 0 ? selectedIds : filteredApplications.map(app => app.id)

        if (targetIds.length === 0) {
            alert('다운로드할 항목이 없습니다.')
            return
        }

        if (!confirm(`${targetIds.length}개의 신청서를 다운로드하시겠습니까? (선택하지 않은 경우 현재 목록 전체가 다운로드됩니다)`)) return

        setIsDownloading(true)
        try {
            const response = await fetch('/api/zip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: targetIds }),
            })

            if (!response.ok) {
                throw new Error('Download failed')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `applications_${format(new Date(), 'yyyyMMdd_HHmm')}.zip`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

        } catch (error) {
            console.error('ZIP generation error:', error)
            alert('다운로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setIsDownloading(false)
        }
    }

    // Inline edit handlers (Legacy) - Removed unused code

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end">
                    {/* Filters */}
                    <div className="flex flex-col lg:flex-row gap-4 w-full xl:w-auto">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">기간 검색</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input-field py-1.5 text-sm w-full sm:w-36"
                                    aria-label="시작 날짜"
                                />
                                <span className="text-gray-400">~</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input-field py-1.5 text-sm w-full sm:w-36"
                                    aria-label="종료 날짜"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 w-full lg:w-auto">
                            <label className="text-xs font-medium text-gray-500">검색어</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="상호명, 키워드, ID 검색"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-field pl-9 py-1.5 text-sm w-full sm:w-80"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleBulkStatusUpdate('completed')}
                                    disabled={selectedIds.length === 0}
                                    className="btn-primary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700 border-green-600 text-white whitespace-nowrap"
                                >
                                    <CheckSquare className="h-4 w-4" />
                                    선택 완료
                                </button>
                                <button
                                    onClick={() => handleBulkStatusUpdate('pending')}
                                    disabled={selectedIds.length === 0}
                                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50 bg-yellow-600 hover:bg-yellow-700 border-yellow-600 text-white whitespace-nowrap"
                                >
                                    <X className="h-4 w-4" />
                                    선택 미완료
                                </button>
                            </div>

                            <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1"></div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={refreshData}
                                    disabled={isRefreshing}
                                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                    title="데이터 새로고침"
                                >
                                    <Loader2 className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {isRefreshing ? '갱신 중...' : '새로고침'}
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedIds)}
                                    disabled={selectedIds.length === 0 || isDeleting}
                                    className="btn-danger py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50 bg-red-600 hover:bg-red-700 text-white whitespace-nowrap rounded-md"
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    선택 삭제
                                </button>
                            </div>

                            <button
                                onClick={handleDownloadZip}
                                disabled={!filteredApplications.length || isDownloading}
                                className="btn-primary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white whitespace-nowrap w-full sm:w-auto justify-center"
                            >
                                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                {selectedIds.length > 0 ? `${selectedIds.length}개 다운로드` : '전체 다운로드'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                    <div>
                        총 <span className="font-bold text-blue-600">{filteredApplications.length}</span>개의 신청서
                        {selectedIds.length > 0 && ` (${selectedIds.length}개 선택됨)`}
                    </div>
                    <div>
                        평균 점수: <span className="font-bold text-gray-900">{totalScore}점</span>
                    </div>
                </div>
            </div>

            {/* Application List Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {isAdmin && (
                                    <th scope="col" className="px-6 py-3 text-left">
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            {selectedIds.length > 0 && selectedIds.length === filteredApplications.length ? (
                                                <CheckSquare className="h-5 w-5 text-blue-600" />
                                            ) : (
                                                <Square className="h-5 w-5" />
                                            )}
                                        </button>
                                    </th>
                                )}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    신청일시
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    상호명
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    키워드
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    점수
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    상태
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    관리
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-10 text-center text-gray-500">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredApplications.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                                        {isAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => toggleSelect(app.id)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {selectedIds.includes(app.id) ? (
                                                        <CheckSquare className="h-5 w-5 text-blue-600" />
                                                    ) : (
                                                        <Square className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" suppressHydrationWarning>
                                            {format(parseISO(app.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setViewingApp(app)}
                                                className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                            >
                                                {app.store_name}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {app.keywords?.join(', ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="font-semibold text-gray-900">{getScore(app.marketing_type)}점</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {isAdmin ? (
                                                <button
                                                    onClick={() => handleStatusToggle(app)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${app.status === 'completed'
                                                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        }`}
                                                >
                                                    {app.status === 'completed' ? '완료' : '미완료'}
                                                </button>
                                            ) : (
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {app.status === 'completed' ? '완료' : '미완료'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setViewingApp(app)}
                                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                    title="상세보기"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete([app.id])}
                                                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
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

            {/* Application Detail Modal */}
            {viewingApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">신청서 상세 정보</h2>
                            <button
                                onClick={() => setViewingApp(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="닫기"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <ApplicationForm
                                type={viewingApp.marketing_type?.replace(/_/g, '-')}
                                initialData={viewingApp}
                                readOnly={true}
                            />

                            {isAdmin && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        🤖 블로그 자동 포스팅
                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-normal">Beta</span>
                                    </h3>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">포스팅 계정 선택</label>
                                            <select disabled className="input-field w-full bg-gray-100 text-gray-400 cursor-not-allowed" aria-label="포스팅 계정 선택">
                                                <option>연동된 계정이 없습니다 (기능 준비중)</option>
                                            </select>
                                        </div>
                                        <button disabled className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-gray-500">
                                            <span className="hidden">Loading...</span> {/* Hidden loader placeholder */}
                                            자동 포스팅 시작 (준비중)
                                        </button>
                                        <p className="text-xs text-gray-500 text-center">
                                            * 추후 양식과 사진을 기반으로 블로그 글을 자동 생성하고 발행합니다. (다계정 지원 예정)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}