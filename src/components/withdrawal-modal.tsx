'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle } from 'lucide-react'

interface WithdrawalModalProps {
    email: string
}

export default function WithdrawalModal({ email }: WithdrawalModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState<'confirm' | 'password'>('confirm')
    const supabase = createClient()
    const router = useRouter()

    const handleWithdraw = async () => {
        if (!password) {
            alert('비밀번호를 입력해주세요.')
            return
        }

        setIsLoading(true)
        try {
            // 1. Verify password by signing in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (signInError) {
                alert('비밀번호가 일치하지 않습니다.')
                setIsLoading(false)
                return
            }

            // 2. Call API to schedule deletion
            const response = await fetch('/api/auth/withdraw', {
                method: 'POST',
            })

            if (!response.ok) {
                throw new Error('Withdrawal failed')
            }

            alert('탈퇴 처리가 완료되었습니다.\n7일 후 계정이 완전히 삭제됩니다.\n언제든지 로그인하여 탈퇴를 취소할 수 있습니다.')
            
            // 3. Logout
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()

        } catch (error) {
            console.error('Withdrawal error:', error)
            alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="text-sm text-gray-400 hover:text-red-500 underline transition-colors"
            >
                회원 탈퇴
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-6 w-6" />
                    <h2 className="text-xl font-bold">회원 탈퇴</h2>
                </div>

                {step === 'confirm' ? (
                    <div className="space-y-4">
                        <div className="text-gray-600 space-y-2">
                            <p>정말로 탈퇴하시겠습니까?</p>
                            <ul className="list-disc list-inside text-sm bg-red-50 p-3 rounded-md text-red-700">
                                <li>탈퇴 신청 후 <strong>7일간 유예 기간</strong>이 주어집니다.</li>
                                <li>7일 후 계정과 모든 데이터(신청서, 사진 등)가 <strong>영구 삭제</strong>됩니다.</li>
                                <li>유예 기간 내에 로그인하시면 탈퇴를 취소할 수 있습니다.</li>
                            </ul>
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => setStep('password')}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md"
                            >
                                계속 진행
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-gray-600">
                            본인 확인을 위해 비밀번호를 입력해주세요.
                        </p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호 입력"
                            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                onClick={() => {
                                    setStep('confirm')
                                    setPassword('')
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                disabled={isLoading}
                            >
                                뒤로
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={isLoading || !password}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md flex items-center gap-2"
                            >
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                탈퇴하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
