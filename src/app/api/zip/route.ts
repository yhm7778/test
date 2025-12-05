import { createClient } from '@/utils/supabase/server'
import { generateZip } from '@/services/zip-service'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ApplicationRow = Database['public']['Tables']['applications']['Row']

export async function GET() {
    const supabase = await createClient() as SupabaseClient<Database>

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq<'id'>('id', user.id as ProfileRow['id'])
        .maybeSingle<{ role: ProfileRow['role'] }>()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    // Fetch all applications
    const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
    const typedApplications = (applications ?? []) as ApplicationRow[]

    if (typedApplications.length === 0) {
        return new NextResponse('No applications found', { status: 404 })
    }

    try {
        const zipBlob = await generateZip(typedApplications)
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
