// Simple in-memory cache for signed URLs
// Key: original public URL, Value: { signedUrl: string, expiresAt: number }

const urlCache = new Map<string, { signedUrl: string; expiresAt: number }>()

const CACHE_DURATION = 23 * 60 * 60 * 1000 // 23 hours in milliseconds

export function getCachedSignedUrl(originalUrl: string): string | null {
    const cached = urlCache.get(originalUrl)
    if (cached && cached.expiresAt > Date.now()) {
        return cached.signedUrl
    }
    return null
}

export function setCachedSignedUrl(originalUrl: string, signedUrl: string): void {
    urlCache.set(originalUrl, {
        signedUrl,
        expiresAt: Date.now() + CACHE_DURATION
    })
}

export function clearCache(): void {
    urlCache.clear()
}

