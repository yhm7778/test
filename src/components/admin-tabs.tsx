'use client'

import { useState } from 'react'
import { Database } from '@/types/supabase'
import ApplicationList from './application-list'
import MenuManager from './menu-manager'
import StaffManager from './staff-manager'
import { FileText, Menu, Users } from 'lucide-react'

type Application = Database['public']['Tables']['applications']['Row']

interface AdminTabsProps {
    initialApplications: Application[]
    isAdmin: boolean
}

export default function AdminTabs({ initialApplications, isAdmin }: AdminTabsProps) {
    const [activeTab, setActiveTab] = useState<'applications' | 'menu' | 'staff'>('applications')

    const tabs = [
        { id: 'applications' as const, label: '신청 내역', icon: FileText },
        ...(isAdmin ? [
            { id: 'menu' as const, label: '메뉴 관리', icon: Menu },
            { id: 'staff' as const, label: '직원 관리', icon: Users },
        ] : []),
    ]

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 -mx-4 sm:mx-0">
                <div className="overflow-x-auto px-4 sm:px-0">
                    <nav className="flex min-w-max gap-2 pb-1" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-5 sm:px-6 py-3.5 text-sm font-semibold rounded-t-xl transition-all relative whitespace-nowrap flex-shrink-0
                                        ${
                                            activeTab === tab.id
                                                ? 'text-gray-900 bg-gradient-to-b from-gray-50 to-white'
                                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-t-full"></div>
                                    )}
                                    <Icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'}`} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-8">
                {activeTab === 'applications' && (
                    <ApplicationList initialApplications={initialApplications} isAdmin={true} />
                )}
                {activeTab === 'menu' && isAdmin && <MenuManager />}
                {activeTab === 'staff' && isAdmin && <StaffManager />}
            </div>
        </div>
    )
}

