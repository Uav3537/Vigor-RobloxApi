import { z } from 'zod'
import vigor from 'vigor-fetch'

import { RobloxUserId, RobloxAssetId } from '@/types/branded'
import {
    RobloxThumbnail,
    RobloxThumbnailRaw,
    RobloxThumbnailRawSchema,
    RobloxThumbnailRawWithRequestId,
    RobloxThumbnailRawWithRequestIdSchema,
    RobloxThumbnailTarget,
} from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { pickKeyValidated } from '@/lib/middlewares'
import { chunk } from '@/lib/tools'

export type ThumbnailsApiDeps = {
    thumbnailsApi: ReturnType<typeof createNetworkClients>['thumbnailsApi']
    withCache:     ReturnType<typeof createCacheHelpers>['withCache']
}

export function createThumbnailsApi({ thumbnailsApi, withCache }: ThumbnailsApiDeps) {

    function thumbnailCacheKey(t: RobloxThumbnailTarget): string {
        const base = t.targetId ? `id:${t.targetId}` : `token:${t.token}`
        return `${base}:${t.type}:${t.size}:${t.format}`
    }

    async function fetchThumbnailFallback(
        targets: Array<RobloxThumbnailTarget & { requestId: string }>
    ): Promise<Map<string, RobloxThumbnailRaw>> {
        const byUserId = targets.filter(
            (t): t is typeof t & { targetId: RobloxUserId } => t.targetId != null
        )
        if (byUserId.length === 0) return new Map()

        const groups = new Map<string, typeof byUserId>()
        for (const t of byUserId) {
            const key = `${t.size}:${t.format}:${t.isCircular ?? false}`
            const list = groups.get(key) ?? []
            list.push(t)
            groups.set(key, list)
        }

        const resultMap = new Map<string, RobloxThumbnailRaw>()

        await vigor.all(
            ...Array.from(groups.values()).flatMap(group =>
                chunk(group, 100).map(part => async () => {
                    try {
                        const res = await thumbnailsApi
                            .path('users', 'avatar-headshot')
                            .query({
                                userIds:          part.map(t => t.targetId).join(','),
                                size:             part[0].size,
                                format:           part[0].format,
                                isCircular:       part[0].isCircular ?? false,
                                includeBackground: false,
                            })
                            .middlewares(pickKeyValidated('data', z.array(RobloxThumbnailRawSchema)))
                            .request<RobloxThumbnailRaw[]>()

                        const byTargetId = new Map(res.map(r => [r.targetId, r]))
                        part.forEach(t => {
                            const found = byTargetId.get(t.targetId)
                            if (found) resultMap.set(t.requestId, found)
                        })
                    } catch {
                    }
                })
            )
        ).settings(s => s.concurrency(5)).request<void[]>()

        return resultMap
    }

    async function thumbnailAssets(opts: {
        assetIds: RobloxAssetId[]
        size?:    string
        format?:  string
    }): Promise<RobloxThumbnail[]> {
        const { assetIds, size = '150x150', format = 'Png' } = opts
        const targets = assetIds.map(id => ({ targetId: id, type: 'Asset', size, format }))

        return withCache<RobloxThumbnail>({
            type:     'thumbnailAssets',
            ttlKey:   'thumbnailAssets',
            keys:     targets.map(thumbnailCacheKey),
            getKey:   item => thumbnailCacheKey(item),
            fallback: { url: null } as RobloxThumbnail,
            fetchMissing: async (missingKeys) => {
                const missingTargets = targets.filter(t => missingKeys.includes(thumbnailCacheKey(t)))
                const missingIds = missingTargets.map(t => t.targetId)

                const grouped = await vigor.all(
                    ...chunk(missingIds, 100).map(group => () =>
                        thumbnailsApi
                            .path('assets')
                            .query({ assetIds: group.join(','), size, format })
                            .middlewares(pickKeyValidated('data', z.array(RobloxThumbnailRawSchema)))
                            .request<RobloxThumbnailRaw[]>()
                    )
                ).request<RobloxThumbnailRaw[][]>()

                const results = grouped.flat().map(t => ({
                    ...t,
                    type: 'Asset',
                    size,
                    format,
                    url: t.state === 'Completed' ? t.imageUrl : null,
                })) as RobloxThumbnail[]

                return results.filter(r => r.state === 'Completed')
            },
        })
    }

    /** batch 엔드포인트 + fallback으로 실제 썸네일을 가져오는 부분(캐시 관여 없음). */
    async function fetchThumbnailsRaw(
        targets: Array<RobloxThumbnailTarget>
    ): Promise<RobloxThumbnail[]> {
        const batch    = targets.map((t, i) => ({ ...t, requestId: String(i) }))
        const batchMap = new Map(batch.map(t => [t.requestId, t]))

        const grouped = await vigor.all(
            ...chunk(batch, 100).map(group => () =>
                thumbnailsApi
                    .path('batch')
                    .body("overwrite", group)
                    .middlewares(pickKeyValidated('data', z.array(RobloxThumbnailRawWithRequestIdSchema)))
                    .request<RobloxThumbnailRawWithRequestId[]>()
            )
        ).request<RobloxThumbnailRawWithRequestId[][]>()

        const results = grouped.flat()
        const resultByRequestId = new Map(results.map(r => [r.requestId, r]))

        const needsFallback = batch.filter(t => {
            const r = resultByRequestId.get(t.requestId)
            return !r || r.state !== 'Completed'
        })

        if (needsFallback.length > 0) {
            const fallbackMap = await fetchThumbnailFallback(needsFallback)
            fallbackMap.forEach((raw, requestId) => resultByRequestId.set(requestId, { ...raw, requestId }))
        }

        const merged = batch.map(t => {
            const item = resultByRequestId.get(t.requestId)
            const original = batchMap.get(t.requestId) ?? {}
            if (!item) {
                return { ...original, url: null, state: 'Error', version: '' } as RobloxThumbnail
            }
            const { requestId: _rid, ...rest } = item
            return {
                ...original,
                ...rest,
                url: rest.state === 'Completed' ? rest.imageUrl : null,
            } as RobloxThumbnail
        })

        return merged.filter(m => m.state === 'Completed')
    }

    async function thumbnailsBatch(
        targets: RobloxThumbnailTarget[],
        formatDefaults: Partial<RobloxThumbnailTarget> = {}
    ): Promise<RobloxThumbnail[]> {
        const defaults: Partial<RobloxThumbnailTarget> = {
            type:       'AvatarHeadShot',
            size:       '150x150',
            format:     'Png',
            isCircular: false,
            ...formatDefaults,
        }
        const withDefaults = targets.map(t => ({ ...defaults, ...t }))

        // token 기반 타겟(예: 서버 목록의 playerTokens)은 요청마다 새로 발급되는
        // 사실상 일회용 값이라 캐시 히트가 나지 않는다. 캐시를 거치지 않고 바로 조회한다.
        const tokenTargets  = withDefaults.filter(t => t.targetId == null && t.token != null)
        const cacheTargets  = withDefaults.filter(t => t.targetId != null)

        const [cached, fresh] = await Promise.all([
            cacheTargets.length > 0
                ? withCache<RobloxThumbnail>({
                    type:     'thumbnails',
                    ttlKey:   'thumbnails',
                    keys:     cacheTargets.map(thumbnailCacheKey),
                    getKey:   item => thumbnailCacheKey(item),
                    fallback: { url: null } as RobloxThumbnail,
                    fetchMissing: async (missingKeys) => {
                        const missingTargets = cacheTargets.filter(t => missingKeys.includes(thumbnailCacheKey(t)))
                        return fetchThumbnailsRaw(missingTargets)
                    },
                })
                : Promise.resolve([] as RobloxThumbnail[]),
            tokenTargets.length > 0 ? fetchThumbnailsRaw(tokenTargets) : Promise.resolve([] as RobloxThumbnail[]),
        ])

        return [...cached.filter(t => t.url != null), ...fresh]
    }

    return { thumbnailCacheKey, thumbnailAssets, thumbnailsBatch }
}
