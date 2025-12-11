'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import BeforeAfterUpload from './before-after-upload'
import MediaViewer from './media-viewer'

interface CompletionModalProps {
    applicationId: string
    storeName: string
    marketingType: string
    onClose: () => void
    onComplete: (beforeContent: string, beforeMediaFiles: File[], afterContent: string, afterMediaFiles: File[], onProgress?: (current: number, total: number) => void) => Promise<void>
}

export default function CompletionModal({
    applicationId,
    storeName,
    marketingType,
    onClose,
    onComplete
}: CompletionModalProps) {
    const [beforeContent, setBeforeContent] = useState('')
    const [beforeMediaFiles, setBeforeMediaFiles] = useState<File[]>([])
    const [beforeMediaPreviews, setBeforeMediaPreviews] = useState<string[]>([])
    const [afterContent, setAfterContent] = useState('')
    const [afterMediaFiles, setAfterMediaFiles] = useState<File[]>([])
    const [afterMediaPreviews, setAfterMediaPreviews] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [viewerOpen, setViewerOpen] = useState(false)
    const [viewerIndex, setViewerIndex] = useState(0)
    const [viewerUrls, setViewerUrls] = useState<string[]>([])
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percent: 0 })
    const progressBarRef = useRef<HTMLDivElement>(null)

    // Update progress bar width via ref to avoid inline style lint warning
    useEffect(() => {
        if (progressBarRef.current) {
            progressBarRef.current.style.width = `${uploadProgress.percent}%`
        }
    }, [uploadProgress.percent])

    const handleBeforeMediaAdd = (files: File[]) => {
        const newFiles = [...beforeMediaFiles, ...files]
        setBeforeMediaFiles(newFiles)
        const newPreviews = files.map(file => URL.createObjectURL(file))
        setBeforeMediaPreviews(prev => [...prev, ...newPreviews])
    }

    const handleBeforeMediaRemove = (url: string) => {
        const index = beforeMediaPreviews.indexOf(url)
        if (index > -1) {
            setBeforeMediaPreviews(prev => prev.filter((_, i) => i !== index))
            setBeforeMediaFiles(prev => prev.filter((_, i) => i !== index))
            URL.revokeObjectURL(url)
        }
    }

    const handleAfterMediaAdd = (files: File[]) => {
        const newFiles = [...afterMediaFiles, ...files]
        setAfterMediaFiles(newFiles)

        // Create preview URLs
        const newPreviews = files.map(file => URL.createObjectURL(file))
        setAfterMediaPreviews(prev => [...prev, ...newPreviews])
    }

    const handleAfterMediaRemove = (url: string) => {
        const index = afterMediaPreviews.indexOf(url)
        if (index > -1) {
            // Remove from previews
            setAfterMediaPreviews(prev => prev.filter((_, i) => i !== index))
            // Remove from files
            setAfterMediaFiles(prev => prev.filter((_, i) => i !== index))
            // Revoke object URL
            URL.revokeObjectURL(url)
        }
    }

    const handleSubmit = async () => {
        if (!afterContent.trim() && afterMediaFiles.length === 0) {
            alert('작업 후 내용 또는 미디어를 입력해주세요.')
            return
        }

        const confirmMessage = `${storeName} 신청서를 완료 처리하시겠습니까?\n완료 처리 시 고객에게 알림톡이 발송됩니다.`
        if (!window.confirm(confirmMessage)) {
            return
        }

        setSubmitting(true)
        setUploadProgress({ current: 0, total: beforeMediaFiles.length + afterMediaFiles.length, percent: 0 })
        try {
            await onComplete(beforeContent, beforeMediaFiles, afterContent, afterMediaFiles, (current, total) => {
                const percent = Math.round((current / total) * 100)
                setUploadProgress({ current, total, percent })
            })
            // Cleanup preview URLs
            beforeMediaPreviews.forEach(url => URL.revokeObjectURL(url))
            afterMediaPreviews.forEach(url => URL.revokeObjectURL(url))
            onClose()
        } catch (error) {
            console.error('Completion error:', error)
            alert('완료 처리 중 오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
                <div className="flex min-h-full items-center justify-center p-4 pointer-events-auto">
                    <div className="relative bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">완료 처리</h2>
                                <p className="text-sm text-gray-600 mt-1">{storeName}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-600 hover:text-gray-900 transition-colors"
                                disabled={submitting}
                                aria-label="닫기"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                            {/* BEFORE Section */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">
                                        작업 전 (BEFORE)
                                    </div>
                                </div>
                                <BeforeAfterUpload
                                    type="before"
                                    content={beforeContent}
                                    mediaUrls={beforeMediaPreviews}
                                    onContentChange={setBeforeContent}
                                    onMediaAdd={handleBeforeMediaAdd}
                                    onMediaRemove={handleBeforeMediaRemove}
                                    onMediaClick={(index) => {
                                        setViewerUrls(beforeMediaPreviews)
                                        setViewerIndex(index)
                                        setViewerOpen(true)
                                    }}
                                    uploading={submitting}
                                />
                            </div>

                            {/* AFTER Section */}
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">
                                        작업 후 (AFTER)
                                    </div>
                                </div>
                                <BeforeAfterUpload
                                    type="after"
                                    content={afterContent}
                                    mediaUrls={afterMediaPreviews}
                                    onContentChange={setAfterContent}
                                    onMediaAdd={handleAfterMediaAdd}
                                    onMediaRemove={handleAfterMediaRemove}
                                    onMediaClick={(index) => {
                                        setViewerUrls(afterMediaPreviews)
                                        setViewerIndex(index)
                                        setViewerOpen(true)
                                    }}
                                    uploading={submitting}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200">
                            {/* Progress Bar */}
                            {submitting && uploadProgress.total > 0 && (
                                <div className="px-6 pt-4 pb-2">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="font-medium text-gray-700">
                                            업로드 중... {uploadProgress.current}/{uploadProgress.total} 파일
                                        </span>
                                        <span className="font-semibold text-blue-600">
                                            {uploadProgress.percent}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            ref={progressBarRef}
                                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="px-6 py-4 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    완료 처리
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Viewer */}
            {viewerOpen && (
                <MediaViewer
                    mediaUrls={viewerUrls}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerOpen(false)}
                />
            )}
        </>
    )
}
