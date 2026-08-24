import { CreateRobloxApiOptions } from '@/types/api'

import { CsrfTokenManager } from '@/lib/csrf'
import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'

import { createUsersApi } from '@/apis/users'
import { createUsersByNameApi } from '@/apis/usersByName'
import { createPresenceApi } from '@/apis/presence'
import { createThumbnailsApi } from '@/apis/thumbnails'
import { createGamejoinApi } from '@/apis/gamejoin'
import { createServersRegionApi } from '@/apis/serversRegion'
import { createServersApi } from '@/apis/servers'
import { createPlaceInfoApi } from '@/apis/placeInfo'
import { createWithImgApi } from '@/apis/withImg'
import { createTrackApi } from '@/apis/track'
import { createFriendsApi } from '@/apis/friends'

export * from '@/types/branded'
export * from '@/types/responses'
export * from '@/types/cache'
export * from '@/types/api'

export function createRobloxApi({
    cache,
    cookies: cookiesList,
    ipgeolocationKey,
    ttl,
}: CreateRobloxApiOptions) {

    const csrfManager = new CsrfTokenManager()

    const {
        usersApi,
        thumbnailsApi,
        gamesApi,
        presenceApi,
        apisRoblox,
        gamejoinApi,
        ipgeolocationApi,
        friendsApi,
    } = createNetworkClients({ cookies: cookiesList, csrfManager })

    const { withCache, ttlSelect, ttlUpsert } = createCacheHelpers(cache, ttl)

    const { authenticated, usersSimple, users } = createUsersApi({ usersApi, csrfManager, withCache })
    const { usersByName } = createUsersByNameApi({ usersApi, withCache })
    const { presence } = createPresenceApi({ presenceApi })
    const { thumbnailAssets, thumbnailsBatch } = createThumbnailsApi({ thumbnailsApi, withCache })
    const { extractIps } = createGamejoinApi({ gamejoinApi })
    const { serversRegion } = createServersRegionApi({ ipgeolocationApi, ipgeolocationKey, extractIps, ttlSelect, ttlUpsert })
    const { serversSimple, servers } = createServersApi({ gamesApi, withCache, thumbnailsBatch, serversRegion })
    const { placeInfo } = createPlaceInfoApi({ apisRoblox, gamesApi, withCache, thumbnailAssets })
    const { usersSimpleWithImg, usersWithImg, usersByNamesWithImg } = createWithImgApi({ usersSimple, users, usersByName, thumbnailsBatch })
    const { track } = createTrackApi({ usersByName, usersSimple, serversSimple, thumbnailsBatch, serversRegion })
    const { friends, sendFriendRequest, unfriend } = createFriendsApi({ friendsApi, withCache })

    return {
        authenticated,
        usersSimple,
        users,
        usersByName,
        thumbnailAssets,
        thumbnailsBatch,
        serversSimple,
        servers,
        presence,
        placeInfo,
        usersSimpleWithImg,
        usersWithImg,
        usersByNamesWithImg,
        track,
        serversRegion,
        friends,
        sendFriendRequest,
        unfriend,
    }
}

export type RobloxApi = ReturnType<typeof createRobloxApi>
