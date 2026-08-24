import { z } from 'zod'
import { vigor } from 'vigor-fetch'

import { RobloxUserSimple, RobloxUserSimpleSchema } from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { pickKeyValidated } from '@/lib/middlewares'
import { chunk } from '@/lib/tools'

export type UsersByNameApiDeps = {
    usersApi:  ReturnType<typeof createNetworkClients>['usersApi']
    withCache: ReturnType<typeof createCacheHelpers>['withCache']
}

export function createUsersByNameApi({ usersApi, withCache }: UsersByNameApiDeps) {

    async function usersByName(usernames: string[]): Promise<RobloxUserSimple[]> {
        return withCache<RobloxUserSimple>({
            type:     'usernames',
            ttlKey:   'usernames',
            keys:     usernames,
            getKey:   item => item.requestedUsername ?? item.name,
            fallback: {} as RobloxUserSimple,
            fetchMissing: async missing => {
                const grouped = await vigor.all(
                    ...chunk(missing, 100).map(group => () =>
                        usersApi
                            .path('usernames', 'users')
                            .body("overwrite", { usernames: group, excludeBannedUsers: false })
                            .middlewares(pickKeyValidated('data', z.array(RobloxUserSimpleSchema)))
                            .request<RobloxUserSimple[]>()
                    )
                ).request<RobloxUserSimple[][]>()
                const results = grouped.flat()
                return results.filter(u => u.id != null && u.name != null && u.displayName != null)
            },
        })
    }

    return { usersByName }
}
