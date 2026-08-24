import {
    RobloxServerEntry,
    RobloxServerEntryWithLocation,
    RobloxServersResult,
    RobloxThumbnailTarget,
    RobloxServerRaw,
    RobloxServersPageRaw,
    RobloxServersPageRawSchema,
} from '@/types/responses'
import { ServersOpts } from '@/types/api'

import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { validate } from '@/lib/middlewares'
import { gamesServersRateLimiter } from '@/lib/rate-limiter'

import { createThumbnailsApi } from '@/apis/thumbnails'
import { createServersRegionApi } from '@/apis/serversRegion'

export type ServersApiDeps = {
    gamesApi:         ReturnType<typeof createNetworkClients>['gamesApi']
    withCache:        ReturnType<typeof createCacheHelpers>['withCache']
    thumbnailsBatch:  ReturnType<typeof createThumbnailsApi>['thumbnailsBatch']
    serversRegion:    ReturnType<typeof createServersRegionApi>['serversRegion']
}

export function createServersApi({ gamesApi, withCache, thumbnailsBatch, serversRegion }: ServersApiDeps) {

    async function serversSimple(opts: ServersOpts): Promise<RobloxServersResult<RobloxServerEntry>> {
        const { placeId, count = 1, serverType = 'Public', cursor, thumbnailFormat } = opts
        const cacheKey = `${placeId}:${serverType}:${count}:${cursor ?? ''}`

        const [result] = await withCache<RobloxServersResult<RobloxServerEntry>>({
            type:     'serversSimple',
            ttlKey:   'serversSimple',
            keys:     [cacheKey],
            getKey:   () => cacheKey,
            fallback: { previousPageCursor: null, nextPageCursor: null, data: [] },
            fetchMissing: async () => {
                let nextCursor: string | null = cursor ?? null
                let prevCursor: string | null = null
                const rawData: RobloxServerRaw[] = []
                for (let i = 0; i < count; i++) {
                    const page = await gamesServersRateLimiter(() =>
                        gamesApi
                            .path('games', placeId, 'servers', serverType)
                            .query({ limit: 100, ...(nextCursor ? { cursor: nextCursor } : {}) })
                            .middlewares(validate(RobloxServersPageRawSchema))
                            .request<RobloxServersPageRaw>()
                    )
                    if (i === 0) prevCursor = page.previousPageCursor
                    nextCursor = page.nextPageCursor
                    rawData.push(...page.data)
                    if (!nextCursor) break
                }
                const thumbTargets: RobloxThumbnailTarget[] = rawData
                    .flatMap(s => s.playerTokens.map(token => ({ token, type: 'AvatarHeadShot', size: '150x150', format: 'Png', ...thumbnailFormat })))
                const thumbResults = await thumbnailsBatch(thumbTargets, thumbnailFormat)
                const thumbMap     = new Map(thumbResults.map(t => [t.token, t.url]))
                return [{
                    previousPageCursor: prevCursor,
                    nextPageCursor:     nextCursor,
                    data: rawData.map(s => ({
                        jobId:      s.id,
                        maxPlayers: s.maxPlayers,
                        playing:    s.playing,
                        fps:        s.fps,
                        ping:       s.ping,
                        playerImgs: s.playerTokens.map(tok => thumbMap.get(tok)).filter((url): url is string => url != null),
                    })),
                }]
            },
        })

        return result
    }

    async function servers(opts: ServersOpts): Promise<RobloxServersResult<RobloxServerEntryWithLocation>> {
        const result = await serversSimple(opts)

        const jobIds = result.data.map(s => s.jobId)
        const locationList = await serversRegion({ placeId: opts.placeId, jobIds }).catch(() => [])
        const locationMap  = new Map(locationList.map(l => [l.jobId, l]))

        return {
            ...result,
            data: result.data.map(s => ({
                ...s,
                location: locationMap.get(s.jobId) ?? null,
            })),
        }
    }

    return { serversSimple, servers }
}