'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import PhotoUpload from './photo-upload'
import { sanitizeHtml, validateFile, sanitizeFilename } from '@/lib/security'
import { Loader2 } from 'lucide-react'

import { Database } from '@/types/supabase'

interface ApplicationFormProps {
    initialData?: Database['public']['Tables']['applications']['Row']
    readOnly?: boolean
    type?: string
    targetUserId?: string
}

export default function ApplicationForm({ initialData, readOnly = false, type, targetUserId }: ApplicationFormProps) {
    const parseBlogCount = (notes: string | null) => {
        if (!notes) return ''
        const match = notes.match(/블로그 리뷰 갯수:\s*(\d+)개/)
        return match ? match[1] : ''
    }

    const getTitle = (t: string | undefined) => {
        switch(t) {
            case 'blog-reporter': return '블로그 기자단 포스팅 신청서'
            case 'blog-experience': return '블로그 체험단 포스팅 신청서'
            case 'instagram-popular': return '인스타그램 인기게시물 포스팅 신청서'
            case 'seo-optimization': return 'SEO 최적화작업'
            case 'photo-shooting': return '사진촬영'
            case 'etc': return '기타사항 포스팅 신청서'
            default: return '마케팅 신청서'
        }
    }

    const getDescription = (t: string | undefined) => {
        switch(t) {
            case 'blog-reporter': return '전문 기자가 작성하는 고품질 리뷰를 신청하세요.'
            case 'blog-experience': return '실제 체험을 바탕으로 한 생생한 후기를 신청하세요.'
            case 'instagram-popular': return '인스타그램 인기게시물 노출을 통해 홍보 효과를 극대화하세요.'
            case 'seo-optimization': return '최초 계약 후 바로 진행되는 SEO 최적화 작업입니다.'
            case 'photo-shooting': return '사진촬영 기사님과 일정 조율 후 진행되는 사진촬영입니다.'
            case 'etc': return '기타 마케팅 문의사항을 남겨주세요.'
            default: return '비전온라인마케팅 신청서입니다.'
        }
    }

    const isSimpleForm = type === 'seo-optimization' || type === 'photo-shooting'

    const [storeName, setStoreName] = useState(initialData?.store_name || '')
    const [photos, setPhotos] = useState<File[]>([])
    const [blogCount, setBlogCount] = useState(parseBlogCount(initialData?.notes || null))
    const [keyword1, setKeyword1] = useState(initialData?.keywords?.[0] || '')
    const [keyword2, setKeyword2] = useState(initialData?.keywords?.[1] || '')
    const [advantages, setAdvantages] = useState(initialData?.advantages || '')
    const [contentKeywords, setContentKeywords] = useState(initialData?.tags?.join(', ') || '')
    const [agreedToGuidelines, setAgreedToGuidelines] = useState(!!initialData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
    const [error, setError] = useState('')

    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (readOnly) return

        setError('')
        setIsSubmitting(true)

        try {
            // Validation
            if (!storeName.trim()) {
                throw new Error('상호명을 입력해주세요.')
            }

            if (!isSimpleForm) {
                if (!blogCount.trim() || Number.isNaN(Number(blogCount)) || Number(blogCount) <= 0) {
                    throw new Error('발행할 블로그 리뷰 갯수를 입력해주세요.')
                }
                if (photos.length === 0) {
                    throw new Error('최소 1장의 사진 또는 동영상을 업로드해주세요.')
                }
                if (!keyword1.trim() || !keyword2.trim()) {
                    throw new Error('대표키워드 2개를 모두 입력해주세요.')
                }
                if (!advantages.trim()) {
                    throw new Error('업체 장점 및 어필점을 입력해주세요.')
                }
                if (!contentKeywords.trim()) {
                    throw new Error('본문 강조키워드를 입력해주세요.')
                }
                if (!agreedToGuidelines) {
                    throw new Error('주의사항을 확인하고 동의해주세요.')
                }

                // Validate files
                for (const photo of photos) {
                    const validation = validateFile(photo)
                    if (!validation.valid) {
                        throw new Error(validation.error)
                    }
                }
            }

            // Get current user (optional)
            const { data: { user } } = await supabase.auth.getUser()

            // Upload photos (with timeout safeguard to avoid infinite spinner)
            const uploadWithTimeout = async <T,>(task: Promise<T>, label: string) => {
                const timeoutMs = 20000
                return await Promise.race([
                    task,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`${label} 업로드가 지연되고 있습니다. 다시 시도해주세요.`)), timeoutMs)
                    ),
                ])
            }

            const sanitizedFolder = sanitizeFilename(storeName.trim() || 'store')
            setUploadProgress({ current: 0, total: photos.length })
            let completedCount = 0

            // Upload photos in parallel
            const uploadPromises = photos.map(async (photo) => {
                const fileExt = photo.name.split('.').pop()
                const sanitizedName = sanitizeFilename(`${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`)
                const objectPath = `${sanitizedFolder}/${sanitizedName}`

                const uploadResult = await uploadWithTimeout(
                    supabase.storage
                        .from('applications')
                        .upload(objectPath, photo, {
                            cacheControl: '3600',
                            upsert: false
                        }),
                    '파일'
                ) as { data: { path: string } | null; error: { message: string } | null }

                const { data, error: uploadError } = uploadResult

                if (uploadError) throw uploadError
                if (!data || !data.path) {
                    throw new Error('파일 업로드 결과가 올바르지 않습니다.')
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('applications')
                    .getPublicUrl(data.path)

                completedCount++
                setUploadProgress(prev => ({ ...prev, current: completedCount }))

                return publicUrl
            })

            const photoUrls = await Promise.all(uploadPromises)

            // Construct notes
            let finalNotes = ''
            if (isSimpleForm) {
                finalNotes = advantages // Use advantages field as general notes for simple form
            } else {
                finalNotes = `블로그 리뷰 갯수: ${sanitizeHtml(blogCount.trim())}개\n주의사항 확인 및 동의 완료`
            }

            // Insert application with timeout
            const insertPromise = supabase
                .from('applications')
                .insert({
                    user_id: targetUserId || user?.id || null,
                    store_name: sanitizeHtml(storeName),
                    keywords: isSimpleForm ? [] : [sanitizeHtml(keyword1.trim()), sanitizeHtml(keyword2.trim())],
                    advantages: sanitizeHtml(advantages),
                    tags: isSimpleForm ? [] : contentKeywords.split(',').map(k => sanitizeHtml(k.trim())).filter(k => k),
                    notes: finalNotes,
                    photo_urls: photoUrls,
                    marketing_type: type?.replace(/-/g, '_') || null,
                    status: 'pending',
                })

            const { error: insertError } = await Promise.race([
                insertPromise,
                new Promise<{ error: { message: string } | null }>((_, reject) =>
                    setTimeout(() => reject(new Error('신청서 제출이 지연되고 있습니다. 잠시 후 다시 시도해주세요.')), 20000)
                )
            ])

            if (insertError) throw insertError

            // Success
            alert('신청이 완료되었습니다!')
            router.push('/')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '신청 중 오류가 발생했습니다.'
            setError(message)
            console.error('Application error:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="card space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{getTitle(type)}</h1>
                    <p className="text-gray-500 mt-2">{getDescription(type)}</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* 상호명 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 상호명 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="input-field disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="상호명을 입력하세요"
                        required
                        maxLength={100}
                        disabled={readOnly}
                    />
                </div>

                {/* 발행할 블로그 리뷰 갯수 */}
                {!isSimpleForm && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 발행 할 블로그 리뷰 갯수 (N개) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={blogCount}
                        onChange={(e) => setBlogCount(e.target.value.replace(/[^0-9]/g, ''))}
                        className="input-field disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="예: 5"
                        required
                        disabled={readOnly}
                    />
                    {!readOnly && <p className="mt-2 text-xs text-gray-500">체크한 N개 만큼 파일을 분류해 주시면 작업 속도가 빨라집니다.</p>}
                </div>
                )}

                {/* 사진 */}
                {!isSimpleForm && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 사진 : (이미지 기입, 동영상) <span className="text-red-500">*</span>
                    </label>
                    <PhotoUpload 
                        photos={photos} 
                        setPhotos={setPhotos} 
                        initialUrls={initialData?.photo_urls || []}
                        readOnly={readOnly}
                    />
                </div>
                )}

                {/* 대표키워드 2개 */}
                {!isSimpleForm && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 대표키워드 (제목들어갈 키워드 2개) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={keyword1}
                            onChange={(e) => setKeyword1(e.target.value)}
                            className="input-field disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="키워드 1"
                            required
                            maxLength={50}
                            disabled={readOnly}
                        />
                        <input
                            type="text"
                            value={keyword2}
                            onChange={(e) => setKeyword2(e.target.value)}
                            className="input-field disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="키워드 2"
                            required
                            maxLength={50}
                            disabled={readOnly}
                        />
                    </div>
                </div>
                )}

                {/* 업체 장점 및 어필점 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ {isSimpleForm ? '작업 내용 및 메모' : '업체 장점 및 어필점 등'} <span className={isSimpleForm ? "" : "text-red-500"}>{isSimpleForm ? "" : "*"}</span>
                    </label>
                    <textarea
                        value={advantages}
                        onChange={(e) => setAdvantages(e.target.value)}
                        className="input-field min-h-[100px] resize-y disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder={isSimpleForm ? "작업 관련 메모를 입력하세요." : "신메뉴가 출시된 점 어필해주세요"}
                        required={!isSimpleForm}
                        maxLength={1000}
                        disabled={readOnly}
                    />
                </div>

                {/* 본문 강조키워드 */}
                {!isSimpleForm && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 본문 강조키워드 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={contentKeywords}
                        onChange={(e) => setContentKeywords(e.target.value)}
                        className="input-field disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="키워드를 쉼표(,)로 구분하여 입력하세요"
                        required
                        maxLength={200}
                        disabled={readOnly}
                    />
                </div>
                )}

                {/* 주의사항 체크박스 */}
                {!readOnly && !isSimpleForm && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ■ 주의사항 <span className="text-red-500">*</span>
                        </label>
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 mb-3">
                            주의사항 / 해당 가이드라인 1개당 사진을 나누어서 전달주시면 훨씬 상세한 블로그 작성이 가능합니다.
                            여러 장 회신이 어려우시면 포괄적인 장점들만 작성해 주셔도 여러 블로그 발행이 가능합니다.
                            블로그는 양질보다는 갯수로 구매 전환과 브랜딩을 위한 사항입니다. 상세내용 공지를 꼭 확인해주세요.
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreedToGuidelines}
                                onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                required
                            />
                            <span className="text-sm text-gray-700">
                                위 주의사항을 확인했으며 이에 동의합니다.
                            </span>
                        </label>
                    </div>
                )}

                {/* Submit Button */}
                {!readOnly && (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>
                                    {uploadProgress.total > 0 
                                        ? `업로드 중... ${uploadProgress.current}/${uploadProgress.total} (${Math.round(uploadProgress.current / uploadProgress.total * 100)}%)`
                                        : '제출 중...'}
                                </span>
                            </>
                        ) : (
                            <span>신청하기</span>
                        )}
                    </button>
                )}
            </div>
        </form>
    )
}
