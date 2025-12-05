import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ApplicationForm from '@/components/application-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ApplyPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?redirect=/apply')
    }

    return (
        <div className="py-8 animate-slide-up">
            <ApplicationForm />
        </div>
    )
}
