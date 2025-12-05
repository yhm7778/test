import JSZip from 'jszip'
import { Database } from '@/types/supabase'
import { createClient as createSupabaseAdminClient, type SupabaseClient } from '@supabase/supabase-js'

type Application = Database['public']['Tables']['applications']['Row']

function extractObjectPath(url: string): string | null {
    try {
        const parsed = new URL(url)
        const idx = parsed.pathname.indexOf('/object/')
        if (idx === -1) return null
        // /storage/v1/object/public/applications/folder/file.png
        const segments = parsed.pathname.slice(idx).split('/')
        const bucketIdx = segments.findIndex(s => s === 'public' || s === 'sign')
        if (bucketIdx === -1 || bucketIdx + 1 >= segments.length) return null
        // bucket is next segment
        const bucket = segments[bucketIdx + 1]
        const pathParts = segments.slice(bucketIdx + 2)
        if (bucket !== 'applications') return null
        return pathParts.join('/')
    } catch {
        return null
    }
}

export async function generateZip(applications: Application[]) {
    const zip = new JSZip()

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin: SupabaseClient<Database> | null = serviceRoleKey
        ? createSupabaseAdminClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
        : null

    for (const app of applications) {
        if (!app.photo_urls || app.photo_urls.length === 0) continue

        const folder = zip.folder(app.store_name.replace(/[\/\\:*?"<>|]/g, '_')) // Sanitize folder name
        if (!folder) continue

        // Add text info
        const infoContent = `
상호명: ${app.store_name}
신청일: ${new Date(app.created_at).toLocaleString()}
키워드: ${app.keywords?.join(', ')}
장점: ${app.advantages}
태그: ${app.tags?.join(', ')}
플레이스 URL: ${app.place_url}
특이사항: ${app.notes}
    `.trim()

        folder.file('info.txt', infoContent)

        // Add photos / videos
        for (let i = 0; i < app.photo_urls.length; i++) {
            const url = app.photo_urls[i]
            try {
                let downloadUrl = url

                if (supabaseAdmin) {
                    const objectPath = extractObjectPath(url)
                    if (objectPath) {
                        const { data, error } = await supabaseAdmin.storage
                            .from('applications')
                            .createSignedUrl(objectPath, 3600)
                        if (!error && data?.signedUrl) {
                            downloadUrl = data.signedUrl
                        }
                    }
                }

                const response = await fetch(downloadUrl)
                if (!response.ok) {
                    console.error(`Failed to download file (${response.status}) for ${app.store_name}: ${downloadUrl}`)
                    continue
                }
                const arrayBuffer = await response.arrayBuffer()
                const extension = url.split('.').pop()?.split('?')[0] || 'jpg'
                folder.file(`file_${i + 1}.${extension}`, arrayBuffer)
            } catch (error) {
                console.error(`Failed to download file for ${app.store_name}:`, error)
            }
        }
    }

    return await zip.generateAsync({ type: 'blob' })
}
