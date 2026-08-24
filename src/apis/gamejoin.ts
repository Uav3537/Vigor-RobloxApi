import { RobloxPlaceId, RobloxJobId } from '@/types/branded'
import { GamejoinResponse, GamejoinResponseSchema } from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { validate } from '@/lib/middlewares'

export type GamejoinApiDeps = {
    gamejoinApi: ReturnType<typeof createNetworkClients>['gamejoinApi']
}

export function createGamejoinApi({ gamejoinApi }: GamejoinApiDeps) {

    /** join-game-instance authTicket을 요청해 서버의 publicIp/machineAddress를 뽑아낸다. */
    async function extractIps(placeId: RobloxPlaceId, jobId: RobloxJobId): Promise<{
        publicIp:       string | null
        machineAddress: string | null
    }> {
        try {
            const res = await gamejoinApi
                .path('join-game-instance')
                .body("overwrite", { placeId, gameId: jobId })
                .middlewares(validate(GamejoinResponseSchema))
                .request<GamejoinResponse>()
            return {
                publicIp:       res?.joinScript?.UdmuxEndpoints?.[0]?.Address ?? null,
                machineAddress: res?.joinScript?.MachineAddress ?? null,
            }
        } catch {
            return { publicIp: null, machineAddress: null }
        }
    }

    return { extractIps }
}
