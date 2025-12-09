import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

// Only run this with Service Role Key
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function GET(request: Request) {
    // Basic auth check (e.g. Bearer token or just rely on Vercel Cron header if needed)
    // For now, we assume it's protected by environment or obscurity, or we can add a simple key check.
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Optional: Check for CRON_SECRET if you set it up
        // return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        // 1. Find expired accounts
        const now = new Date().toISOString()
        const { data: expiredProfiles, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, username')
            .lt('scheduled_deletion_at', now)

        if (fetchError) throw fetchError
        if (!expiredProfiles || expiredProfiles.length === 0) {
            return NextResponse.json({ message: 'No accounts to delete' })
        }

        console.log(`Found ${expiredProfiles.length} accounts to delete`)

        const results = []

        for (const profile of expiredProfiles) {
            try {
                // 2. Cleanup Storage (Optional but recommended)
                // We need to find all applications for this user to get photo paths
                const { data: apps } = await supabaseAdmin
                    .from('applications')
                    .select('photo_urls')
                    .eq('user_id', profile.id)

                if (apps && apps.length > 0) {
                    const allUrls = apps.flatMap(app => app.photo_urls || [])
                    if (allUrls.length > 0) {
                        // Extract paths from URLs
                        // URL format: .../storage/v1/object/public/applications/path/to/file
                        const paths = allUrls.map(url => {
                            try {
                                const urlObj = new URL(url)
                                const pathParts = urlObj.pathname.split('/applications/')
                                if (pathParts.length > 1) return pathParts[1]
                                return null
                            } catch {
                                return null
                            }
                        }).filter((p): p is string => p !== null)

                        if (paths.length > 0) {
                            await supabaseAdmin.storage
                                .from('applications')
                                .remove(paths)
                        }
                    }
                }

                // 3. Delete Auth User (This should CASCADE delete profile and applications if configured)
                // If not cascading, we should delete profile manually.
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.id)
                
                if (deleteError) {
                    // Fallback: Delete profile manually if Auth delete fails or if it doesn't cascade
                    console.error(`Failed to delete auth user ${profile.id}:`, deleteError)
                    await supabaseAdmin.from('profiles').delete().eq('id', profile.id)
                }

                results.push({ id: profile.id, status: 'deleted' })
                console.log(`Deleted account: ${profile.id} (${profile.username})`)

            } catch (err) {
                console.error(`Failed to cleanup account ${profile.id}:`, err)
                results.push({ id: profile.id, status: 'error', error: err })
            }
        }

        return NextResponse.json({ 
            message: 'Cleanup completed', 
            results 
        })

    } catch (error) {
        console.error('Cleanup cron error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
