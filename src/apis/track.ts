import { RobloxUserId, RobloxPlaceId, RobloxJobId } from '@/types/branded'
import { RobloxUserSimple, RobloxServerEntry, RobloxServerLocation } from '@/types/responses'
import { WithImg } from '@/types/api'

import { partition } from '@/lib/tools'

import { createUsersApi } from '@/apis/users'
import { createUsersByNameApi } from '@/apis/usersByName'
import { createThumbnailsApi } from '@/apis/thumbnails'
import { createServersApi } from '@/apis/servers'
import { createServersRegionApi } from '@/apis/serversRegion'

export type TrackApiDeps = {
    usersByName:     ReturnType<typeof createUsersByNameApi>['usersByName']
    usersSimple:     ReturnType<typeof createUsersApi>['usersSimple']
    serversSimple:   ReturnType<typeof createServersApi>['serversSimple']
    thumbnailsBatch: ReturnType<typeof createThumbnailsApi>['thumbnailsBatch']
    serversRegion:   ReturnType<typeof createServersRegionApi>['serversRegion']
}

const DEFAULT_HASHES = new Set([
    '5816BB6B457A7A2FD8F0299D6F79DADF', 'D517857E5CC51E2FF93E63E20241169E',
    '56DFC0F87BABBE49C6D1BE708AE9A66A', 'C16BE31B5A403C45279B3FF5533980E9',
    '51E47F0C53DA3A617158586DF73B1236', 'ACCF91F734E311F4A0EF23C3EDA54284',
    'CF083BB49C3304C593C43617FF06418E', '3259891600987E41060EC3A43511F2F9',
    '19F6EB627A565DF5ABC0B82925B2C760', '5CB6042A80C64D34BA98721C96F5D6A3',
    'E592BA2BBFA44C9021643D25BC014BD5', '661AD135B4409FF51BC4A6D80E6AC0C7',
    '8E0E19FD517F46AD46A8A322377CA89B', '1E8FFEC57F042949AEFAC69FECC72D38',
    '64D3D8C3021F7E8442CCA2825051A87A',
])

function getHash(url: string | null | undefined): string | null {
    if (!url) return null
    const match = url.match(/-([0-9A-Fa-f]{32})-/)
    return match ? match[1].toUpperCase() : null
}

export function createTrackApi({ usersByName, usersSimple, serversSimple, thumbnailsBatch, serversRegion }: TrackApiDeps) {

    async function track(opts: { placeId: RobloxPlaceId; targets: Array<string | number> }): Promise<Array<{
        user:   WithImg<RobloxUserSimple>
        server: (RobloxServerEntry & { location: RobloxServerLocation | null }) | null
    }>> {
        const { placeId, targets } = opts

        const { pass: rawIds, fail: names } = partition(targets, t => !Number.isNaN(Number(t)))
        const resolvedIds = (await usersByName(names as string[])).map(u => u.id)
        const idList      = [...rawIds.map(Number), ...resolvedIds] as RobloxUserId[]

        const [userList, serverResult, thumbs] = await Promise.all([
            usersSimple(idList),
            serversSimple({ placeId, count: 20 }),
            thumbnailsBatch(idList.map(id => ({ targetId: id }))),
        ])

        const thumbnailsMap = new Map(thumbs.map(t => [t.targetId, t.url]))

        const serverHashMap = new Map<string, RobloxServerEntry>()
        serverResult.data.forEach(s =>
            s.playerImgs.forEach(img => {
                const h = getHash(img)
                if (h) serverHashMap.set(h, s)
            })
        )

        const matchedJobIds = new Set<RobloxJobId>()
        const userServerMap = new Map<RobloxUserId, RobloxServerEntry>()

        for (const user of userList) {
            const img  = thumbnailsMap.get(user.id) ?? null
            const hash = getHash(img)
            const server = hash && !DEFAULT_HASHES.has(hash) ? (serverHashMap.get(hash) ?? null) : null
            if (server) {
                userServerMap.set(user.id, server)
                matchedJobIds.add(server.jobId)
            }
        }

        const locationList = matchedJobIds.size > 0
            ? await serversRegion({ placeId, jobIds: [...matchedJobIds] })
            : []
        const locationMap = new Map(locationList.map(l => [l.jobId, l]))

        return userList.map(user => {
            const img    = thumbnailsMap.get(user.id) ?? null
            const server = userServerMap.get(user.id) ?? null
            return {
                user:   { ...user, img },
                server: server ? { ...server, location: locationMap.get(server.jobId) ?? null } : null,
            }
        })
    }

    return { track }
}
