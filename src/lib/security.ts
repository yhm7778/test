// Security utility functions for input validation and sanitization

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url)
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol')
        }
        return parsed.toString()
    } catch {
        return ''
    }
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 1024 * 1024 * 1024 // 1GB
    const ALLOWED_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/mpeg',
        'video/webm',
        'video/x-matroska',
        'video/3gpp',
    ]

    if (file.size > MAX_SIZE) {
        return { valid: false, error: '파일 크기는 1GB를 초과할 수 없습니다.' }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: '이미지 또는 동영상 파일만 업로드 가능합니다. (JPG, PNG, GIF, WEBP, MP4 등)' }
    }

    return { valid: true }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 255)
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: '비밀번호는 최소 8자 이상이어야 합니다.' }
    }
    if (password.length > 128) {
        return { valid: false, error: '비밀번호는 128자를 초과할 수 없습니다.' }
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, error: '비밀번호에 소문자가 포함되어야 합니다.' }
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, error: '비밀번호에 대문자가 포함되어야 합니다.' }
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: '비밀번호에 숫자가 포함되어야 합니다.' }
    }
    return { valid: true }
}

/**
 * Rate limiting check (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 60000
): { allowed: boolean; remaining: number } {
    const now = Date.now()
    const record = rateLimitMap.get(identifier)

    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
        return { allowed: true, remaining: maxRequests - 1 }
    }

    if (record.count >= maxRequests) {
        return { allowed: false, remaining: 0 }
    }

    record.count++
    return { allowed: true, remaining: maxRequests - record.count }
}

/**
 * Clean up old rate limit records
 */
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) {
            rateLimitMap.delete(key)
        }
    }
}, 60000) // Clean up every minute
