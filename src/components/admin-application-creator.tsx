'use client'

import { useState, useEffect } from 'react'
import { getClients } from '@/app/actions/admin'
import ApplicationForm from './application-form'
import { Loader2, User } from 'lucide-react'

export default function AdminApplicationCreator() {
    const [users, setUsers] = useState<{ id: string, username: string | null, email: string | null, role: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUserId, setSelectedUserId] = useState('')
    const [selectedType, setSelectedType] = useState('blog-reporter')

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await getClients()
            if (data) {
                // 타입 단언을 통해 Supabase 반환 타입을 컴포넌트 상태 타입과 일치시킵니다.
                setUsers(data as unknown as { id: string, username: string | null, email: string | null, role: string }[])
            } else {
                console.error(error)
            }
            setLoading(false)
        }
        fetchUsers()
    }, [])

    const applicationTypes = [
        { id: 'blog-reporter', label: '블로그 기자단' },
        { id: 'blog-experience', label: '블로그 체험단' },
        { id: 'instagram-popular', label: '인스타그램 인기게시물' },
        { id: 'seo-optimization', label: 'SEO 최적화작업' },
        { id: 'photo-shooting', label: '사진촬영' },
        { id: 'etc', label: '기타' },
    ]

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-gray-500" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    신청서 대리 작성
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            고객 선택
                        </label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="input-field"
                        >
                            <option value="">고객을 선택해주세요</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.username || user.email} ({user.role === 'client' ? '일반' : user.role === 'admin' ? '관리자' : user.role === 'staff' ? '직원' : user.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            신청 유형
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="input-field"
                        >
                            {applicationTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedUserId && (
                    <div className="border-t border-gray-100 pt-6">
                        <ApplicationForm 
                            type={selectedType} 
                            targetUserId={selectedUserId} 
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
