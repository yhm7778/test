import { createClient } from '@/utils/supabase/server'
import { generateZip } from '@/services/zip-service'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

type ApplicationRow = Database['public']['Tables']['applications']['Row']

export async function GET() {
    // Verify cron secret if needed (Vercel Cron uses Authorization header)
    // if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 })
    // }

    const supabase = await createClient() as SupabaseClient<Database>

    // Fetch yesterday's applications
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

    const typedApplications = (applications ?? []) as ApplicationRow[]

    if (typedApplications.length === 0) {
        return NextResponse.json({ message: 'No applications yesterday' })
    }

    try {
        const zipBlob = await generateZip(typedApplications)
        const buffer = Buffer.from(await zipBlob.arrayBuffer())

        // Upload to Supabase Storage
        const fileName = `daily_zips/${yesterday.toISOString().split('T')[0]}.zip`
        const { error: uploadError } = await supabase.storage
            .from('applications') // Or a separate bucket
            .upload(fileName, buffer, {
                contentType: 'application/zip',
                upsert: true
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('applications')
            .getPublicUrl(fileName)

        // Send Email
        // Note: Resend Free tier might have limits or require domain verification
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Marketing App <onboarding@resend.dev>', // Use verified domain in prod
                to: ['admin@example.com'], // Replace with actual admin email
                subject: `[Daily Report] ${yesterday.toISOString().split('T')[0]} Applications`,
                html: `<p>Yesterday's applications are ready.</p><p><a href="${publicUrl}">Download ZIP</a></p>`,
            })
        }

        return NextResponse.json({ success: true, url: publicUrl })
    } catch (error) {
        console.error('Daily ZIP error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
