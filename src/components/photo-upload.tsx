/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback, ChangeEvent } from 'react'
import { Upload, X, ImageOff, RefreshCw, Play, FileVideo } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface PhotoUploadProps {
    photos: File[]
    setPhotos: (photos: File[]) => void
    initialUrls?: string[]
    readOnly?: boolean
}

// Internal component to handle individual media items with fallback logic
const SupabaseMedia = ({ 
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
    const [isRetrying, setIsRetrying] = useState(false)
    const [isDead, setIsDead] = useState(false)
    const supabase = createClient()
    
    const isVideo = (path: string) => {
        return path.match(/\.(mp4|webm|ogg|mov|qt|avi|wmv|flv|m4v)(\?|$)/i)
    }

    const mediaType = isVideo(url) ? 'video' : 'image'

    const handleError = async () => {
        if (isRetrying || isDead || currentUrl !== url) return 
        
        setIsRetrying(true)

        try {
            // Try to extract path from Supabase Public URL
            // Format example: .../storage/v1/object/public/applications/folder/file.jpg
            const match = url.match(/\/storage\/v1\/object\/public\/applications\/(.+)$/)
            
            if (match && match[1]) {
                const path = decodeURIComponent(match[1])
                console.log(`Attempting to recover media: ${path}`)
                
                const { data, error: signedError } = await supabase
                    .storage
                    .from('applications')
                    .createSignedUrl(path, 3600) // 1 hour validity
                
                if (!signedError && data?.signedUrl) {
                    console.log('Recovered with signed URL')
                    setCurrentUrl(data.signedUrl)
                    setIsRetrying(false)
                    return
                } else {
                    console.error('Failed to get signed URL:', signedError)
                }
            } else {
                console.warn('URL does not match expected Supabase pattern:', url)
            }
        } catch (e) {
            console.error("Failed to recover media:", e)
        }

        // If we reach here, recovery failed
        setIsRetrying(false)
        setIsDead(true)
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
        return (
            <div className="relative w-full h-full flex items-center justify-center">
                <video
                    src={currentUrl}
                    className={className}
                    controls={controls}
                    onClick={onClick}
                    onError={handleError}
                    preload="metadata"
                    playsInline
                />
                {!controls && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                        <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
                            <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <img
                src={currentUrl}
                alt={alt || 'Image'}
                className={`${className} ${isRetrying ? 'opacity-50' : ''}`}
                onClick={onClick}
                onError={handleError}
            />
            {isRetrying && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                </div>
            )}
        </div>
    )
}

export default function PhotoUpload({ photos, setPhotos, initialUrls = [], readOnly = false }: PhotoUploadProps) {
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

        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))

        if (files.length === 0) {
            alert('이미지 또는 동영상 파일만 업로드 가능합니다.')
            return
        }

        setPhotos([...photos, ...files])
    }, [photos, setPhotos, readOnly])

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return
        if (e.target.files) {
            const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))

            if (files.length === 0) {
                alert('이미지 또는 동영상 파일만 업로드 가능합니다.')
                return
            }

            setPhotos([...photos, ...files])
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
                            이미지·동영상 파일을 업로드할 수 있으며, 파일당 최대 1GB까지 지원합니다.
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
