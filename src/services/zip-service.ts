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

// Simple concurrency limiter
const pLimit = (concurrency: number) => {
    const queue: (() => Promise<void>)[] = []
    let activeCount = 0

    const next = () => {
        activeCount--
        if (queue.length > 0) {
            const task = queue.shift()
            if (task) {
                activeCount++
                task()
            }
        }
    }

    const run = async <T,>(fn: () => Promise<T>): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            const task = async () => {
                try {
                    const result = await fn()
                    resolve(result)
                } catch (err) {
                    reject(err)
                } finally {
                    next()
                }
            }

            if (activeCount < concurrency) {
                activeCount++
                task()
            } else {
                queue.push(task)
            }
        })
    }

    return run
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

    const limit = pLimit(30) // Increased concurrency to 30
    const tasks: Promise<void>[] = []

    for (const app of applications) {
        if (!app.photo_urls || app.photo_urls.length === 0) continue

        // Parse blog count for photo distribution
        const blogCountMatch = app.notes?.match(/블로그 리뷰 갯수:\s*(\d+)개/)
        const blogCount = blogCountMatch ? parseInt(blogCountMatch[1], 10) : 1

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
        const dateStr = new Date(app.created_at).toISOString().split('T')[0] // YYYY-MM-DD
        
        // Format: (솔루션,상호명,날짜,갯수) -> Using underscores for safety
        const folderName = `${solutionName}_${app.store_name}_${dateStr}_${blogCount}개`.replace(/[\/\\:*?"<>|]/g, '_')
        
        const folder = zip.folder(folderName)
        if (!folder) continue

        // Add text info
        const infoContent = `
[신청서 정보]
상호명: ${app.store_name}

[키워드]
대표키워드: ${app.keywords?.join(', ')}
본문강조키워드: ${app.tags?.join(', ')}

[내용]
업체 장점 및 어필점:
${app.advantages}
`.trim()

        folder.file('info.txt', infoContent)

        // Add photos / videos
        app.photo_urls.forEach((url, i) => {
            tasks.push(limit(async () => {
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
                        return
                    }
                    const arrayBuffer = await response.arrayBuffer()
                    const extension = url.split('.').pop()?.split('?')[0] || 'jpg'
                    
                    // Distribute photos into N subfolders using Round-Robin
                    const subFolderIndex = (i % blogCount) + 1
                    const subFolder = folder.folder(`${subFolderIndex}번_블로그`)
                    subFolder?.file(`${i + 1}.${extension}`, arrayBuffer)
                } catch (error) {
                    console.error(`Failed to download file for ${app.store_name}:`, error)
                    folder.file(`error_photo_${i + 1}.txt`, 'Download failed')
                }
            }))
        })
    }

    await Promise.all(tasks)

    return await zip.generateAsync({ type: 'blob' })
}
