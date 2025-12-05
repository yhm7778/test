'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/types/supabase'

type StaffRequestInsert = Database['public']['Tables']['staff_requests']['Insert']

export default function StaffApplyPage() {
    const [formData, setFormData] = useState({ email: '', name: '' })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        try {
            // Check if user is logged in
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                setMessage({ type: 'error', text: '로그인이 필요합니다.' })
                router.push('/login?redirect=/staff-apply')
                return
            }

            // Get user email if not provided
            const email = formData.email || user.email || ''

            // Create staff request
            const payload: StaffRequestInsert = {
                email,
                name: formData.name || null,
                status: 'pending',
            }

            const { error } = await supabase
                .from('staff_requests')
                .insert([payload])

            if (error) {
                if (error.code === '23505') { // Duplicate key
                    setMessage({ type: 'error', text: '이미 신청하신 내역이 있습니다.' })
                } else if (error.code === '42P01') { // Table doesn't exist
                    setMessage({ type: 'error', text: '직원 신청 기능이 아직 준비되지 않았습니다.' })
                } else {
                    throw error
                }
            } else {
                setMessage({ type: 'success', text: '직원 신청이 완료되었습니다. 관리자 승인을 기다려주세요.' })
                setFormData({ email: '', name: '' })
            }
        } catch (error: unknown) {
            console.error('Error submitting staff request:', error)
            const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
            setMessage({ type: 'error', text: '신청 중 오류가 발생했습니다: ' + message })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>홈으로</span>
                </Link>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 shadow-2xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">직원 신청</h1>
                        <p className="text-gray-400">직원 계정 신청을 위해 아래 정보를 입력해주세요.</p>
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-lg ${
                            message.type === 'success' 
                                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                                : 'bg-red-500/20 border border-red-500/30 text-red-300'
                        }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <Mail className="h-4 w-4 inline mr-2" />
                                이메일
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="your@email.com"
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <User className="h-4 w-4 inline mr-2" />
                                이름 (선택사항)
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="이름"
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '신청 중...' : '직원 신청하기'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

