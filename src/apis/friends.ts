import { z } from 'zod'

import { RobloxUserId } from '@/types/branded'
import { RobloxFriendEntry, RobloxFriendEntrySchema } from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { pickKeyValidated } from '@/lib/middlewares'
import { friendsApiRateLimiter } from '@/lib/rate-limiter'

export type FriendsApiDeps = {
    friendsApi: ReturnType<typeof createNetworkClients>['friendsApi']
    withCache:  ReturnType<typeof createCacheHelpers>['withCache']
}

export function createFriendsApi({ friendsApi, withCache }: FriendsApiDeps) {

    async function friends(userId: RobloxUserId): Promise<RobloxFriendEntry[]> {
        const [result] = await withCache<RobloxFriendEntry[]>({
            type:     'friends',
            ttlKey:   'friends',
            keys:     [String(userId)],
            getKey:   () => String(userId),
            fallback: [] as RobloxFriendEntry[],
            fetchMissing: async () => {
                const list = await friendsApiRateLimiter(() =>
                    friendsApi
                        .path('users', userId, 'friends')
                        .middlewares(pickKeyValidated('data', z.array(RobloxFriendEntrySchema)))
                        .request<RobloxFriendEntry[]>()
                )
                return [list]
            },
        })
        return result
    }

    async function sendFriendRequest(targetUserId: RobloxUserId): Promise<void> {
        await friendsApiRateLimiter(() =>
            friendsApi
                .path('users', targetUserId, 'request-friendship')
                .body("overwrite", {})
                .request<unknown>()
        )
    }

    async function unfriend(targetUserId: RobloxUserId): Promise<void> {
        await friendsApiRateLimiter(() =>
            friendsApi
                .path('users', targetUserId, 'unfriend')
                .body("overwrite", {})
                .request<unknown>()
        )
    }

    return { friends, sendFriendRequest, unfriend }
}
