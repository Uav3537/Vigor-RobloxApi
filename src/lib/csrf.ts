import { RobloxCookie } from '@/types/branded'

export class CsrfTokenManager {
    private tokenMap = new Map<string, string>()
    private pendingMap = new Map<string, Promise<string>>()

    get(cookie: RobloxCookie): string | null {
        return this.tokenMap.get(cookie) ?? null
    }

    set(cookie: RobloxCookie, token: string): void {
        this.tokenMap.set(cookie, token)
    }

    invalidate(cookie: RobloxCookie): void {
        this.tokenMap.delete(cookie)
    }

    async refresh(cookie: RobloxCookie): Promise<string> {
        const existing = this.pendingMap.get(cookie)
        if (existing) return existing

        const pending = (async (): Promise<string> => {
            try {
                const response = await fetch('https://accountinformation.roblox.com/v1/description', {
                    method:  'POST',
                    headers: {
                        'Cookie':          `.ROBLOSECURITY=${cookie}`,
                        'User-Agent':      'Roblox/WinInet',
                        'Content-Type':    'application/json',
                        'Content-Length':  '2',
                    },
                    body: '{}',
                })
                const token = response.headers.get('x-csrf-token')
                if (!token) throw new Error('CSRF token not found in response headers')
                this.tokenMap.set(cookie, token)
                return token
            } finally {
                this.pendingMap.delete(cookie)
            }
        })()

        this.pendingMap.set(cookie, pending)
        return pending
    }

    async getOrRefresh(cookie: RobloxCookie): Promise<string> {
        const cached = this.get(cookie)
        if (cached) return cached
        return this.refresh(cookie)
    }
}
