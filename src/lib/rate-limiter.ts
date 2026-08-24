export function makeRateLimiter(opts: { limit: number; windowMs: number }) {
    const { limit, windowMs } = opts
    const queue: Array<() => void> = []
    let count = 0
    let windowStart = Date.now()
    let timer: ReturnType<typeof setTimeout> | null = null

    function drain() {
        const now = Date.now()
        if (now - windowStart >= windowMs) {
            windowStart = now
            count = 0
        }
        while (queue.length > 0 && count < limit) {
            count++
            const next = queue.shift()!
            next()
        }
        if (queue.length > 0 && timer == null) {
            const delay = Math.max(0, windowMs - (Date.now() - windowStart))
            timer = setTimeout(() => {
                timer = null
                drain()
            }, delay)
        }
    }

    return function schedule<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            queue.push(() => { fn().then(resolve, reject) })
            drain()
        })
    }
}

export const gamesServersRateLimiter = makeRateLimiter({ limit: 20, windowMs: 60 * 1000 })
export const friendsApiRateLimiter   = makeRateLimiter({ limit: 20, windowMs: 60 * 1000 })
