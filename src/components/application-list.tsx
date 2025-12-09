'use client'

import { useState, useMemo } from 'react'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Download, Search, Trash2, X, Eye, CheckSquare, Square, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import JSZip from 'jszip'
import ApplicationForm from './application-form'
import { sanitizeFilename } from '@/lib/security'

type Application = Database['public']['Tables']['applications']['Row']
// type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

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

    // Filtering logic
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
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
    }, [applications, searchTerm, startDate, endDate])

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
        
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus })
            .eq('id', app.id)

        if (error) {
            console.error('Status update error:', error)
            alert('상태 변경 중 오류가 발생했습니다.')
            return
        }

        if (newStatus === 'completed') {
            // Kakao Notification Stub
            console.log(`[Kakao Notification] Sending completion notification to user ${app.user_id} for application ${app.id}`)
            alert('상태가 완료로 변경되었습니다. (카카오톡 알림 발송 - Stub)')
        }

        setApplications(prev => prev.map(p => 
            p.id === app.id ? { ...p, status: newStatus } : p
        ))
    }

    // Bulk Status Update
    const handleBulkStatusUpdate = async (status: 'completed' | 'pending') => {
        if (selectedIds.length === 0) return
        
        const statusText = status === 'completed' ? '완료' : '미완료'
        if (!confirm(`${selectedIds.length}개의 신청서를 ${statusText} 상태로 변경하시겠습니까?`)) return

        try {
            const { error } = await supabase
                .from('applications')
                .update({ status })
                .in('id', selectedIds)

            if (error) throw error

            if (status === 'completed') {
                // Kakao Notification Stub for Bulk
                console.log(`[Kakao Notification] Sending completion notifications to ${selectedIds.length} users`)
                alert(`${selectedIds.length}개의 신청서가 완료 처리되었습니다. (카카오톡 알림 발송 - Stub)`)
            } else {
                alert(`${selectedIds.length}개의 신청서가 미완료 처리되었습니다.`)
            }

            setApplications(prev => prev.map(app => 
                selectedIds.includes(app.id) ? { ...app, status } : app
            ))
            setSelectedIds([]) // Optional: Clear selection after action
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

    // ZIP Download logic (Client-side)
    const handleDownloadZip = async () => {
        const targetIds = selectedIds.length > 0 ? selectedIds : filteredApplications.map(app => app.id)
        
        if (targetIds.length === 0) {
            alert('다운로드할 항목이 없습니다.')
            return
        }

        if (!confirm(`${targetIds.length}개의 신청서를 다운로드하시겠습니까? (선택하지 않은 경우 현재 목록 전체가 다운로드됩니다)`)) return

        setIsDownloading(true)
        try {
            const zip = new JSZip()
            const targetApps = applications.filter(app => targetIds.includes(app.id))

            for (const app of targetApps) {
                // Create folder for each store
                // Format: StoreName_Date
                const dateStr = format(parseISO(app.created_at), 'yyyyMMdd')
                const folderName = sanitizeFilename(`${app.store_name}_${dateStr}`)
                const folder = zip.folder(folderName)

                if (!folder) continue

                // Add info text file
                const infoContent = `
[신청서 정보]
상호명: ${app.store_name}
신청일: ${format(parseISO(app.created_at), 'yyyy-MM-dd HH:mm:ss')}
신청자ID: ${app.user_id || '정보없음'}

[키워드]
대표키워드: ${app.keywords?.join(', ')}
본문강조키워드: ${app.tags?.join(', ')}

[내용]
업체 장점 및 어필점:
${app.advantages}

[비고]
${app.notes}
`.trim()
                folder.file('info.txt', infoContent)

                // Parse blog count for photo distribution
                const blogCountMatch = app.notes?.match(/블로그 리뷰 갯수:\s*(\d+)개/)
                const blogCount = blogCountMatch ? parseInt(blogCountMatch[1], 10) : 1
                
                // Download and distribute photos
                if (app.photo_urls && app.photo_urls.length > 0) {
                    const photos = app.photo_urls
                    
                    // Parallel download
                    await Promise.all(photos.map(async (url, index) => {
                        try {
                            const response = await fetch(url)
                            const blob = await response.blob()
                            const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
                            
                            // Distribute photos into N subfolders using Round-Robin
                            // This ensures more even distribution and prevents empty folders
                            // index 0 -> folder 1
                            // index 1 -> folder 2
                            // ...
                            // index 4 -> folder 5
                            // index 5 -> folder 1
                            const subFolderIndex = (index % blogCount) + 1

                            const subFolder = folder.folder(`${subFolderIndex}번_블로그`)
                            subFolder?.file(`${index + 1}.${ext}`, blob)
                        } catch (err) {
                            console.error(`Failed to download photo for ${app.store_name}:`, err)
                            folder.file(`error_photo_${index + 1}.txt`, 'Download failed')
                        }
                    }))
                }
            }

            // Generate ZIP
            const content = await zip.generateAsync({ type: 'blob' })
            
            // Trigger download
            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)
            link.download = `applications_${format(new Date(), 'yyyyMMdd_HHmm')}.zip`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(link.href)

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
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">기간 검색</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input-field py-1.5 text-sm w-36"
                                />
                                <span className="text-gray-400">~</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input-field py-1.5 text-sm w-36"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 flex-1">
                            <label className="text-xs font-medium text-gray-500">검색어</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="상호명, 키워드, ID 검색"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-field pl-9 py-1.5 text-sm w-full sm:w-64"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                        <button
                            onClick={() => handleBulkStatusUpdate('completed')}
                            disabled={selectedIds.length === 0}
                            className="btn-primary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700 border-green-600 text-white"
                        >
                            <CheckSquare className="h-4 w-4" />
                            선택 완료
                        </button>
                        <button
                            onClick={() => handleBulkStatusUpdate('pending')}
                            disabled={selectedIds.length === 0}
                            className="btn-secondary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                            선택 미완료
                        </button>
                        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>
                        <button
                            onClick={() => handleDelete(selectedIds)}
                            disabled={selectedIds.length === 0 || isDeleting}
                            className="btn-danger py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            선택 삭제
                        </button>
                        <button
                            onClick={handleDownloadZip}
                            disabled={!filteredApplications.length || isDownloading}
                            className="btn-primary py-2 px-3 text-sm flex items-center gap-2 disabled:opacity-50"
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                        app.status === 'completed'
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                    }`}
                                                >
                                                    {app.status === 'completed' ? '완료' : '미완료'}
                                                </button>
                                            ) : (
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    app.status === 'completed'
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
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <ApplicationForm initialData={viewingApp} readOnly={true} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}