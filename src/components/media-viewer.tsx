'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface MediaViewerProps {
    mediaUrls: string[]
    initialIndex: number
    onClose: () => void
}

export default function MediaViewer({ mediaUrls, initialIndex, onClose }: MediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

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

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1))
    }

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0))
    }

    const currentUrl = mediaUrls[currentIndex]
    const isVideo = currentUrl?.match(/\.(mp4|webm|ogg)$/i)

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
                {isVideo ? (
                    <video
                        src={currentUrl}
                        controls
                        autoPlay
                        className="max-w-[95vw] max-h-[95vh] w-auto h-auto rounded-lg shadow-2xl"
                        style={{ maxWidth: '95vw', maxHeight: '95vh' }}
                    />
                ) : (
                    <img
                        src={currentUrl}
                        alt={`미디어 ${currentIndex + 1}`}
                        className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        style={{ maxWidth: '95vw', maxHeight: '95vh', width: 'auto', height: 'auto' }}
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
