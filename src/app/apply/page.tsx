import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationForm from '@/components/application-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ApplyPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { type } = await searchParams

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?redirect=/apply${type ? `?type=${type}` : ''}`)
    }

    return (
        <div className="py-8 animate-slide-up">
            <ApplicationForm type={type as string} />
        </div>
    )
}
