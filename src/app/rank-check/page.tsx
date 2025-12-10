'use client'

import { useState } from 'react'
import { Search, MapPin, Loader2, ArrowLeft, Info, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { checkRank } from '../actions/rank'

export default function RankCheckPage() {
    const [keyword, setKeyword] = useState('')
    const [placeName, setPlaceName] = useState('')
    const [isChecking, setIsChecking] = useState(false)
    const [result, setResult] = useState<{ message: string, success?: boolean, rank?: number, page?: number } | null>(null)

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!keyword || !placeName) return

        setIsChecking(true)
        setResult(null)

        try {
            const data = await checkRank(keyword, placeName)
            if (data.error) {
                setResult({ message: data.error, success: false })
            } else {
                setResult({
                    message: data.message!,
                    success: data.success,
                    rank: data.rank,
                    page: data.page
                })
            }
        } catch (error) {
            console.error(error)
            setResult({ message: '알 수 없는 오류가 발생했습니다.', success: false })
        } finally {
            setIsChecking(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto space-y-8">
                {/* Header */}
                <div className="text-center relative">
                    <Link href="/" className="absolute left-0 top-1 text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h2 className="text-3xl font-bold text-gray-900">순위 조회</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        네이버 플레이스 실시간 순위를 조회합니다.
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white py-8 px-6 shadow rounded-lg border border-gray-100">
                    <form className="space-y-6" onSubmit={handleCheck}>
                        <div>
                            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
                                검색 키워드
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="keyword"
                                    required
                                    className="input-field pl-10 block w-full sm:text-sm"
                                    placeholder="예: 강남 맛집"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="placeName" className="block text-sm font-medium text-gray-700">
                                업체명 (플레이스명)
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="placeName"
                                    required
                                    className="input-field pl-10 block w-full sm:text-sm"
                                    placeholder="예: 맛있는 식당"
                                    value={placeName}
                                    onChange={(e) => setPlaceName(e.target.value)}
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                <span>네이버 지도에 등록된 정확한 업체명을 입력해주세요.</span>
                            </p>
                        </div>

                        <div className="rounded-md bg-blue-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">조회 시 주의사항</h3>
                                    <div className="mt-2 text-sm text-blue-700">
                                        <ul role="list" className="list-disc pl-5 space-y-1">
                                            <li>실시간 브라우저 점검으로 시간이 다소 소요될 수 있습니다. (최대 1~2분)</li>
                                            <li>1페이지부터 목록 끝까지 자동으로 탐색합니다.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isChecking}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isChecking ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        순위 확인 중...
                                    </>
                                ) : (
                                    '조회하기'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Result */}
                    {result && (
                        <div className={`mt-6 rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    {result.success ? (
                                        <MapPin className="h-5 w-5 text-green-400" aria-hidden="true" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    )}
                                </div>
                                <div className="ml-3">
                                    <h3 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.success ? '조회 성공' : '조회 실패'}
                                    </h3>
                                    <div className={`mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                        <p>{result.message}</p>
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
