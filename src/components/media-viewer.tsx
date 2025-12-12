'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getCachedSignedUrl, setCachedSignedUrl } from '@/utils/media-url-cache'

interface MediaViewerProps {
    mediaUrls: string[]
    initialIndex: number
    onClose: () => void
    mediaTypes?: string[]
}

export default function MediaViewer({ mediaUrls, initialIndex, onClose, mediaTypes }: MediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [currentUrl, setCurrentUrl] = useState<string>(mediaUrls[initialIndex] || '')
    const [urlCache, setUrlCache] = useState<Map<string, string>>(new Map())
    const supabase = createClient()

    // Pre-generate signed URLs for all media items
    useEffect(() => {
        const generateSignedUrls = async () => {
            const newCache = new Map<string, string>()
            
            for (const url of mediaUrls) {
                // Check existing cache first
                const cached = getCachedSignedUrl(url)
                if (cached) {
                    newCache.set(url, cached)
                    continue
                }

                // Check if it's a Supabase public URL
                const match = url.match(/\/storage\/v1\/object\/public\/applications\/(.+)$/)
                if (match && match[1]) {
                    try {
                        const path = decodeURIComponent(match[1])
                        const { data, error: signedError } = await supabase.storage
                            .from('applications')
                            .createSignedUrl(path, 86400) // 24 hours

                        if (!signedError && data?.signedUrl) {
                            setCachedSignedUrl(url, data.signedUrl)
                            newCache.set(url, data.signedUrl)
                        } else {
                            newCache.set(url, url)
                        }
                    } catch (e) {
                        console.error('Failed to generate signed URL:', e)
                        newCache.set(url, url)
                    }
                } else {
                    newCache.set(url, url)
                }
            }
            
            setUrlCache(newCache)
            // Set initial URL
            const initialUrl = newCache.get(mediaUrls[initialIndex] || '') || mediaUrls[initialIndex] || ''
            setCurrentUrl(initialUrl)
        }

        generateSignedUrls()
    }, [mediaUrls, initialIndex, supabase])

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    // 좌우 화살표 키로 네비게이션
    useEffect(() => {
        const handleArrow = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev()
            if (e.key === 'ArrowRight') handleNext()
        }
        window.addEventListener('keydown', handleArrow)
        return () => window.removeEventListener('keydown', handleArrow)
    }, [currentIndex])

    // URL이 변경될 때마다 currentUrl 업데이트
    useEffect(() => {
        const url = mediaUrls[currentIndex] || ''
        const cachedUrl = urlCache.get(url) || url
        setCurrentUrl(cachedUrl)
    }, [currentIndex, mediaUrls, urlCache])

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1))
    }

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0))
    }

    const handleMediaError = () => {
        const originalUrl = mediaUrls[currentIndex]
        console.error('Media load error', originalUrl)
        // Signed URL should already be set, so this is a real error
    }

    const isVideo = currentUrl?.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)(\?|$)/i)

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                aria-label="닫기"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Navigation Buttons */}
            {mediaUrls.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handlePrev()
                        }}
                        className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
                        aria-label="이전"
                    >
                        <ChevronLeft className="w-12 h-12" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleNext()
                        }}
                        className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
                        aria-label="다음"
                    >
                        <ChevronRight className="w-12 h-12" />
                    </button>
                </>
            )}

            {/* Media Content */}
            <div
                className="w-full h-full flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {(mediaTypes ? mediaTypes[currentIndex] === 'video' : isVideo) ? (
                    <video
                        key={currentUrl}
                        src={currentUrl}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className="max-w-[95vw] max-h-[95vh] w-auto h-auto rounded-lg shadow-2xl"
                        style={{ maxWidth: '95vw', maxHeight: '95vh' }}
                        onError={handleMediaError}
                    />
                ) : (
                    <img
                        key={currentUrl}
                        src={currentUrl}
                        alt={`미디어 ${currentIndex + 1}`}
                        className="max-w-[95vw] max-h-[95vh] w-auto h-auto rounded-lg shadow-2xl"
                        style={{ maxWidth: '95vw', maxHeight: '95vh' }}
                        onError={handleMediaError}
                    />
                )}
            </div>

            {/* Counter */}
            {mediaUrls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full">
                    {currentIndex + 1} / {mediaUrls.length}
                </div>
            )}
        </div>
    )
}
