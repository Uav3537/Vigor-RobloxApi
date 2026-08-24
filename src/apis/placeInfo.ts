import { z } from 'zod'
import vigor from 'vigor-fetch'

import { RobloxPlaceId, RobloxAssetId } from '@/types/branded'
import {
    RobloxPlaceInfo,
    RobloxUniverseFromPlace,
    RobloxUniverseFromPlaceRawSchema,
    RobloxGameDetailsRaw,
    RobloxGameDetailsRawSchema,
    RobloxGameMediaEntry,
    RobloxGameMediaEntrySchema,
} from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { pickKeyValidated } from '@/lib/middlewares'

import { createThumbnailsApi } from '@/apis/thumbnails'

export type PlaceInfoApiDeps = {
    apisRoblox:      ReturnType<typeof createNetworkClients>['apisRoblox']
    gamesApi:        ReturnType<typeof createNetworkClients>['gamesApi']
    withCache:       ReturnType<typeof createCacheHelpers>['withCache']
    thumbnailAssets: ReturnType<typeof createThumbnailsApi>['thumbnailAssets']
}

export function createPlaceInfoApi({ apisRoblox, gamesApi, withCache, thumbnailAssets }: PlaceInfoApiDeps) {

    async function placeInfo(placeIds: RobloxPlaceId[]): Promise<RobloxPlaceInfo[]> {
        return withCache<RobloxPlaceInfo>({
            type:     'placeInfo',
            ttlKey:   'placeInfo',
            keys:     placeIds.map(String),
            getKey:   item => String(item.placeId),
            fallback: {} as RobloxPlaceInfo,
            fetchMissing: async missing => {
                const universeEntries = await vigor.all(
                    ...missing.map(placeId => () =>
                        apisRoblox
                            .path('universes', 'v1', 'places', placeId, 'universe')
                            .middlewares(vigor.builders.fetch.middlewares()
                                .after("intercept", async (ctx, api) => {
                                    const r = RobloxUniverseFromPlaceRawSchema.parse(ctx.result)
                                    api.setResult({ placeId: Number(placeId), universeId: r?.universeId ?? null })
                                    return ctx
                                })
                            )
                            .request<RobloxUniverseFromPlace>()
                    )
                ).request<RobloxUniverseFromPlace[]>()

                type MetaItem = { placeId: number; universeId: number | null; info: RobloxGameDetailsRaw | null; assetIds: number[] }

                const metaList = await vigor.all(
                    ...universeEntries.map(({ placeId, universeId }) => async () => {
                        if (!universeId) return { placeId, universeId: null, info: null, assetIds: [] as number[] } satisfies MetaItem
                        const [details, media] = await Promise.all([
                            gamesApi.path('games').query({ universeIds: universeId })
                                .middlewares(pickKeyValidated('data', z.array(RobloxGameDetailsRawSchema)))
                                .request<RobloxGameDetailsRaw[]>(),
                            gamesApi.path('games', universeId, 'media')
                                .middlewares(pickKeyValidated('data', z.array(RobloxGameMediaEntrySchema)))
                                .request<RobloxGameMediaEntry[]>(),
                        ])
                        return {
                            placeId,
                            universeId,
                            info:     details?.[0] ?? null,
                            assetIds: (media ?? []).map(m => m.imageId).filter((id): id is number => id != null),
                        } satisfies MetaItem
                    })
                ).request<MetaItem[]>()

                const allAssetIds = [...new Set(metaList.flatMap(m => m.assetIds))]
                const assetUrlMap = new Map<number, string>()
                if (allAssetIds.length > 0) {
                    const thumbs = await thumbnailAssets({ assetIds: allAssetIds as RobloxAssetId[], size: '768x432', format: 'Png' })
                    thumbs.forEach(t => { if (t.targetId != null && t.url) assetUrlMap.set(t.targetId as number, t.url) })
                }
                return metaList.map(({ placeId, universeId, info, assetIds }) => ({
                    ...(info as object ?? {}),
                    placeId,
                    universeId,
                    logos: assetIds.map(id => assetUrlMap.get(id)).filter((u): u is string => u != null),
                })) as RobloxPlaceInfo[]
            },
        })
    }

    return { placeInfo }
}
