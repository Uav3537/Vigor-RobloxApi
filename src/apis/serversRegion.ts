import vigor from 'vigor-fetch'

import { RobloxPlaceId, RobloxJobId } from '@/types/branded'
import { RobloxServerLocation, RobloxIpGeoRaw, RobloxIpGeoRawSchema } from '@/types/responses'

import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { validate } from '@/lib/middlewares'

import { createGamejoinApi } from '@/apis/gamejoin'

export type ServersRegionApiDeps = {
    ipgeolocationApi: ReturnType<typeof createNetworkClients>['ipgeolocationApi']
    ipgeolocationKey: string
    extractIps:       ReturnType<typeof createGamejoinApi>['extractIps']
    ttlSelect:        ReturnType<typeof createCacheHelpers>['ttlSelect']
    ttlUpsert:        ReturnType<typeof createCacheHelpers>['ttlUpsert']
}

export function createServersRegionApi({
    ipgeolocationApi,
    ipgeolocationKey,
    extractIps,
    ttlSelect,
    ttlUpsert,
}: ServersRegionApiDeps) {

    async function fetchIpLocation(ip: string): Promise<Omit<RobloxServerLocation, 'jobId'> | null> {
        try {
            const raw = await ipgeolocationApi
                .path('ipgeo')
                .query({ apiKey: ipgeolocationKey, ip, fields: 'country_code2,country_name,state_prov,city,latitude,longitude,isp,time_zone' })
                .middlewares(validate(RobloxIpGeoRawSchema))
                .request<RobloxIpGeoRaw>()
            return {
                ip,
                countryCode: String(raw.country_code2 ?? ''),
                countryName: String(raw.country_name  ?? ''),
                regionName:  String(raw.state_prov    ?? ''),
                city:        String(raw.city           ?? ''),
                latitude:    Number(raw.latitude       ?? 0),
                longitude:   Number(raw.longitude      ?? 0),
                isp:         String(raw.isp            ?? ''),
                timezone:    String(raw.time_zone?.name ?? ''),
            }
        } catch {
            return null
        }
    }

    async function serversRegion(opts: { placeId: RobloxPlaceId; jobIds: RobloxJobId[] }): Promise<RobloxServerLocation[]> {
        const { placeId, jobIds } = opts
        if (jobIds.length === 0) return []

        type LocBase = Omit<RobloxServerLocation, 'jobId'>

        const cachedByJob = await ttlSelect<RobloxServerLocation>('serverLocationJob', 'serverLocation:job', jobIds)
        const jobHitMap   = new Map(cachedByJob.map(({ separator, data }) => [separator, data]))
        const missJobIds  = jobIds.filter(id => !jobHitMap.has(id))
        if (missJobIds.length === 0) return jobIds.map(id => jobHitMap.get(id)!)

        const extracted = await vigor.all(
            ...missJobIds.map(jobId => async () => {
                const { publicIp, machineAddress } = await extractIps(placeId, jobId as RobloxJobId)
                return { jobId, publicIp, machineAddress }
            })
        )
        .settings(s => s.concurrency(3))
        .request<Array<{ jobId: string; publicIp: string | null; machineAddress: string | null }>>()

        const validExtracted = extracted.filter(
            (e): e is { jobId: string; publicIp: string; machineAddress: string | null } => e.publicIp !== null
        )
        const machineAddresses = [...new Set(validExtracted.map(e => e.machineAddress).filter((m): m is string => m !== null))]

        const cachedByMachine = await ttlSelect<LocBase>('serverLocationMachine', 'serverLocation:machine', machineAddresses)
        const machineHitMap   = new Map(cachedByMachine.map(({ separator, data }) => [separator, data]))

        type ExtractedValid = { jobId: string; publicIp: string; machineAddress: string | null }
        const { pass: machineHits, fail: machineMiss } = validExtracted.reduce<{
            pass: Array<ExtractedValid & { loc: LocBase }>
            fail: ExtractedValid[]
        }>(
            (acc, e) => {
                const cached = e.machineAddress ? machineHitMap.get(e.machineAddress) : undefined
                if (cached) acc.pass.push({ ...e, loc: cached })
                else        acc.fail.push(e)
                return acc
            },
            { pass: [], fail: [] }
        )

        const missPublicIps = [...new Set(machineMiss.map(e => e.publicIp))]
        const cachedByIp    = await ttlSelect<LocBase>('serverLocationIp', 'serverLocation:ip', missPublicIps)
        const ipHitMap      = new Map(cachedByIp.map(({ separator, data }) => [separator, data]))
        const stillMissIps  = missPublicIps.filter(ip => !ipHitMap.has(ip))

        if (stillMissIps.length > 0) {
            const fetched = await vigor.all(
                ...stillMissIps.map(ip => async () => ({ ip, loc: await fetchIpLocation(ip) }))
            )
            .settings(s => s.concurrency(5))
            .request<Array<{ ip: string; loc: LocBase | null }>>()
            const toUpsertIp = fetched.filter((e): e is { ip: string; loc: LocBase } => e.loc !== null)
            if (toUpsertIp.length > 0) {
                await ttlUpsert<LocBase>('serverLocationIp', 'serverLocation:ip', toUpsertIp.map(({ ip, loc }) => ({ separator: ip, data: loc })))
                toUpsertIp.forEach(({ ip, loc }) => ipHitMap.set(ip, loc))
            }
        }

        const toUpsertMachine: Array<{ separator: string; data: LocBase }> = []
        for (const e of machineMiss) {
            const loc = ipHitMap.get(e.publicIp)
            if (loc && e.machineAddress && !machineHitMap.has(e.machineAddress)) {
                toUpsertMachine.push({ separator: e.machineAddress, data: loc })
                machineHitMap.set(e.machineAddress, loc)
            }
        }
        if (toUpsertMachine.length > 0) await ttlUpsert<LocBase>('serverLocationMachine', 'serverLocation:machine', toUpsertMachine)

        const jobLocations: RobloxServerLocation[] = []
        const toUpsertJob:  Array<{ separator: string; data: RobloxServerLocation }> = []

        for (const { jobId, loc } of machineHits) {
            const full: RobloxServerLocation = { ...loc, jobId: jobId as RobloxJobId }
            jobLocations.push(full)
            toUpsertJob.push({ separator: jobId, data: full })
        }
        for (const e of machineMiss) {
            const loc = ipHitMap.get(e.publicIp)
            if (!loc) continue
            const full: RobloxServerLocation = { ...loc, jobId: e.jobId as RobloxJobId }
            jobLocations.push(full)
            toUpsertJob.push({ separator: e.jobId, data: full })
        }
        if (toUpsertJob.length > 0) await ttlUpsert<RobloxServerLocation>('serverLocationJob', 'serverLocation:job', toUpsertJob)

        const resultMap = new Map<string, RobloxServerLocation>([
            ...jobHitMap.entries(),
            ...jobLocations.map(loc => [loc.jobId, loc] as const),
        ])
        return jobIds.flatMap(id => { const loc = resultMap.get(id); return loc ? [loc] : [] })
    }

    return { fetchIpLocation, serversRegion }
}
