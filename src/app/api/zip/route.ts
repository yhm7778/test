import { createClient } from '@/utils/supabase/server'
import { generateZip } from '@/services/zip-service'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ApplicationRow = Database['public']['Tables']['applications']['Row']

export async function POST(request: Request) {
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

    try {
        const { ids } = await request.json()
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return new NextResponse('No IDs provided', { status: 400 })
        }

        // Fetch selected applications
        const { data: applications } = await supabase
            .from('applications')
            .select('*')
            .in('id', ids)
            .order('created_at', { ascending: false })
            
        const typedApplications = (applications ?? []) as ApplicationRow[]

        if (typedApplications.length === 0) {
            return new NextResponse('No applications found', { status: 404 })
        }

        const zipBlob = await generateZip(typedApplications)
        const buffer = Buffer.from(await zipBlob.arrayBuffer())

        let filename = `Marketing_Applications_${new Date().toISOString().split('T')[0]}.zip`
        
        if (typedApplications.length === 1) {
             const app = typedApplications[0]
             const getSolutionName = (type: string | null) => {
                switch(type) {
                    case 'blog-reporter': return '기자단'
                    case 'blog-experience': return '체험단'
                    case 'instagram-popular': return '인스타그램'
                    case 'seo-optimization': return 'SEO'
                    case 'photo-shooting': return '촬영'
                    default: return '마케팅'
                }
            }
            const solutionName = getSolutionName(app.marketing_type)
            const dateStr = new Date(app.created_at).toISOString().split('T')[0]
            const blogCountMatch = app.notes?.match(/블로그 리뷰 갯수:\s*(\d+)개/)
            const blogCount = blogCountMatch ? parseInt(blogCountMatch[1], 10) : 1
            
            const safeName = `${solutionName}_${app.store_name}_${dateStr}_${blogCount}개`.replace(/[\/\\:*?"<>|]/g, '_')
            filename = `${safeName}.zip`
        } else {
            filename = `Marketing_Applications_${new Date().toISOString().split('T')[0]}_${typedApplications.length}건.zip`
        }

        // Use encodeURIComponent for safe non-ASCII filenames
        const encodedFilename = encodeURIComponent(filename)

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
            },
        })
    } catch (error) {
        console.error('ZIP generation error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

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
