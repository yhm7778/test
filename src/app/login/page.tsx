'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

import { signIn, signUp } from '@/app/actions/auth'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    // Redirect if already logged in
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.replace('/')
            }
        }
        checkUser()
    }, [router, supabase])

    const getKoreanErrorMessage = (message: string) => {
        if (/[가-힣]/.test(message)) return message
        if (message.includes('Invalid login credentials')) return '아이디 또는 비밀번호가 올바르지 않습니다.'
        if (message.includes('Email not confirmed')) return '계정 승인이 완료되지 않았습니다.'
        if (message.includes('User already registered')) return '이미 존재하는 아이디입니다.'
        if (message.includes('Anonymous sign-ins are disabled')) return '익명 로그인이 비활성화되어 있습니다.'
        if (message.includes('Password should be at least 6 characters')) return '비밀번호는 6자 이상이어야 합니다.'
        if (message.includes('Rate limit exceeded')) return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
        return '오류가 발생했습니다. 다시 시도해주세요.'
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn(username, password)
            if (result.error) throw new Error(result.error)

            // Use hard navigation to ensure fresh state and cookies are applied immediately
            // This is faster and more reliable than router.refresh() + replace() for auth state changes
            window.location.href = '/'
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            setError(getKoreanErrorMessage(message))
            setIsLoading(false) // Ensure loading state is reset on error
        }
        // Removed finally block to prevent flickering if redirecting
    }

    const handleSignUp = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signUp(username, password)
            if (result.error) throw new Error(result.error)

            alert('회원가입이 완료되었습니다.')

            // Use hard navigation for immediate state update
            window.location.href = '/'
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            setError(getKoreanErrorMessage(message))
            setIsLoading(false)
        }
    }

    return (
        // Standardized centering container
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 animate-slide-up">
            <div className="w-full max-w-md mx-auto space-y-8 p-6 sm:p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">로그인</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        서비스 이용을 위해 로그인해주세요.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                아이디
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-field"
                                placeholder="아이디를 입력하세요"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                비밀번호
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-sm text-red-600 rounded-md text-center break-keep">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex justify-center items-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : '로그인'}
                        </button>
                        <a
                            href="http://pf.kakao.com/_BnWWG"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary w-full text-center"
                        >
                            문의하기
                        </a>
                    </div>
                </form>
            </div>
        </div>
    )
}
