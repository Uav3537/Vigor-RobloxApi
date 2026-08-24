export interface RobloxApiCache {
    select: <T>(type: string, separators: string[]) => Promise<Array<{ separator: string; data: T }>>
    upsert: <T>(type: string, expire: number, items: Array<{ separator: string; data: T }>) => Promise<void>
}

/**
 * Per-resource TTL overrides (milliseconds), passed to `createRobloxApi({ ttl })`.
 * Any key left unset falls back to its built-in default (see DEFAULT_TTL_CONFIG).
 * Setting a key to `0` disables caching entirely for that resource: every call
 * fetches fresh data and nothing is read from or written to the cache.
 */
export interface RobloxTtlConfig {
    usersSimple?:           number
    users?:                 number
    usernames?:             number
    thumbnailAssets?:       number
    thumbnails?:            number
    serversSimple?:         number
    friends?:               number
    placeInfo?:             number
    serverLocationJob?:     number
    serverLocationIp?:      number
    serverLocationMachine?: number
}

export type ResolvedTtlConfig = Required<RobloxTtlConfig>

export const DEFAULT_TTL_CONFIG: ResolvedTtlConfig = {
    usersSimple:           30 * 60 * 1000,
    users:                 60 * 60 * 1000,
    usernames:             30 * 60 * 1000,
    thumbnailAssets:        6 * 60 * 60 * 1000,
    thumbnails:             6 * 60 * 60 * 1000,
    serversSimple:          5 * 1000,
    friends:               10 * 60 * 1000,
    placeInfo:             60 * 60 * 1000,
    serverLocationJob:     12 * 60 * 60 * 1000,
    serverLocationIp:      31 * 24 * 60 * 60 * 1000,
    serverLocationMachine:  2 * 24 * 60 * 60 * 1000,
}

export function resolveTtlConfig(ttl?: RobloxTtlConfig): ResolvedTtlConfig {
    return { ...DEFAULT_TTL_CONFIG, ...ttl }
}
