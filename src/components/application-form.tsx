'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import PhotoUpload from './photo-upload'
import { sanitizeHtml, validateFile, sanitizeFilename } from '@/lib/security'
import { Loader2 } from 'lucide-react'

export default function ApplicationForm() {
    const [storeName, setStoreName] = useState('')
    const [photos, setPhotos] = useState<File[]>([])
    const [blogCount, setBlogCount] = useState('')
    const [keyword1, setKeyword1] = useState('')
    const [keyword2, setKeyword2] = useState('')
    const [advantages, setAdvantages] = useState('')
    const [contentKeywords, setContentKeywords] = useState('')
    const [agreedToGuidelines, setAgreedToGuidelines] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            // Validation
            if (!storeName.trim()) {
                throw new Error('상호명을 입력해주세요.')
            }
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

            // Get current user (optional)
            const { data: { user } } = await supabase.auth.getUser()

            // Upload photos (with timeout safeguard to avoid infinite spinner)
            const photoUrls: string[] = []
            const uploadWithTimeout = async (task: Promise<any>, label: string) => {
                const timeoutMs = 20000
                return await Promise.race([
                    task,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`${label} 업로드가 지연되고 있습니다. 다시 시도해주세요.`)), timeoutMs)
                    ),
                ])
            }

            const sanitizedFolder = sanitizeFilename(storeName.trim() || 'store')

            for (const photo of photos) {
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

                photoUrls.push(publicUrl)
            }

            // Insert application with timeout
            const insertPromise = supabase
                .from('applications')
                .insert({
                    user_id: user?.id || null,
                    store_name: sanitizeHtml(storeName),
                    keywords: [sanitizeHtml(keyword1.trim()), sanitizeHtml(keyword2.trim())],
                    advantages: sanitizeHtml(advantages),
                    tags: contentKeywords.split(',').map(k => sanitizeHtml(k.trim())).filter(k => k),
                    notes: `블로그 리뷰 갯수: ${sanitizeHtml(blogCount.trim())}개\n주의사항 확인 및 동의 완료`,
                    photo_urls: photoUrls,
                })

            const { error: insertError } = await Promise.race([
                insertPromise,
                new Promise<{ error: any }>((_, reject) =>
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
                <h1 className="text-2xl font-bold text-gray-900">마케팅 신청서</h1>

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
                        className="input-field"
                        placeholder="상호명을 입력하세요"
                        required
                        maxLength={100}
                    />
                </div>

                {/* 발행할 블로그 리뷰 갯수 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 발행 할 블로그 리뷰 갯수 (N개) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={blogCount}
                        onChange={(e) => setBlogCount(e.target.value.replace(/[^0-9]/g, ''))}
                        className="input-field"
                        placeholder="예: 5"
                        required
                    />
                    <p className="mt-2 text-xs text-gray-500">체크한 N개 만큼 파일을 분류해 주시면 작업 속도가 빨라집니다.</p>
                </div>

                {/* 사진 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 사진 : (이미지 기입, 동영상) <span className="text-red-500">*</span>
                    </label>
                    <PhotoUpload photos={photos} setPhotos={setPhotos} />
                </div>

                {/* 대표키워드 2개 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 대표키워드 (제목들어갈 키워드 2개) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={keyword1}
                            onChange={(e) => setKeyword1(e.target.value)}
                            className="input-field"
                            placeholder="키워드 1"
                            required
                            maxLength={50}
                        />
                        <input
                            type="text"
                            value={keyword2}
                            onChange={(e) => setKeyword2(e.target.value)}
                            className="input-field"
                            placeholder="키워드 2"
                            required
                            maxLength={50}
                        />
                    </div>
                </div>

                {/* 업체 장점 및 어필점 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 업체 장점 및 어필점 등 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={advantages}
                        onChange={(e) => setAdvantages(e.target.value)}
                        className="input-field min-h-[100px] resize-y"
                        placeholder="신메뉴가 출시된 점 어필해주세요"
                        required
                        maxLength={1000}
                    />
                </div>

                {/* 본문 강조키워드 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        ■ 본문 강조키워드 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={contentKeywords}
                        onChange={(e) => setContentKeywords(e.target.value)}
                        className="input-field"
                        placeholder="키워드를 쉼표(,)로 구분하여 입력하세요"
                        required
                        maxLength={200}
                    />
                </div>

                {/* 주의사항 체크박스 */}
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

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>제출 중...</span>
                        </>
                    ) : (
                        <span>신청하기</span>
                    )}
                </button>
            </div>
        </form>
    )
}
