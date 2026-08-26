import { z } from 'zod'
import {
    RobloxUserIdSchema,
    RobloxUserNameSchema,
    RobloxDisplayNameSchema,
    RobloxPlaceIdSchema,
    RobloxUniverseIdSchema,
    RobloxJobIdSchema,
    RobloxAssetIdSchema,
} from './branded'


// ── User ─────────────────────────────────────────────────

export const RobloxUserSimpleSchema = z.object({
    id:                 RobloxUserIdSchema,
    name:               RobloxUserNameSchema,
    displayName:        RobloxDisplayNameSchema,
    hasVerifiedBadge:   z.boolean(),
    requestedUsername:  z.string().optional(),
})

export const RobloxUserSchema = RobloxUserSimpleSchema.extend({
    description:            z.string(),
    externalAppDisplayName: z.string().nullable(),
    isBanned:                z.boolean(),
    created:                 z.string(),
})

export type RobloxUserSimple = z.infer<typeof RobloxUserSimpleSchema>
export type RobloxUser       = z.infer<typeof RobloxUserSchema>


// ── Authenticated user (sub-resources) ──────────────────────

export const RobloxUserDescriptionSchema = z.object({
    description: z.string(),
})

export const RobloxUserBirthdateSchema = z.object({
    birthYear:  z.number(),
    birthMonth: z.number(),
    birthDay:   z.number(),
})

export const RobloxUserGenderSchema = z.object({
    gender: z.number(),
})

export const RobloxUserAgeBracketSchema = z.object({
    ageBracket: z.number(),
})

export const RobloxUserCountryCodeSchema = z.object({
    countryCode: z.string(),
})

export const RobloxUserRolesSchema = z.object({
    roles: z.array(z.string()),
})

export type RobloxUserDescription = z.infer<typeof RobloxUserDescriptionSchema>
export type RobloxUserBirthdate   = z.infer<typeof RobloxUserBirthdateSchema>
export type RobloxUserGender      = z.infer<typeof RobloxUserGenderSchema>
export type RobloxUserAgeBracket  = z.infer<typeof RobloxUserAgeBracketSchema>
export type RobloxUserCountryCode = z.infer<typeof RobloxUserCountryCodeSchema>
export type RobloxUserRoles       = z.infer<typeof RobloxUserRolesSchema>

export type RobloxAuthenticatedUser =
    RobloxUserSimple
    & Partial<RobloxUserDescription>
    & Partial<RobloxUserBirthdate>
    & Partial<RobloxUserGender>
    & Partial<RobloxUserAgeBracket>
    & Partial<RobloxUserCountryCode>
    & Partial<RobloxUserRoles>


// ── Thumbnail ────────────────────────────────────────────

export const RobloxThumbnailTargetBaseSchema = z.object({
    targetId: z.preprocess(
        (v) => (v === 0 ? undefined : v),
        z.union([RobloxAssetIdSchema, RobloxUserIdSchema]).optional()
    ),
    token:      z.string().optional(),
    type:       z.string().optional(),
    size:       z.string().optional(),
    format:     z.string().optional(),
    isCircular: z.boolean().optional(),
})

export const RobloxThumbnailTargetSchema = RobloxThumbnailTargetBaseSchema.refine(
    (v) => (v.targetId != null) !== (v.token != null),
    { message: 'Exactly one of targetId or token must be provided' }
)

export const RobloxThumbnailRawSchema = RobloxThumbnailTargetBaseSchema.extend({
    imageUrl: z.string().nullable(),
    state:    z.string(),
    version:  z.string(),
})

export const RobloxThumbnailSchema = RobloxThumbnailTargetBaseSchema.extend({
    url:     z.string().nullable(),
    state:   z.string(),
    version: z.string(),
})

export type RobloxThumbnailTargetBase = z.infer<typeof RobloxThumbnailTargetBaseSchema>
export type RobloxThumbnailTarget     = z.infer<typeof RobloxThumbnailTargetSchema>
export type RobloxThumbnailRaw        = z.infer<typeof RobloxThumbnailRawSchema>
export type RobloxThumbnail           = z.infer<typeof RobloxThumbnailSchema>


// ── Server ───────────────────────────────────────────────

export const RobloxServerEntrySchema = z.object({
    jobId:      RobloxJobIdSchema,
    maxPlayers: z.number(),
    playing:    z.number(),
    fps:        z.number(),
    ping:       z.number(),
    playerImgs: z.array(z.string()),
})

export const RobloxServerLocationSchema = z.object({
    ip:          z.string(),
    jobId:       RobloxJobIdSchema,
    countryCode: z.string(),
    countryName: z.string(),
    regionName:  z.string(),
    city:        z.string(),
    latitude:    z.number(),
    longitude:   z.number(),
    isp:         z.string(),
    timezone:    z.string(),
})

export const RobloxServerEntryWithLocationSchema = RobloxServerEntrySchema.extend({
    location: RobloxServerLocationSchema.nullable(),
})

export function robloxServersResultSchema<E extends z.ZodTypeAny>(entrySchema: E) {
    return z.object({
        previousPageCursor: z.string().nullable(),
        nextPageCursor:     z.string().nullable(),
        data:               z.array(entrySchema),
    })
}

export type RobloxServerEntry             = z.infer<typeof RobloxServerEntrySchema>
export type RobloxServerEntryWithLocation = z.infer<typeof RobloxServerEntryWithLocationSchema>
export type RobloxServerLocation          = z.infer<typeof RobloxServerLocationSchema>
export type RobloxServersResult<E extends RobloxServerEntry = RobloxServerEntry> = {
    previousPageCursor: string | null
    nextPageCursor:     string | null
    data:               E[]
}


// ── Presence ─────────────────────────────────────────────

export const RobloxPresenceEntrySchema = z.object({
    userId:           RobloxUserIdSchema,
    userPresenceType: z.number(),
    lastLocation:     z.string(),
    placeId:          RobloxPlaceIdSchema.nullable(),
    rootPlaceId:      RobloxPlaceIdSchema.nullable(),
    gameId:           RobloxJobIdSchema.nullable(),
    universeId:       RobloxUniverseIdSchema.nullable(),
    lastOnline:       z.string(),
})

export type RobloxPresenceEntry = z.infer<typeof RobloxPresenceEntrySchema>


// ── Place ────────────────────────────────────────────────

export const RobloxPlaceInfoSchema = z.object({
    placeId:     RobloxPlaceIdSchema,
    universeId:  RobloxUniverseIdSchema.nullable(),
    name:        z.string(),
    description: z.string(),
    creator: z.object({
        id:   z.number(),
        name: z.string(),
        type: z.string(),
    }),
    price:      z.number().nullable(),
    playing:    z.number(),
    visits:     z.number(),
    maxPlayers: z.number(),
    created:    z.string(),
    updated:    z.string(),
    logos:      z.array(z.string()),
})

export type RobloxPlaceInfo = z.infer<typeof RobloxPlaceInfoSchema>


// ── Friend ───────────────────────────────────────────────

export const RobloxFriendEntrySchema = z.object({
    id:               RobloxUserIdSchema,
    name:             RobloxUserNameSchema,
    displayName:      RobloxDisplayNameSchema,
    hasVerifiedBadge: z.boolean().optional(),
    isOnline:         z.boolean().optional(),
    isDeleted:        z.boolean().optional(),
    friendFrom:       z.string().nullable().optional(),
})

export type RobloxFriendEntry = z.infer<typeof RobloxFriendEntrySchema>


// ── Raw API response shapes ──────────────────────────────────

export const RobloxServerRawSchema = z.object({
    id:           RobloxJobIdSchema,
    maxPlayers:   z.number(),
    playing:      z.number(),
    fps:          z.number(),
    ping:         z.number(),
    playerTokens: z.array(z.string()),
}).passthrough()

export type RobloxServerRaw = z.infer<typeof RobloxServerRawSchema>

export const RobloxServersPageRawSchema = robloxServersResultSchema(RobloxServerRawSchema)
export type RobloxServersPageRaw = z.infer<typeof RobloxServersPageRawSchema>


export const GamejoinResponseSchema = z.object({
    joinScript: z.object({
        MachineAddress:   z.string().optional(),
        UdmuxEndpoints:   z.array(z.object({ Address: z.string(), Port: z.number() })).optional(),
    }).optional(),
})

export type GamejoinResponse = z.infer<typeof GamejoinResponseSchema>


// ── Place info sub-responses ────────────────────────────────

export const RobloxUniverseFromPlaceRawSchema = z.object({
    universeId: z.number().optional(),
}).passthrough()

export const RobloxUniverseFromPlaceSchema = z.object({
    placeId:    z.number(),
    universeId: z.number().nullable(),
})

export const RobloxGameDetailsRawSchema = z.object({}).passthrough()

export const RobloxGameMediaEntrySchema = z.object({
    imageId: z.number().optional(),
}).passthrough()

export type RobloxUniverseFromPlaceRaw = z.infer<typeof RobloxUniverseFromPlaceRawSchema>
export type RobloxUniverseFromPlace    = z.infer<typeof RobloxUniverseFromPlaceSchema>
export type RobloxGameDetailsRaw       = z.infer<typeof RobloxGameDetailsRawSchema>
export type RobloxGameMediaEntry       = z.infer<typeof RobloxGameMediaEntrySchema>


// ── IP geolocation (serversRegion) ──────────────────────────

export const RobloxIpGeoRawSchema = z.object({
    country_code2: z.string().optional(),
    country_name:  z.string().optional(),
    state_prov:    z.string().optional(),
    city:          z.string().optional(),
    latitude:      z.union([z.string(), z.number()]).optional(),
    longitude:     z.union([z.string(), z.number()]).optional(),
    isp:           z.string().optional(),
    time_zone:     z.object({ name: z.string().optional() }).passthrough().optional(),
}).passthrough()

export type RobloxIpGeoRaw = z.infer<typeof RobloxIpGeoRawSchema>


// ── Thumbnail batch (requestId-tagged) ──────────────────────

export const RobloxThumbnailRawWithRequestIdSchema = RobloxThumbnailRawSchema.extend({
    requestId: z.string(),
})

export type RobloxThumbnailRawWithRequestId = z.infer<typeof RobloxThumbnailRawWithRequestIdSchema>