import { createClient } from '@/utils/supabase/server'
import { generateZip } from '@/services/zip-service'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: 'admin' | 'staff' | 'client' } | null }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    // Fetch all applications
    const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

    if (!applications || applications.length === 0) {
        return new NextResponse('No applications found', { status: 404 })
    }

    try {
        const zipBlob = await generateZip(applications)
        const buffer = Buffer.from(await zipBlob.arrayBuffer())

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="applications_${new Date().toISOString().split('T')[0]}.zip"`,
            },
        })
    } catch (error) {
        console.error('ZIP generation error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
