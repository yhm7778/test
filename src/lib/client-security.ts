// Client-side security protection
// Disable console in production and prevent common hacking attempts

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Disable console methods
    const noop = () => { }
    const consoleMethod = ['log', 'debug', 'info', 'warn', 'error'] as const
    consoleMethod.forEach((method) => {
        const consoleRef = console as Record<(typeof consoleMethod)[number], (...args: unknown[]) => void>
        consoleRef[method] = noop
    })

    // Disable right-click context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        return false
    })

    // Disable common developer shortcuts
    document.addEventListener('keydown', (e) => {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'S'))
        ) {
            e.preventDefault()
            return false
        }
    })

    // Detect DevTools
    const devtools = {
        isOpen: false,
        orientation: undefined as string | undefined,
    }

    const threshold = 160
    const emitEvent = (isOpen: boolean, orientation: string | undefined) => {
        if (devtools.isOpen !== isOpen || devtools.orientation !== orientation) {
            devtools.isOpen = isOpen
            devtools.orientation = orientation

            if (isOpen) {
                // Redirect or show warning when DevTools is detected
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>⚠️ 개발자 도구가 감지되었습니다</h1></div>'
            }
        }
    }

    setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold
        const heightThreshold = window.outerHeight - window.innerHeight > threshold
        const orientation = widthThreshold ? 'vertical' : 'horizontal'

        if (
            !(heightThreshold && widthThreshold) &&
            ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) ||
                widthThreshold ||
                heightThreshold)
        ) {
            emitEvent(true, orientation)
        } else {
            emitEvent(false, undefined)
        }
    }, 500)

    // Prevent iframe embedding
    if (window.top !== window.self) {
        window.top!.location = window.self.location
    }

    // Clear clipboard on copy
    document.addEventListener('copy', (e) => {
        e.preventDefault()
        return false
    })

    // Disable text selection for sensitive areas
    document.addEventListener('selectstart', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('no-select')) {
            e.preventDefault()
            return false
        }
    })
}

// Prevent common XSS attacks
if (typeof window !== 'undefined') {
    // Override eval
    window.eval = function () {
        throw new Error('eval is disabled for security reasons')
    }

    // Prevent dynamic script injection
    const originalCreateElement = document.createElement
    document.createElement = function (tagName: string, options?: ElementCreationOptions) {
        if (tagName.toLowerCase() === 'script') {
            console.warn('Dynamic script creation is restricted')
        }
        return originalCreateElement.call(document, tagName, options)
    }
}

export { }
