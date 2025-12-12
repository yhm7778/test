/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, ChangeEvent, useRef, useEffect, memo } from 'react'
import { Upload, X, ImageOff, RefreshCw, Play, FileVideo, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getCachedSignedUrl, setCachedSignedUrl } from '@/utils/media-url-cache'

interface PhotoUploadProps {
    photos: File[]
    setPhotos: (photos: File[]) => void
    initialUrls?: string[]
    readOnly?: boolean
    photosOnly?: boolean
    minFiles?: number
    maxFiles?: number
}

// Internal component to handle individual media items with fallback logic
const SupabaseMedia = memo(({
    url,
    alt,
    className,
    onClick,
    controls = false
}: {
    url: string,
    alt?: string,
    className?: string,
    onClick?: () => void,
    controls?: boolean
}) => {
    const [currentUrl, setCurrentUrl] = useState(url)
    const [isDead, setIsDead] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const supabaseRef = useRef(createClient())
    const urlProcessedRef = useRef<string | null>(null)

    const isVideo = (path: string) => {
        return path.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)(\?|$)/i)
    }

    const mediaType = isVideo(url) ? 'video' : 'image'

    // Pre-generate signed URL on mount for better performance
    useEffect(() => {
        const generateSignedUrl = async () => {
            // Check cache first
            const cached = getCachedSignedUrl(url)
            if (cached) {
                setCurrentUrl(cached)
                setIsLoading(false)
                return
            }

            // Check if it's a Supabase public URL
            const match = url.match(/\/storage\/v1\/object\/public\/applications\/(.+)$/)
            if (match && match[1]) {
                try {
                    const path = decodeURIComponent(match[1])
                    const { data, error: signedError } = await supabaseRef.current
                        .storage
                        .from('applications')
                        .createSignedUrl(path, 86400) // 24 hours

                    if (!signedError && data?.signedUrl) {
                        setCachedSignedUrl(url, data.signedUrl)
                        setCurrentUrl(data.signedUrl)
                    } else {
                        setCurrentUrl(url)
                    }
                } catch (e) {
                    console.error('Failed to generate signed URL:', e)
                    setCurrentUrl(url)
                }
            } else {
                setCurrentUrl(url)
            }
            setIsLoading(false)
        }

        generateSignedUrl()
    }, [url]) // Remove supabase from dependencies

    const handleError = () => {
        console.error('Media load error', currentUrl)
        setIsDead(true)
    }

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (isDead) {
        return (
            <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
                {mediaType === 'video' ? <FileVideo className="h-8 w-8 mb-2" /> : <ImageOff className="h-8 w-8 mb-2" />}
                <span className="text-xs text-center px-2 break-all">
                    {mediaType === 'video' ? '동영상을 재생할 수 없습니다' : '이미지를 불러올 수 없습니다'}
                </span>
            </div>
        )
    }

    if (mediaType === 'video') {
        return <VideoThumbnailMedia url={currentUrl} className={className} controls={controls} onClick={onClick} onError={handleError} />
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <img
                src={currentUrl}
                alt={alt || 'Image'}
                className={className}
                onClick={onClick}
                onError={handleError}
            />
        </div>
    )
}, (prevProps, nextProps) => {
    // Only re-render if url changes
    return prevProps.url === nextProps.url && prevProps.className === nextProps.className
})

// Video thumbnail component with canvas-based preview
const VideoThumbnailMedia = memo(function VideoThumbnailMedia({ 
    url, 
    className, 
    controls, 
    onClick, 
    onError 
}: { 
    url: string
    className?: string
    controls?: boolean
    onClick?: () => void
    onError?: () => void
}) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentUrl, setCurrentUrl] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const supabaseRef = useRef(createClient())
    const urlProcessedRef = useRef<string | null>(null)

    // Pre-generate signed URL on mount for better performance
    useEffect(() => {
        // Skip if already processed this URL
        if (urlProcessedRef.current === url && currentUrl) {
            return
        }

        urlProcessedRef.current = url

        const generateSignedUrl = async () => {
            // Check cache first
            const cached = getCachedSignedUrl(url)
            if (cached) {
                setCurrentUrl(cached)
                return
            }

            // Check if it's a Supabase public URL
            const match = url.match(/\/storage\/v1\/object\/public\/applications\/(.+)$/)
            if (match && match[1]) {
                try {
                    const path = decodeURIComponent(match[1])
                    const { data, error: signedError } = await supabaseRef.current.storage
                        .from('applications')
                        .createSignedUrl(path, 86400) // 24 hours

                    if (!signedError && data?.signedUrl) {
                        setCachedSignedUrl(url, data.signedUrl)
                        setCurrentUrl(data.signedUrl)
                    } else {
                        setCurrentUrl(url)
                    }
                } catch (e) {
                    console.error('Failed to generate signed URL:', e)
                    setCurrentUrl(url)
                }
            } else {
                setCurrentUrl(url)
            }
        }

        generateSignedUrl()
    }, [url]) // Remove supabase from dependencies

    useEffect(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || !currentUrl) return

        // Don't reload if video src is already set to currentUrl
        if (video.src && video.src === currentUrl && thumbnailUrl) {
            return
        }

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
            console.error('Video load error', currentUrl)
            setIsLoading(false)
            onError?.()
        }

        // Only set src if it's different
        if (video.src !== currentUrl) {
            video.src = currentUrl
        }
        
        video.addEventListener('loadeddata', handleLoadedData)
        video.addEventListener('seeked', handleSeeked)
        video.addEventListener('error', handleError)

        return () => {
            video.removeEventListener('loadeddata', handleLoadedData)
            video.removeEventListener('seeked', handleSeeked)
            video.removeEventListener('error', handleError)
        }
    }, [currentUrl, thumbnailUrl]) // Add thumbnailUrl to prevent unnecessary reloads

    if (controls) {
        if (!currentUrl) {
            return (
                <div className={`${className} bg-gray-800 flex items-center justify-center`}>
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            )
        }
        return (
            <div className="relative w-full h-full flex items-center justify-center">
                <video
                    ref={videoRef}
                    src={currentUrl}
                    className={className}
                    controls
                    onClick={onClick}
                    onError={onError}
                    preload="metadata"
                    playsInline
                />
            </div>
        )
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
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
                    className={className}
                    onClick={onClick}
                />
            ) : (
                <div className={`${className} bg-gray-800 flex items-center justify-center`}>
                    {isLoading ? (
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                        <FileVideo className="w-6 h-6 text-gray-400" />
                    )}
                </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
                    <Play className="h-6 w-6 text-white fill-white" />
                </div>
            </div>
        </div>
    )
}, (prevProps, nextProps) => {
    // Only re-render if url changes (ignore onClick, onError, className, and controls changes)
    return prevProps.url === nextProps.url
})

export default function PhotoUpload({ photos, setPhotos, initialUrls = [], readOnly = false, photosOnly = false, minFiles, maxFiles }: PhotoUploadProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null) // For popup

    const handleDragOver = useCallback((e: React.DragEvent) => {
        if (readOnly) return
        e.preventDefault()
        setIsDragging(true)
    }, [readOnly])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (readOnly) return
        e.preventDefault()
        setIsDragging(false)
    }, [readOnly])

    const handleDrop = useCallback((e: React.DragEvent) => {
        if (readOnly) return
        e.preventDefault()
        setIsDragging(false)

        const fileFilter = photosOnly
            ? (file: File) => file.type.startsWith('image/')
            : (file: File) => file.type.startsWith('image/') || file.type.startsWith('video/')

        const files = Array.from(e.dataTransfer.files).filter(fileFilter)

        if (files.length === 0) {
            alert(photosOnly ? '이미지 파일만 업로드 가능합니다.' : '이미지 또는 동영상 파일만 업로드 가능합니다.')
            return
        }

        const newPhotos = [...photos, ...files]
        if (maxFiles && newPhotos.length > maxFiles) {
            alert(`최대 ${maxFiles}개의 파일만 업로드 가능합니다.`)
            return
        }

        setPhotos(newPhotos)
    }, [photos, setPhotos, readOnly, photosOnly, maxFiles])

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return
        if (e.target.files) {
            const fileFilter = photosOnly
                ? (file: File) => file.type.startsWith('image/')
                : (file: File) => file.type.startsWith('image/') || file.type.startsWith('video/')

            const files = Array.from(e.target.files).filter(fileFilter)

            if (files.length === 0) {
                alert(photosOnly ? '이미지 파일만 업로드 가능합니다.' : '이미지 또는 동영상 파일만 업로드 가능합니다.')
                return
            }

            const newPhotos = [...photos, ...files]
            if (maxFiles && newPhotos.length > maxFiles) {
                alert(`최대 ${maxFiles}개의 파일만 업로드 가능합니다.`)
                return
            }

            setPhotos(newPhotos)
        }
    }

    const removePhoto = (index: number) => {
        if (readOnly) return
        setPhotos(photos.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
            {!readOnly && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
            `}
                >
                    <label htmlFor="photo-upload-input" className="sr-only">
                        사진 업로드
                    </label>
                    <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="photo-upload-input"
                        title="사진 업로드"
                    />
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">
                            클릭하여 업로드하거나 이미지를 드래그하세요
                        </p>
                        <p className="text-xs text-gray-500">
                            {photosOnly
                                ? '이미지 파일을 업로드할 수 있으며, 파일당 최대 1GB까지 지원합니다.'
                                : '이미지·동영상 파일을 업로드할 수 있으며, 파일당 최대 1GB까지 지원합니다.'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Existing Photos (initialUrls) */}
            {(initialUrls.length > 0 || photos.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {initialUrls.map((url, index) => (
                        <div key={`url-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group cursor-pointer" onClick={() => setSelectedImage(url)}>
                            <SupabaseMedia
                                url={url}
                                alt={`Uploaded ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}

                    {photos.map((photo, index) => (
                        <div key={`file-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                            {photo.type.startsWith('video/') ? (
                                <video
                                    src={URL.createObjectURL(photo)}
                                    className="w-full h-full object-cover"
                                    controls
                                />
                            ) : (
                                <img
                                    src={URL.createObjectURL(photo)}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removePhoto(index);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="사진 삭제"
                                >
                                    <X className="h-4 w-4 text-gray-500" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Image Popup */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300"
                            aria-label="닫기"
                        >
                            <X className="h-8 w-8" />
                        </button>
                        <SupabaseMedia
                            url={selectedImage}
                            alt="Full size"
                            className="max-w-full max-h-full object-contain"
                            controls={true}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
