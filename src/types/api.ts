import {
    RobloxCookie,
    RobloxPlaceId,
} from './branded'
import { RobloxThumbnailTarget } from './responses'
import { RobloxApiCache, RobloxTtlConfig } from './cache'

export interface CreateRobloxApiOptions {
    cache:            RobloxApiCache
    cookies:          RobloxCookie[]
    ipgeolocationKey: string
    /** Per-resource cache TTL overrides. See RobloxTtlConfig for defaults / disabling. */
    ttl?:             RobloxTtlConfig
}

export interface ServersOpts {
    placeId:          RobloxPlaceId
    count?:           number
    serverType?:      'Public' | 'Friend'
    cursor?:          string
    thumbnailFormat?: Partial<RobloxThumbnailTarget>
}

export type WithImg<T> = T & { img: string | null }
