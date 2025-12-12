'use client'

import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon, Video, Loader2 } from 'lucide-react'
import MediaViewer from './media-viewer'

interface BeforeAfterComparisonProps {
    beforeContent: string | null
    afterContent: string | null
    beforeMediaUrls: string[] | null
    afterMediaUrls: string[] | null
    beforeMediaTypes?: string[]
    afterMediaTypes?: string[]
}

// Helper function to check if URL is an image
const isImage = (url: string) => url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|ico|heic|heif|avif)(\?|$)/i)

// Helper function to check if URL is a video (keep for explicit checks if needed, but main logic defaults to video)
const isVideo = (url: string) => url.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v|mkv|3gp|ts)(\?|$)/i)

// Video thumbnail component with canvas-based preview
function VideoThumbnail({ url, onClick }: { url: string; onClick: () => void }) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

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

        const handleError = () => {
            console.error('Video load error', url)
            setIsLoading(false)
        }

        video.addEventListener('loadeddata', handleLoadedData)
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('error', handleError)

        return () => {
            video.removeEventListener('loadeddata', handleLoadedData)
            video.removeEventListener('seeked', handleSeeked)
            video.removeEventListener('error', handleError)
        }
    }, [url])

    return (
        <div
            className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
            onClick={(e) => {
                e.stopPropagation()
                onClick()
            }}
        >
            <video
                ref={videoRef}
                src={url}
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors pointer-events-none">
                <Video className="w-12 h-12 text-white" />
            </div>
        </div>
    )
}

export default function BeforeAfterComparison({
    beforeContent,
    afterContent,
    beforeMediaUrls,
    afterMediaUrls,
    beforeMediaTypes,
    afterMediaTypes
}: BeforeAfterComparisonProps) {
    const [activeTab, setActiveTab] = useState<'before' | 'after'>('before')
    const [viewerOpen, setViewerOpen] = useState(false)
    const [viewerUrls, setViewerUrls] = useState<string[]>([])
    const [viewerIndex, setViewerIndex] = useState(0)

    const openViewer = (urls: string[], index: number) => {
        setViewerUrls(urls)
        setViewerIndex(index)
        setViewerOpen(true)
    }

    const hasBeforeData = beforeContent || (beforeMediaUrls && beforeMediaUrls.length > 0)
    const hasAfterData = afterContent || (afterMediaUrls && afterMediaUrls.length > 0)

    if (!hasBeforeData && !hasAfterData) {
        return null
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">작업 전/후 비교</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('before')}
                    className={`
                        flex-1 px-6 py-3 font-medium transition-colors text-sm
                        ${activeTab === 'before'
                            ? 'text-gray-900 border-b-2 border-gray-900 bg-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }
                    `}
                >
                    작업 전 (BEFORE)
                </button>
                <button
                    onClick={() => setActiveTab('after')}
                    className={`
                        flex-1 px-6 py-3 font-medium transition-colors text-sm
                        ${activeTab === 'after'
                            ? 'text-gray-900 border-b-2 border-gray-900 bg-white'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }
                    `}
                >
                    작업 후 (AFTER)
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'before' ? (
                    <div className="space-y-6">
                        {beforeContent && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">설명</h3>
                                <p className="text-gray-900 whitespace-pre-wrap">{beforeContent}</p>
                            </div>
                        )}
                        {beforeMediaUrls && beforeMediaUrls.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    미디어 ({beforeMediaUrls.length})
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {beforeMediaUrls.map((url, index) => (
                                        <div
                                            key={url}
                                            className="relative aspect-square cursor-pointer group"
                                            onClick={() => openViewer(beforeMediaUrls, index)}
                                        >
                                            {(beforeMediaTypes ? beforeMediaTypes[index] === 'video' : !isImage(url)) ? (
                                                <VideoThumbnail url={url} onClick={() => openViewer(beforeMediaUrls, index)} />
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt={`작업 전 ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!hasBeforeData && (
                            <p className="text-gray-500 text-center py-8">작업 전 데이터가 없습니다.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {afterContent && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">설명</h3>
                                <p className="text-gray-900 whitespace-pre-wrap">{afterContent}</p>
                            </div>
                        )}
                        {afterMediaUrls && afterMediaUrls.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    미디어 ({afterMediaUrls.length})
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {afterMediaUrls.map((url, index) => (
                                        <div
                                            key={url}
                                            className="relative aspect-square cursor-pointer group"
                                            onClick={() => openViewer(afterMediaUrls, index)}
                                        >
                                            {(afterMediaTypes ? afterMediaTypes[index] === 'video' : !isImage(url)) ? (
                                                <VideoThumbnail url={url} onClick={() => openViewer(afterMediaUrls, index)} />
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt={`작업 후 ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!hasAfterData && (
                            <p className="text-gray-500 text-center py-8">작업 후 데이터가 없습니다.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Media Viewer Modal */}
            {
                viewerOpen && (

                    <MediaViewer
                        mediaUrls={viewerUrls}
                        initialIndex={viewerIndex}
                        onClose={() => setViewerOpen(false)}
                        mediaTypes={viewerUrls.map((url, i) => {
                            const originalIndex = activeTab === 'before'
                                ? beforeMediaUrls!.indexOf(url) // Note: This might be inaccurate if duplicates exist, but sufficient for type lookup usually
                                : afterMediaUrls!.indexOf(url)

                            // Use prop types if available, otherwise use new detection logic
                            if (activeTab === 'before' && beforeMediaTypes?.[originalIndex]) return beforeMediaTypes[originalIndex]
                            if (activeTab === 'after' && afterMediaTypes?.[originalIndex]) return afterMediaTypes[originalIndex]

                            return isImage(url) ? 'image' : 'video'
                        })}
                    />
                )
            }
        </div >
    )
}
