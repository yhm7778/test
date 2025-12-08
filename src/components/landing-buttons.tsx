'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Database } from '@/types/supabase'
import { FileText, Instagram, MapPin, MoreHorizontal, User, ExternalLink, ArrowRight } from 'lucide-react'

type MenuItem = Database['public']['Tables']['menu_items']['Row']

export default function LandingButtons() {
    const { user, isLoading } = useAuth()
    const [customMenus, setCustomMenus] = useState<MenuItem[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchMenus = async () => {
            const { data } = await supabase
                .from('menu_items')
                .select('*')
                .order('order', { ascending: true })
            
            if (data) {
                setCustomMenus(data as MenuItem[])
            }
        }
        fetchMenus()
    }, [supabase])

    if (isLoading) {
        return <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
    }

    // 기본 메뉴 정의
    const defaultMenus = [
        { 
            label: '블로그 기자단 포스팅', 
            href: '/apply?type=blog-reporter', 
            icon: FileText,
            desc: '전문 기자가 작성하는 고품질 리뷰'
        },
        { 
            label: '블로그 체험단 포스팅', 
            href: '/apply?type=blog-experience', 
            icon: User,
            desc: '실제 체험을 바탕으로 한 생생한 후기'
        },
        { 
            label: '인스타그램 인기게시물 포스팅', 
            href: '/apply?type=instagram-popular', 
            icon: Instagram,
            desc: '인기 게시물 노출을 통한 홍보 효과'
        },
        { 
            label: '플레이스 순위 조회하기', 
            href: '/rank-check', 
            icon: MapPin,
            desc: '내 가게의 현재 순위를 실시간 조회'
        },
        { 
            label: '기타사항 포스팅', 
            href: '/apply?type=etc', 
            icon: MoreHorizontal,
            desc: '그 외 다양한 마케팅 문의'
        },
    ]

    return (
        <div className="flex flex-col gap-4 w-full max-w-md mx-auto pt-4">
            {/* 기본 메뉴 */}
            {defaultMenus.map((menu, index) => (
                <Link
                    key={index}
                    href={user ? menu.href : '/login'}
                    className="group relative flex items-center p-5 bg-white rounded-xl border-2 border-transparent shadow-sm hover:shadow-md hover:border-gray-900 transition-all duration-200"
                >
                    <div className="flex-shrink-0 mr-4 p-3 bg-gray-50 rounded-full group-hover:bg-gray-900 transition-colors">
                        <menu.icon className="w-6 h-6 text-gray-900 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-900">{menu.label}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{menu.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transform group-hover:translate-x-1 transition-all" />
                </Link>
            ))}

            {/* 내 신청 내역 (항상 표시, 비로그인 시 로그인 페이지로) */}
            <Link
                href={user ? "/my" : "/login"}
                className="group relative flex items-center p-5 bg-white rounded-xl border-2 border-transparent shadow-sm hover:shadow-md hover:border-gray-900 transition-all duration-200"
            >
                <div className="flex-shrink-0 mr-4 p-3 bg-gray-50 rounded-full group-hover:bg-gray-900 transition-colors">
                    <FileText className="w-6 h-6 text-gray-900 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-900">내 신청 내역</h3>
                    <p className="text-sm text-gray-500 mt-0.5">내가 신청한 마케팅 내역 확인</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transform group-hover:translate-x-1 transition-all" />
            </Link>

            {/* 사용자 정의 추가 메뉴 */}
            {customMenus.map((menu) => (
                <Link
                    key={menu.id}
                    href={menu.href}
                    target="_blank"
                    className="group relative flex items-center p-5 bg-white rounded-xl border-2 border-transparent shadow-sm hover:shadow-md hover:border-gray-900 transition-all duration-200"
                >
                    <div className="flex-shrink-0 mr-4 p-3 bg-gray-50 rounded-full group-hover:bg-gray-900 transition-colors">
                        <ExternalLink className="w-6 h-6 text-gray-900 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-gray-900">{menu.label}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">외부 링크로 이동합니다</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transform group-hover:translate-x-1 transition-all" />
                </Link>
            ))}

            {/* 로그인/로그아웃 버튼은 상단 헤더에 있으므로 여기서는 제거하거나 하단에 작게 배치 */}
        </div>
    )
}
