'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface BeforeAfterUploadProps {
    type: 'before' | 'after'
    content: string
    mediaUrls: string[]
    onContentChange: (content: string) => void
    onMediaAdd: (files: File[]) => void
    onMediaRemove: (url: string) => void
    onMediaClick?: (index: number) => void
    readOnly?: boolean
    uploading?: boolean
    mediaFiles?: File[]
}

// Helper function to check if URL is a video
const isVideo = (url: string) => url.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)(\?|$)/i)

// Video thumbnail component with canvas-based preview
function VideoThumbnail({ url, onClick }: { url: string; onClick: () => void }) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentUrl, setCurrentUrl] = useState(url)
    const [isRetrying, setIsRetrying] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const supabase = createClient()

    useEffect(() => {
        setCurrentUrl(url)
        setIsRetrying(false)
    }, [url])

    useEffect(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        const generateThumbnail = () => {
            try {
                if (video.readyState >= 2 && video.videoWidth > 0) {
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
                        setThumbnailUrl(dataUrl)
                        setIsLoading(false)
                        return
                    }
                }
            } catch (error) {
                console.error('Failed to generate thumbnail:', error)
            } finally {
                setIsLoading(false)
            }
        }

        const handleLoadedData = () => {
            if (video.duration > 0) {
                video.currentTime = Math.min(0.5, video.duration * 0.1)
            }
        }

        const handleSeeked = () => {
            generateThumbnail()
        }

        const handleError = async () => {
            if (isRetrying || currentUrl !== url) return
            
            setIsRetrying(true)
            console.error('Video load error', currentUrl)

            try {
                const match = currentUrl.match(/\/storage\/v1\/object\/public\/applications\/(.+)$/)
                if (match && match[1]) {
                    const path = decodeURIComponent(match[1])
                    const { data, error: signedError } = await supabase.storage
                        .from('applications')
                        .createSignedUrl(path, 3600)

                    if (!signedError && data?.signedUrl) {
                        console.log('Recovered video with signed URL')
                        setCurrentUrl(data.signedUrl)
                        setIsRetrying(false)
                        return
                    }
                }
            } catch (e) {
                console.error('Failed to recover video:', e)
            }

            setIsRetrying(false)
            setIsLoading(false)
        }

        video.src = currentUrl
        video.addEventListener('loadeddata', handleLoadedData)
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('error', handleError)

        return () => {
            video.removeEventListener('loadeddata', handleLoadedData)
            video.removeEventListener('seeked', handleSeeked)
            video.removeEventListener('error', handleError)
        }
    }, [currentUrl, url, isRetrying])

    return (
        <div
            className="relative w-full h-full bg-black rounded-lg overflow-hidden cursor-pointer"
            onClick={onClick}
        >
            <video
                ref={videoRef}
                className="hidden"
                muted
                preload="metadata"
                playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            {thumbnailUrl ? (
                <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    {isLoading ? (
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    ) : (
                        <Video className="w-8 h-8 text-gray-400" />
                    )}
                </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                <div className="bg-black/40 rounded-full p-2 backdrop-blur-sm">
                    <Video className="w-8 h-8 text-white" />
                </div>
            </div>
        </div>
    )
}

export default function BeforeAfterUpload({
    type,
    content,
    mediaUrls,
    onContentChange,
    onMediaAdd,
    onMediaRemove,
    onMediaClick,
    readOnly = false,
    uploading = false,
    mediaFiles
}: BeforeAfterUploadProps) {
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (readOnly) return

        const files = Array.from(e.dataTransfer.files)
        const validFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type.startsWith('video/')
        )

        if (validFiles.length > 0) {
            onMediaAdd(validFiles)
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            onMediaAdd(files)
        }
    }

    const title = type === 'before' ? '작업 전 (BEFORE)' : '작업 후 (AFTER)'
    const placeholder = type === 'before'
        ? '작업 전 상태를 설명해주세요...'
        : '작업 후 결과를 설명해주세요...'

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

            {/* Text Content */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명
                </label>
                <textarea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={readOnly}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>

            {/* Media Upload */}
            {!readOnly && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        사진/영상
                    </label>
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                            transition-colors
                            ${dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                            }
                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileInput}
                            className="hidden"
                            disabled={uploading}
                            aria-label="파일 업로드"
                        />
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-sm text-gray-600">업로드 중...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-12 h-12 text-gray-400" />
                                <p className="text-sm text-gray-600">
                                    클릭하거나 파일을 드래그하여 업로드
                                </p>
                                <p className="text-xs text-gray-500">
                                    이미지 또는 영상 파일
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Media Preview Grid */}
            {mediaUrls.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        업로드된 미디어 ({mediaUrls.length})
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {mediaUrls.map((url, index) => (
                            <div key={url} className="relative group aspect-square">
                                {(mediaFiles ? mediaFiles[index]?.type.startsWith('video/') : isVideo(url)) ? (
                                    <VideoThumbnail url={url} onClick={() => onMediaClick?.(index)} />
                                ) : (
                                    <img
                                        src={url}
                                        alt={`미디어 ${index + 1}`}
                                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => onMediaClick?.(index)}
                                    />
                                )}

                                {!readOnly && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onMediaRemove(url)
                                        }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        aria-label="삭제"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
