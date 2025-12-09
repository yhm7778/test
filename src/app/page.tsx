import LandingButtons from '@/components/landing-buttons'

export const dynamic = 'force-dynamic'

export default function Home() {

  return (
    // Removed flex-1 and min-h hacks that cause layout shifts
    // Using simple flex column for centering content within the standard container
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 animate-slide-up">
      <div className="w-full max-w-3xl mx-auto text-center space-y-10">
        <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight break-keep leading-tight">
            비전온라인마케팅
            </h1>
        </div>

        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto break-keep">
          네이버 플레이스 최적화 부터 광고 리포트까지<br className="hidden sm:block" />
          전문가의 손길로 비즈니스를 성장시킵니다
        </p>

        <LandingButtons />
      </div>
    </div>
  )
}
