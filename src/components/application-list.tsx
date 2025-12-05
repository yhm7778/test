'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Download, Search, ExternalLink, Edit2, Save, X, FileText } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Application = Database['public']['Tables']['applications']['Row']
type ApplicationUpdate = Database['public']['Tables']['applications']['Update']

interface ApplicationListProps {
    initialApplications: Application[]
    isAdmin?: boolean
}

export default function ApplicationList({ initialApplications, isAdmin = false }: ApplicationListProps) {
    const [applications, setApplications] = useState<Application[]>(initialApplications)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<ApplicationUpdate>({})
    const supabase = createClient() as SupabaseClient<Database>

    const filteredApplications = applications.filter(app =>
        app.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    const hasApplications = filteredApplications.length > 0

    const handleDownloadZip = async () => {
        try {
            const response = await fetch('/api/zip')
            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `applications_${new Date().toISOString().split('T')[0]}.zip`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download error:', error)
            alert('ZIP 다운로드 중 오류가 발생했습니다.')
        }
    }

    const startEdit = (app: Application) => {
        setEditingId(app.id)
        setEditForm(app)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditForm({})
    }

    const saveEdit = async () => {
        if (!editingId) return

        try {
            const updates = {
                store_name: editForm.store_name,
                keywords: editForm.keywords,
                advantages: editForm.advantages,
                tags: editForm.tags,
            } satisfies ApplicationUpdate

            const { error } = await supabase
                .from('applications')
                .update(updates as ApplicationUpdate)
                .eq('id', editingId)

            if (error) throw error

            // Update local state
            setApplications(apps =>
                apps.map(app =>
                    app.id === editingId ? { ...app, ...editForm } : app
                )
            )

            setEditingId(null)
            setEditForm({})
            alert('수정이 완료되었습니다.')
        } catch (error) {
            console.error('Update error:', error)
            alert('수정 중 오류가 발생했습니다.')
        }
    }

    return (
        <div className="space-y-6">
            {/* 검색 및 액션 영역 */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                            총 <span className="font-bold text-gray-900 text-base">{filteredApplications.length}</span>개
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="상호명 또는 키워드 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all shadow-sm hover:border-gray-300"
                        />
                    </div>
                    {isAdmin && (
                        <button
                            onClick={handleDownloadZip}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 whitespace-nowrap transform hover:-translate-y-0.5"
                        >
                            <Download className="h-4 w-4" />
                            ZIP 다운로드
                        </button>
                    )}
                </div>
            </div>

            {/* 테이블/카드 영역 - 블랙 카드 */}
            <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-800/60">
                {!hasApplications ? (
                    <div className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                                <FileText className="h-8 w-8 text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm font-medium">신청 내역이 없습니다.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-slate-800/95 backdrop-blur-sm">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            신청일시
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            상호명
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            키워드
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            사진
                                        </th>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                            상세
                                        </th>
                                        {isAdmin && (
                                            <th className="px-6 py-5 text-left text-xs font-bold text-slate-200 uppercase tracking-wider">
                                                관리
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-950/30 divide-y divide-slate-800/40">
                                    {filteredApplications.map((app) => (
                                        <tr key={app.id} className="hover:bg-slate-800/50 transition-all duration-200 group border-b border-slate-800/30">
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                                {format(new Date(app.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-50 group-hover:text-white">
                                                {editingId === app.id ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.store_name || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })}
                                                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        aria-label="상호명 수정"
                                                    />
                                                ) : (
                                                    app.store_name
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-slate-300 group-hover:text-slate-100">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {app.keywords?.map((k, i) => (
                                                        <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/25 text-blue-200 border border-blue-400/40 backdrop-blur-sm shadow-sm">
                                                            {k}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                                <span className="px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50 backdrop-blur-sm">
                                                    {app.photo_urls?.length || 0}장
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-300 group-hover:text-slate-100">
                                                {app.place_url && (
                                                    <a href={app.place_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/25 hover:bg-blue-500/35 text-blue-200 hover:text-blue-100 rounded-lg border border-blue-400/40 transition-all backdrop-blur-sm shadow-sm">
                                                        플레이스 <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                                    {editingId === app.id ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={saveEdit}
                                                                className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                                                title="저장"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="p-2 text-slate-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                                                title="취소"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEdit(app)}
                                                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                                            title="수정"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden p-4 space-y-4">
                            {filteredApplications.map((app) => (
                                <div key={app.id} className="rounded-2xl border border-slate-800/40 bg-slate-950/40 backdrop-blur-sm p-4 shadow-xl shadow-black/30">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">신청일시</p>
                                            <p className="text-sm text-slate-100">
                                                {format(new Date(app.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                            </p>
                                        </div>
                                        <span className="px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50 text-xs font-semibold text-slate-200">
                                            {app.photo_urls?.length || 0}장
                                        </span>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">상호명</p>
                                            {editingId === app.id ? (
                                                <input
                                                    type="text"
                                                    value={editForm.store_name || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    aria-label="상호명 수정"
                                                />
                                            ) : (
                                                <p className="text-base font-semibold text-white">{app.store_name}</p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">키워드</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {app.keywords?.map((k, i) => (
                                                    <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/25 text-blue-200 border border-blue-400/40">
                                                        {k}
                                                    </span>
                                                )) || <span className="text-xs text-slate-500">-</span>}
                                            </div>
                                        </div>

                                        {app.place_url && (
                                            <a
                                                href={app.place_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 rounded-lg border border-blue-400/30 text-sm font-semibold transition-colors"
                                            >
                                                플레이스 바로가기 <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>

                                    {isAdmin && (
                                        <div className="mt-4 flex justify-end gap-2">
                                            {editingId === app.id ? (
                                                <>
                                                    <button
                                                        onClick={saveEdit}
                                                        className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-emerald-300 border border-emerald-400/40 rounded-lg hover:bg-emerald-500/20"
                                                    >
                                                        <Save className="h-3.5 w-3.5" /> 저장
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-800/50"
                                                    >
                                                        <X className="h-3.5 w-3.5" /> 취소
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => startEdit(app)}
                                                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-blue-200 border border-blue-400/40 rounded-lg hover:bg-blue-500/20"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" /> 수정
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
