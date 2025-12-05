import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    // Delete applications older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 1. Get old applications to delete photos
    const { data: oldApps } = await supabase
        .from('applications')
        .select('photo_urls')
        .lt('created_at', sevenDaysAgo.toISOString()) as { data: Array<{ photo_urls: string[] | null }> | null }

    if (oldApps && oldApps.length > 0) {
        const filesToDelete: string[] = []
        for (const app of oldApps) {
            if (app.photo_urls) {
                // Extract file names from URLs
                app.photo_urls.forEach((url: string) => {
                    const parts = url.split('/')
                    const fileName = parts[parts.length - 1]
                    filesToDelete.push(fileName)
                })
            }
        }

        if (filesToDelete.length > 0) {
            await supabase.storage
                .from('applications')
                .remove(filesToDelete)
        }
    }

    // 2. Delete DB records
    const { error } = await supabase
        .from('applications')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString())

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCount: oldApps?.length || 0 })
}
