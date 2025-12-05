'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
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
        if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
        if (message.includes('Email not confirmed')) return '이메일 인증이 완료되지 않았습니다.'
        if (message.includes('User already registered')) return '이미 가입된 이메일입니다.'
        if (message.includes('Anonymous sign-ins are disabled')) return '익명 로그인이 비활성화되어 있습니다.'
        if (message.includes('Password should be at least 6 characters')) return '비밀번호는 6자 이상이어야 합니다.'
        if (message.includes('Rate limit exceeded')) return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
        return '오류가 발생했습니다. 다시 시도해주세요.'
    }

    const [isSignUpSuccess, setIsSignUpSuccess] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Use router for navigation instead of hard reload
            router.refresh()
            router.replace('/')
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
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'client', // Default role
                    },
                },
            })

            if (error) throw error

            setIsSignUpSuccess(true)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            setError(getKoreanErrorMessage(message))
        } finally {
            setIsLoading(false)
        }
    }

    if (isSignUpSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 animate-slide-up">
                <div className="w-full max-w-md mx-auto space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-200 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">이메일을 확인해주세요</h2>
                    <p className="text-gray-600 break-keep">
                        <strong>{email}</strong> 주소로 인증 메일을 발송했습니다.<br />
                        메일함에서 인증 링크를 클릭하시면 회원가입이 완료됩니다.
                    </p>
                    <button
                        onClick={() => setIsSignUpSuccess(false)}
                        className="btn-secondary w-full"
                    >
                        로그인 화면으로 돌아가기
                    </button>
                </div>
            </div>
        )
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
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                이메일
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="name@example.com"
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
                        <button
                            type="button"
                            onClick={handleSignUp}
                            disabled={isLoading}
                            className="btn-secondary w-full"
                        >
                            회원가입
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
