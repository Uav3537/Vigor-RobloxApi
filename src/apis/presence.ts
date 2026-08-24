import { z } from 'zod'
import { vigor } from 'vigor-fetch'

import { RobloxUserId } from '@/types/branded'
import { RobloxPresenceEntry, RobloxPresenceEntrySchema } from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { pickKeyValidated } from '@/lib/middlewares'
import { chunk } from '@/lib/tools'

export type PresenceApiDeps = {
    presenceApi: ReturnType<typeof createNetworkClients>['presenceApi']
}

export function createPresenceApi({ presenceApi }: PresenceApiDeps) {

    async function presence(userIds: RobloxUserId[]): Promise<RobloxPresenceEntry[]> {
        const grouped = await vigor.all(
            ...chunk(userIds, 50).map(group => () =>
                presenceApi
                    .path('presence', 'users')
                    .body("overwrite", { userIds: group })
                    .middlewares(pickKeyValidated('userPresences', z.array(RobloxPresenceEntrySchema)))
                    .request<RobloxPresenceEntry[]>()
            )
        ).request<RobloxPresenceEntry[][]>()
        return grouped.flat()
    }

    return { presence }
}
