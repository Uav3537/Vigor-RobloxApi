import { RobloxApiCache, RobloxTtlConfig, ResolvedTtlConfig, resolveTtlConfig } from '@/types/cache'

export function createCacheHelpers(cache: RobloxApiCache, ttl?: RobloxTtlConfig) {
    const ttlConfig: ResolvedTtlConfig = resolveTtlConfig(ttl)

    /**
     * Generic read-through cache: looks up `keys` under `type`, fetches whatever is
     * missing via `fetchMissing`, writes the fetched items back, and returns results
     * in the same order as `keys` (falling back to `fallback` for anything still missing).
     *
     * If the resolved TTL for `ttlKey` is 0, the cache is bypassed entirely: every key
     * is treated as missing and nothing is written back.
     */
    async function withCache<T>(opts: {
        type:         string
        ttlKey:       keyof ResolvedTtlConfig
        keys:         string[]
        getKey:       (item: T) => string
        fetchMissing: (missing: string[]) => Promise<T[]>
        fallback:     T
    }): Promise<T[]> {
        const { type, ttlKey, keys, getKey, fetchMissing, fallback } = opts
        const ttlMs = ttlConfig[ttlKey]

        if (ttlMs === 0) {
            const fetched = await fetchMissing(keys)
            const map = new Map(fetched.map(item => [getKey(item), item]))
            return keys.map(k => map.get(k) ?? fallback)
        }

        const cached   = await cache.select<T>(type, keys)
        const cacheMap = new Map(cached.map(({ separator, data }) => [separator, data]))
        const missing  = keys.filter(k => !cacheMap.has(k))
        if (missing.length > 0) {
            const fetched = await fetchMissing(missing)
            await cache.upsert<T>(type, ttlMs, fetched.map(item => ({ separator: getKey(item), data: item })))
            fetched.forEach(item => cacheMap.set(getKey(item), item))
        }
        return keys.map(k => cacheMap.get(k) ?? fallback)
    }

    /** Raw cache read that honors the TTL=0 "disabled" convention (returns no hits). */
    async function ttlSelect<T>(ttlKey: keyof ResolvedTtlConfig, type: string, keys: string[]) {
        if (ttlConfig[ttlKey] === 0 || keys.length === 0) return [] as Array<{ separator: string; data: T }>
        return cache.select<T>(type, keys)
    }

    /** Raw cache write that honors the TTL=0 "disabled" convention (no-op). */
    async function ttlUpsert<T>(ttlKey: keyof ResolvedTtlConfig, type: string, items: Array<{ separator: string; data: T }>) {
        const ttlMs = ttlConfig[ttlKey]
        if (ttlMs === 0 || items.length === 0) return
        await cache.upsert<T>(type, ttlMs, items)
    }

    return { withCache, ttlSelect, ttlUpsert, ttlConfig }
}
