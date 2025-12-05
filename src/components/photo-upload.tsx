'use client'

import { useState, useCallback, ChangeEvent } from 'react'
import { Upload, X } from 'lucide-react'
import Image from 'next/image'

interface PhotoUploadProps {
    photos: File[]
    setPhotos: (photos: File[]) => void
}

export default function PhotoUpload({ photos, setPhotos }: PhotoUploadProps) {
    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))

        if (files.length === 0) {
            alert('이미지 또는 동영상 파일만 업로드 가능합니다.')
            return
        }

        setPhotos([...photos, ...files])
    }, [photos, setPhotos])

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
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
        setPhotos(photos.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4">
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

            {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                            {photo.type.startsWith('video/') ? (
                                <video
                                    src={URL.createObjectURL(photo)}
                                    className="w-full h-full object-cover"
                                    controls
                                />
                            ) : (
                                <Image
                                    src={URL.createObjectURL(photo)}
                                    alt={`Preview ${index + 1}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className="object-cover"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="사진 삭제"
                                aria-label="사진 삭제"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
