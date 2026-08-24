import vigor from 'vigor-fetch'
import { RobloxCookie } from '@/types/branded'
import { CsrfTokenManager } from './csrf'
import { makeHeaderMiddlewares } from './middlewares'

export function createNetworkClients(opts: {
    cookies:     RobloxCookie[]
    csrfManager: CsrfTokenManager
}) {
    const { cookies, csrfManager } = opts
    const cookiePool = cookies.map(cookie => ({ cookie, lastUsed: 0 }))

    function pickCookie(): RobloxCookie {
        const entry = cookiePool.reduce((a, b) => a.lastUsed < b.lastUsed ? a : b)
        entry.lastUsed = Date.now()
        return entry.cookie
    }

    const poolCookieMiddlewares        = makeHeaderMiddlewares({ getCookie: pickCookie, csrfManager })
    const poolCookieWinInetMiddlewares = makeHeaderMiddlewares({ getCookie: pickCookie, csrfManager, winInet: true })
    const poolCookieCsrfMiddlewares    = makeHeaderMiddlewares({ getCookie: pickCookie, csrfManager, winInet: true, csrf: true })

    const usersApi = vigor.fetch('https://users.roblox.com/v1')
        .middlewares(poolCookieWinInetMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(7))
            .algorithms(a => a.backoff({ initial: 200, unit: 800, multiplier: 1.7 }))
        )

    const thumbnailsApi = vigor.fetch('https://thumbnails.roblox.com/v1')
        .middlewares(poolCookieWinInetMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(5))
            .algorithms(a => a.backoff({ initial: 1000, multiplier: 2.5 }))
        )

    const gamesApi = vigor.fetch('https://games.roblox.com/v1')
        .middlewares(poolCookieMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(5))
            .algorithms(a => a.backoff({ initial: 1000, multiplier: 2.5 }))
        )

    const presenceApi = vigor.fetch('https://presence.roblox.com/v1')
        .middlewares(poolCookieMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(5))
            .algorithms(a => a.backoff({ initial: 500, multiplier: 2 }))
        )

    const apisRoblox = vigor.fetch('https://apis.roblox.com')
        .middlewares(poolCookieMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(5))
            .algorithms(a => a.backoff({ initial: 1000, multiplier: 2 }))
        )

    const gamejoinApi = vigor.fetch('https://gamejoin.roblox.com/v1')
        .middlewares(poolCookieWinInetMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(7))
            .algorithms(a => a.backoff({ initial: 500, multiplier: 1.5 }))
        )

    const ipgeolocationApi = vigor.fetch('https://api.ipgeolocation.io')
        .retry(r => r
            .settings(s => s.maxAttempts(4))
            .algorithms(a => a.backoff({ initial: 500, multiplier: 2 }))
        )

    const friendsApi = vigor.fetch('https://friends.roblox.com/v1')
        .middlewares(poolCookieCsrfMiddlewares)
        .retry(r => r
            .settings(s => s.maxAttempts(5))
            .algorithms(a => a.backoff({ initial: 500, multiplier: 2 }))
        )

    return {
        pickCookie,
        usersApi,
        thumbnailsApi,
        gamesApi,
        presenceApi,
        apisRoblox,
        gamejoinApi,
        ipgeolocationApi,
        friendsApi,
    }
}
