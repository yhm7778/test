'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Solapi 카카오톡 알림톡 발송 서버 액션
 * 
 * 템플릿 종류:
 * 1. 신청 완료 알림 (공통)
 * 2. 블로그 기자단 완료
 * 3. 블로그 체험단 등록 완료
 * 4. 인스타그램 인기게시물 등록 완료
 * 5. 신규 계약 환영 (최초 1회)
 */

interface SolapiKakaoMessage {
    to: string
    kakaoOptions: {
        pfId: string
        templateId: string
        variables?: Record<string, string>
        buttons?: Array<{
            buttonType: 'WL' | 'AL' | 'DS' | 'BK' | 'MD' | 'BC' | 'BT' | 'AC'
            buttonName: string
            linkMo?: string
            linkPc?: string
        }>
    }
}

/**
 * 신청서 제출 시 알림톡 발송
 * 1. 최초 신청: 환영 알림톡 (7T8tOhJ6oO)
 * 2. 신청 완료: 솔루션별 알림톡
 */
export async function sendApplicationSubmittedNotification(params: {
    recipientPhone: string
    username: string
    applicationType: string
    blogCount?: number
    isFirstApplication: boolean
}) {
    try {
        const apiKey = process.env.SOLAPI_API_KEY
        const apiSecret = process.env.SOLAPI_API_SECRET
        const pfId = process.env.SOLAPI_KAKAO_CHANNEL_ID

        if (!apiKey || !apiSecret || !pfId) {
            console.warn('Solapi 설정이 완료되지 않았습니다.')
            return { success: true, message: '알림톡 설정 대기 중' }
        }

        const formattedPhone = params.recipientPhone.replace(/[^0-9]/g, '')

        // 1. 최초 신청인 경우 환영 알림톡 발송
        if (params.isFirstApplication) {
            await sendWelcomeNotification({
                recipientPhone: params.recipientPhone,
                username: params.username
            })
        }

        // 2. 솔루션별 신청 완료 알림톡 발송
        let templateId: string | undefined
        const variables: Record<string, string> = {}

        switch (params.applicationType) {
            case 'blog_reporter':
            case 'blog-reporter':
                templateId = process.env.SOLAPI_TEMPLATE_BLOG_REPORTER_COMPLETED
                if (params.blogCount) {
                    variables.Quantity1 = params.blogCount.toString()
                }
                break
            case 'blog_experience':
            case 'blog-experience':
                templateId = process.env.SOLAPI_TEMPLATE_BLOG_EXPERIENCE_COMPLETED
                break
            case 'instagram_popular':
            case 'instagram-popular':
                templateId = process.env.SOLAPI_TEMPLATE_INSTAGRAM_COMPLETED
                break
            default:
                console.warn(`알림톡 템플릿이 없는 신청 타입: ${params.applicationType}`)
                return { success: true, message: '해당 솔루션은 알림톡이 없습니다.' }
        }

        if (!templateId) {
            console.warn('템플릿 ID가 설정되지 않았습니다.')
            return { success: true, message: '템플릿 설정 대기 중' }
        }

        const message: SolapiKakaoMessage = {
            to: formattedPhone,
            kakaoOptions: {
                pfId,
                templateId,
                variables
            }
        }

        await sendSolapiMessage(message, apiKey, apiSecret)
        console.log('신청 완료 알림톡 발송 성공:', params.applicationType)

        return { success: true, message: '알림톡이 발송되었습니다.' }
    } catch (error) {
        console.error('알림톡 발송 실패:', error)
        return { success: false, error: '알림톡 발송에 실패했습니다.' }
    }
}

/**
 * 신규 계약 환영 알림톡 (최초 1회)
 */
export async function sendWelcomeNotification(params: {
    recipientPhone: string
    username: string
}) {
    try {
        const apiKey = process.env.SOLAPI_API_KEY
        const apiSecret = process.env.SOLAPI_API_SECRET
        const pfId = process.env.SOLAPI_KAKAO_CHANNEL_ID
        const templateId = process.env.SOLAPI_TEMPLATE_WELCOME

        if (!apiKey || !apiSecret || !pfId || !templateId) {
            console.warn('환영 알림톡 템플릿이 설정되지 않았습니다.')
            return { success: true, message: '환영 알림톡 설정 대기 중' }
        }

        const formattedPhone = params.recipientPhone.replace(/[^0-9]/g, '')

        const message: SolapiKakaoMessage = {
            to: formattedPhone,
            kakaoOptions: {
                pfId,
                templateId,
                variables: {
                    name1: params.username
                }
            }
        }

        await sendSolapiMessage(message, apiKey, apiSecret)
        console.log('환영 알림톡 발송 성공')

        return { success: true, message: '환영 알림톡이 발송되었습니다.' }
    } catch (error) {
        console.error('환영 알림톡 발송 실패:', error)
        return { success: false, error: '환영 알림톡 발송에 실패했습니다.' }
    }
}

/**
 * 신청서 완료 처리 알림톡 발송
 * 공통 완료 알림 (T2tWDqfbQm) - #{SolutionName1}
 */
export async function sendApplicationCompletedNotification(params: {
    recipientPhone: string
    applicationType: string
    blogCount?: number
}) {
    try {
        const apiKey = process.env.SOLAPI_API_KEY
        const apiSecret = process.env.SOLAPI_API_SECRET
        const pfId = process.env.SOLAPI_KAKAO_CHANNEL_ID

        if (!apiKey || !apiSecret || !pfId) {
            console.warn('Solapi 설정이 완료되지 않았습니다.')
            return { success: true, message: '알림톡 설정 대기 중' }
        }

        // 신청 타입별 템플릿 ID 매핑
        const templateIdMap: Record<string, string | undefined> = {
            'blog-reporter': process.env.SOLAPI_TEMPLATE_BLOG_REPORTER_COMPLETED,
            'blog_reporter': process.env.SOLAPI_TEMPLATE_BLOG_REPORTER_COMPLETED,
            'blog-experience': process.env.SOLAPI_TEMPLATE_BLOG_EXPERIENCE_COMPLETED,
            'blog_experience': process.env.SOLAPI_TEMPLATE_BLOG_EXPERIENCE_COMPLETED,
            'instagram-popular': process.env.SOLAPI_TEMPLATE_INSTAGRAM_COMPLETED,
            'instagram_popular': process.env.SOLAPI_TEMPLATE_INSTAGRAM_COMPLETED,
        }

        // 타입별 템플릿 ID 또는 기본 완료 템플릿 ID 사용
        const templateId = templateIdMap[params.applicationType] || process.env.SOLAPI_TEMPLATE_APPLICATION_COMPLETED

        if (!templateId) {
            console.warn('템플릿 ID가 설정되지 않았습니다.')
            return { success: true, message: '템플릿 설정 대기 중' }
        }

        const formattedPhone = params.recipientPhone.replace(/[^0-9]/g, '')

        // 솔루션 이름 매핑
        const solutionNameMap: Record<string, string> = {
            'blog-reporter': '블로그 기자단',
            'blog_reporter': '블로그 기자단',
            'blog-experience': '블로그 체험단',
            'blog_experience': '블로그 체험단',
            'instagram-popular': '인스타그램 인기게시물',
            'instagram_popular': '인스타그램 인기게시물',
            'seo-optimization': 'SEO최적화작업',
            'seo_optimization': 'SEO최적화작업',
            'photo-shooting': '사진촬영',
            'photo_shooting': '사진촬영',
            'etc': '기타',
        }

        // 템플릿 변수 설정
        const variables: Record<string, string> = {
            SolutionName1: solutionNameMap[params.applicationType] || params.applicationType
        }

        // 블로그 기자단의 경우 Quantity1 변수 추가
        if ((params.applicationType === 'blog-reporter' || params.applicationType === 'blog_reporter') && params.blogCount) {
            variables.Quantity1 = params.blogCount.toString()
        }

        const message: SolapiKakaoMessage = {
            to: formattedPhone,
            kakaoOptions: {
                pfId,
                templateId,
                variables
            }
        }

        await sendSolapiMessage(message, apiKey, apiSecret)
        console.log('완료 알림톡 발송 성공:', solutionNameMap[params.applicationType])

        return { success: true, message: '알림톡이 발송되었습니다.' }
    } catch (error) {
        console.error('알림톡 발송 실패:', error)
        return { success: false, error: '알림톡 발송에 실패했습니다.' }
    }
}

/**
 * Solapi API 호출 헬퍼 함수
 */
async function sendSolapiMessage(
    message: SolapiKakaoMessage,
    apiKey: string,
    apiSecret: string
) {
    const crypto = require('crypto')

    // HMAC-SHA256 인증 생성
    const date = new Date().toISOString()
    const salt = Math.random().toString(36).substring(2, 15)
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(date + salt)
        .digest('hex')

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `hmac-sha256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
        },
        body: JSON.stringify({
            message: {
                ...message,
                type: 'ATA' // 알림톡
            }
        })
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Solapi API 호출 실패: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    return await response.json()
}

/**
 * 사용자의 최초 신청 여부 확인
 */
export async function isFirstApplication(userId: string): Promise<boolean> {
    try {
        const supabase = await createClient()

        const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        return (count || 0) === 0
    } catch (error) {
        console.error('최초 신청 확인 실패:', error)
        return false
    }
}
