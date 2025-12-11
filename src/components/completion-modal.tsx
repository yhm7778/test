'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import BeforeAfterUpload from './before-after-upload'
import MediaViewer from './media-viewer'

interface CompletionModalProps {
    applicationId: string
    storeName: string
    marketingType: string
    onClose: () => void
    onComplete: (afterContent: string, afterMediaFiles: File[]) => Promise<void>
}

export default function CompletionModal({
    applicationId,
    storeName,
    marketingType,
    onClose,
    onComplete
}: CompletionModalProps) {
    const [afterContent, setAfterContent] = useState('')
    const [afterMediaFiles, setAfterMediaFiles] = useState<File[]>([])
    const [afterMediaPreviews, setAfterMediaPreviews] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [viewerOpen, setViewerOpen] = useState(false)
    const [viewerIndex, setViewerIndex] = useState(0)

    const handleMediaAdd = (files: File[]) => {
        const newFiles = [...afterMediaFiles, ...files]
        setAfterMediaFiles(newFiles)

        // Create preview URLs
        const newPreviews = files.map(file => URL.createObjectURL(file))
        setAfterMediaPreviews(prev => [...prev, ...newPreviews])
    }

    const handleMediaRemove = (url: string) => {
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
        try {
            await onComplete(afterContent, afterMediaFiles)
            // Cleanup preview URLs
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
            <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-blue-600 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">완료 처리</h2>
                                <p className="text-sm text-white/90 mt-1">{storeName}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:text-gray-200 transition-colors"
                                disabled={submitting}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            <BeforeAfterUpload
                                type="after"
                                content={afterContent}
                                mediaUrls={afterMediaPreviews}
                                onContentChange={setAfterContent}
                                onMediaAdd={handleMediaAdd}
                                onMediaRemove={handleMediaRemove}
                                onMediaClick={(index) => {
                                    setViewerIndex(index)
                                    setViewerOpen(true)
                                }}
                                uploading={submitting}
                            />
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
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

            {/* Media Viewer */}
            {viewerOpen && (
                <MediaViewer
                    mediaUrls={afterMediaPreviews}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerOpen(false)}
                />
            )}
        </>
    )
}
