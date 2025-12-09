'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-provider'
import { Loader2, Clock, LogOut, RefreshCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AccountRecoveryModal() {
    const { profile, signOut } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    
    // Don't render anything if no profile or no scheduled deletion
    if (!profile?.scheduled_deletion_at) {
        return null
    }

    const deletionDate = new Date(profile.scheduled_deletion_at)
    const now = new Date()
    const diffTime = deletionDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const handleRestore = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/restore', {
                method: 'POST',
            })

            if (!response.ok) {
                throw new Error('Restore failed')
            }

            // Force hard reload to refresh profile/session
            window.location.reload()
        } catch (error) {
            console.error('Restore error:', error)
            alert('오류가 발생했습니다. 다시 시도해주세요.')
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        setIsLoading(true)
        await signOut()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-md w-full p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <Clock className="h-8 w-8 text-red-600" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900">
                        계정 삭제 대기 중
                    </h2>
                    
                    <div className="space-y-2 text-gray-600">
                        <p>
                            현재 계정 삭제가 진행 중입니다.<br/>
                            완전 삭제까지 <span className="text-red-600 font-bold">{diffDays}일</span> 남았습니다.
                        </p>
                        <p className="text-sm bg-gray-50 p-3 rounded-lg">
                            삭제 예정일: {deletionDate.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <button
                        onClick={handleRestore}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCcw className="h-5 w-5" />}
                        계정 삭제 중단 (복구하기)
                    </button>
                    
                    <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                        삭제 계속 진행 (로그아웃)
                    </button>
                </div>
            </div>
        </div>
    )
}
