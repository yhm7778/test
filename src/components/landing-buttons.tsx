'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'

export default function LandingButtons() {
    const { user, profile, isLoading } = useAuth()

    if (isLoading) {
        return null
    }

    // 클라이언트 계정이거나 로그인하지 않은 경우 신청하기 버튼 표시
    const showApplyButton = !user || profile?.role === 'client'

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 w-full sm:w-auto mx-auto">
            {showApplyButton && (
                <Link
                    href="/apply"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gray-900 text-white text-lg font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10"
                >
                    지금 신청하기
                </Link>
            )}
            {user && (
                <Link
                    href="/my"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg border-2 border-gray-200 text-gray-900 text-lg font-semibold hover:border-gray-900 hover:bg-gray-50 transition-all"
                >
                    내 신청 내역
                </Link>
            )}
            {!user && (
                <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg border-2 border-gray-200 text-gray-900 text-lg font-semibold hover:border-gray-900 hover:bg-gray-50 transition-all"
                >
                    로그인
                </Link>
            )}
        </div>
    )
}
