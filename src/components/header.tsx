'use client'

import Link from 'next/link'
import { useAuth } from './auth-provider'
import { LogOut, User, Shield, Menu, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
    const { user, profile, session, signOut, isSigningOut, isLoading } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const normalizeRole = (role: unknown): 'admin' | 'staff' | 'client' | undefined => {
        if (typeof role !== 'string') return undefined
        const value = role.trim().toLowerCase()
        if (value === 'admin' || value === 'staff' || value === 'client') return value
        return undefined
    }
    const userRole =
        normalizeRole(profile?.role) ||
        normalizeRole(session?.user?.user_metadata?.role) ||
        normalizeRole(session?.user?.app_metadata?.role) ||
        (Array.isArray(session?.user?.app_metadata?.roles)
            ? normalizeRole(session?.user?.app_metadata?.roles[0])
            : undefined)
    // Allow showing admin/staff button as soon as role is known from profile or metadata,
    // even while profile loading is in progress, to avoid flicker.
    const canAccessAdmin = userRole === 'admin' || userRole === 'staff'

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white">
            <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center space-x-2">
                    <span className="font-bold text-xl text-gray-900">Vision Marketing</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-3">
                    {user ? (
                        <>
                            {canAccessAdmin && (
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                                >
                                    <Shield className="h-4 w-4" />
                                    <span>관리자</span>
                                </Link>
                            )}
                            <Link
                                href="/apply"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                            >
                                <span>신청하기</span>
                            </Link>
                            <Link
                                href="/my"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50"
                            >
                                <User className="h-4 w-4" />
                                <span>내 신청</span>
                            </Link>
                            <button
                                onClick={signOut}
                                disabled={isSigningOut}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSigningOut ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>로그아웃 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-4 w-4" />
                                        <span>로그아웃</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/apply"
                                className="px-4 py-1.5 rounded bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                            >
                                신청하기
                            </Link>
                            <Link
                                href="/login"
                                className="px-4 py-1.5 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50"
                            >
                                로그인
                            </Link>
                        </>
                    )}
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden border-t bg-white p-4 space-y-3">
                    {user ? (
                        <>
                            {canAccessAdmin && (
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-2 px-4 py-3 rounded bg-gray-900 text-white font-medium"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Shield className="h-5 w-5" />
                                    관리자 페이지
                                </Link>
                            )}
                            <Link
                                href="/apply"
                                className="flex items-center gap-2 px-4 py-3 rounded bg-gray-900 text-white font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                신청하기
                            </Link>
                            <Link
                                href="/my"
                                className="flex items-center gap-2 px-4 py-3 rounded border border-gray-200 font-medium hover:bg-gray-50"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <User className="h-5 w-5" />
                                내 신청 내역
                            </Link>
                            <button
                                onClick={async () => {
                                    if (isSigningOut) return
                                    await signOut()
                                    setIsMenuOpen(false)
                                }}
                                disabled={isSigningOut}
                                className="flex w-full items-center gap-2 px-4 py-3 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSigningOut ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        로그아웃 중...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-5 w-5" />
                                        로그아웃
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/apply"
                                className="block w-full text-center px-4 py-3 rounded bg-gray-900 text-white font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                신청하기
                            </Link>
                            <Link
                                href="/login"
                                className="block w-full text-center px-4 py-3 rounded border border-gray-300 font-medium hover:bg-gray-50"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                로그인
                            </Link>
                        </>
                    )}
                </div>
            )}
        </header>
    )
}
