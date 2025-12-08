'use client'

import { useState } from 'react'
import { Search, MapPin, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RankCheckPage() {
    const [keyword, setKeyword] = useState('')
    const [placeName, setPlaceName] = useState('')
    const [isChecking, setIsChecking] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!keyword || !placeName) return

        setIsChecking(true)
        setResult(null)

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Mock result for now
        // In a real implementation, this would call a server action or API route
        const mockRank = Math.floor(Math.random() * 50) + 1
        setResult(`현재 "${keyword}" 키워드에서 "${placeName}"의 순위는 ${mockRank}위 입니다.`)
        
        setIsChecking(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        메인으로 돌아가기
                    </Link>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <MapPin className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">플레이스 순위 조회</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        내 가게가 현재 몇 위에 노출되고 있는지 확인해보세요.
                    </p>
                </div>

                <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleCheck}>
                        <div>
                            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
                                검색 키워드
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <input
                                    id="keyword"
                                    name="keyword"
                                    type="text"
                                    required
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    className="input-field block w-full pl-10 sm:text-sm border-gray-300 rounded-xl"
                                    placeholder="예: 강남 맛집"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="placeName" className="block text-sm font-medium text-gray-700">
                                업체명 (플레이스명)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="placeName"
                                    name="placeName"
                                    type="text"
                                    required
                                    value={placeName}
                                    onChange={(e) => setPlaceName(e.target.value)}
                                    className="input-field block w-full sm:text-sm border-gray-300 rounded-xl"
                                    placeholder="예: 마케팅식당"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isChecking}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                            >
                                {isChecking ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        조회 중...
                                    </>
                                ) : (
                                    '순위 확인하기'
                                )}
                            </button>
                        </div>
                    </form>

                    {result && (
                        <div className="mt-6 rounded-xl bg-blue-50 p-4 border border-blue-100 animate-fade-in">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <MapPin className="h-5 w-5 text-blue-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">조회 결과</h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <p>{result}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
