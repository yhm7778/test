import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

        // Find applications completed > 30 days ago and not cleaned
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { data: apps, error } = await supabaseAdmin
            .from('applications')
            .select('id, photo_urls')
            .eq('status', 'completed')
            .eq('files_deleted', false)
            .lt('completion_date', thirtyDaysAgo.toISOString())
            .limit(50) // Process in batches

        if (error) throw error

        if (!apps || apps.length === 0) {
            return NextResponse.json({ message: 'No applications to cleanup', count: 0 })
        }

        let deletedCount = 0

        for (const app of apps) {
            if (app.photo_urls && app.photo_urls.length > 0) {
                // Extract paths from URLs
                // URL format: https://[project].supabase.co/storage/v1/object/public/applications/[path]
                const paths = app.photo_urls.map(url => {
                    try {
                        // Simple split by bucket name
                        const parts = url.split('/applications/')
                        if (parts.length === 2) {
                            return parts[1] // Return the path after bucket name
                        }
                        return null
                    } catch {
                        console.error('Error parsing URL:', url)
                        return null
                    }
                }).filter((p): p is string => p !== null)
                
                if (paths.length > 0) {
                    const { error: removeError } = await supabaseAdmin.storage
                        .from('applications')
                        .remove(paths)
                    
                    if (removeError) {
                        console.error(`Failed to remove files for app ${app.id}:`, removeError)
                        // Continue to next app or maybe don't mark as deleted?
                        // If partial failure, we might want to retry. 
                        // For now, we'll mark as deleted to avoid infinite loops if file doesn't exist.
                    }
                }
            }
            
            // Mark as deleted and clear photo_urls
            await supabaseAdmin
                .from('applications')
                .update({ 
                    files_deleted: true,
                    photo_urls: [] 
                })
                .eq('id', app.id)
                
            deletedCount++
        }

        return NextResponse.json({ 
            message: 'Cleanup completed', 
            count: deletedCount,
            processed_ids: apps.map(a => a.id)
        })

    } catch (error) {
        console.error('Cleanup job error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
