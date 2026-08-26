import { z } from 'zod';

declare const RobloxUserIdSchema: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">;
declare const RobloxUserNameSchema: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserName", "out">;
declare const RobloxDisplayNameSchema: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserDisplayName", "out">;
declare const RobloxCookieSchema: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_Cookie", "out">;
declare const RobloxPlaceIdSchema: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_PlaceId", "out">;
declare const RobloxUniverseIdSchema: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UniverseId", "out">;
declare const RobloxJobIdSchema: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
declare const RobloxAssetIdSchema: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_AssetId", "out">;
type RobloxUserId = z.infer<typeof RobloxUserIdSchema>;
type RobloxUserName = z.infer<typeof RobloxUserNameSchema>;
type RobloxDisplayName = z.infer<typeof RobloxDisplayNameSchema>;
type RobloxCookie = z.infer<typeof RobloxCookieSchema>;
type RobloxPlaceId = z.infer<typeof RobloxPlaceIdSchema>;
type RobloxUniverseId = z.infer<typeof RobloxUniverseIdSchema>;
type RobloxJobId = z.infer<typeof RobloxJobIdSchema>;
type RobloxAssetId = z.infer<typeof RobloxAssetIdSchema>;
declare function isRobloxUserId(value: number): value is RobloxUserId;
declare function isRobloxUserName(value: string): value is RobloxUserName;
declare function isRobloxDisplayName(value: string): value is RobloxDisplayName;
declare function isRobloxCookie(value: string): value is RobloxCookie;
declare function isRobloxPlaceId(value: number): value is RobloxPlaceId;
declare function isRobloxUniverseId(value: number): value is RobloxUniverseId;
declare function isRobloxJobId(value: string): value is RobloxJobId;
declare function isRobloxAssetId(value: number): value is RobloxAssetId;

declare const RobloxUserSimpleSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">;
    name: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserName", "out">;
    displayName: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserDisplayName", "out">;
    hasVerifiedBadge: z.ZodBoolean;
    requestedUsername: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const RobloxUserSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">;
    name: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserName", "out">;
    displayName: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserDisplayName", "out">;
    hasVerifiedBadge: z.ZodBoolean;
    requestedUsername: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    externalAppDisplayName: z.ZodNullable<z.ZodString>;
    isBanned: z.ZodBoolean;
    created: z.ZodString;
}, z.core.$strip>;
type RobloxUserSimple = z.infer<typeof RobloxUserSimpleSchema>;
type RobloxUser = z.infer<typeof RobloxUserSchema>;
declare const RobloxUserDescriptionSchema: z.ZodObject<{
    description: z.ZodString;
}, z.core.$strip>;
declare const RobloxUserBirthdateSchema: z.ZodObject<{
    birthYear: z.ZodNumber;
    birthMonth: z.ZodNumber;
    birthDay: z.ZodNumber;
}, z.core.$strip>;
declare const RobloxUserGenderSchema: z.ZodObject<{
    gender: z.ZodNumber;
}, z.core.$strip>;
declare const RobloxUserAgeBracketSchema: z.ZodObject<{
    ageBracket: z.ZodNumber;
}, z.core.$strip>;
declare const RobloxUserCountryCodeSchema: z.ZodObject<{
    countryCode: z.ZodString;
}, z.core.$strip>;
declare const RobloxUserRolesSchema: z.ZodObject<{
    roles: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
type RobloxUserDescription = z.infer<typeof RobloxUserDescriptionSchema>;
type RobloxUserBirthdate = z.infer<typeof RobloxUserBirthdateSchema>;
type RobloxUserGender = z.infer<typeof RobloxUserGenderSchema>;
type RobloxUserAgeBracket = z.infer<typeof RobloxUserAgeBracketSchema>;
type RobloxUserCountryCode = z.infer<typeof RobloxUserCountryCodeSchema>;
type RobloxUserRoles = z.infer<typeof RobloxUserRolesSchema>;
type RobloxAuthenticatedUser = RobloxUserSimple & Partial<RobloxUserDescription> & Partial<RobloxUserBirthdate> & Partial<RobloxUserGender> & Partial<RobloxUserAgeBracket> & Partial<RobloxUserCountryCode> & Partial<RobloxUserRoles>;
declare const RobloxThumbnailTargetSchema: z.ZodObject<{
    targetId: z.ZodPreprocess<z.ZodOptional<z.ZodUnion<readonly [z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_AssetId", "out">, z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">]>>>;
    token: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodString>;
    isCircular: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const RobloxThumbnailRawSchema: z.ZodObject<{
    targetId: z.ZodPreprocess<z.ZodOptional<z.ZodUnion<readonly [z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_AssetId", "out">, z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">]>>>;
    token: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodString>;
    isCircular: z.ZodOptional<z.ZodBoolean>;
    imageUrl: z.ZodNullable<z.ZodString>;
    state: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
declare const RobloxThumbnailSchema: z.ZodObject<{
    targetId: z.ZodPreprocess<z.ZodOptional<z.ZodUnion<readonly [z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_AssetId", "out">, z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">]>>>;
    token: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodString>;
    isCircular: z.ZodOptional<z.ZodBoolean>;
    url: z.ZodNullable<z.ZodString>;
    state: z.ZodString;
    version: z.ZodString;
}, z.core.$strip>;
type RobloxThumbnailTarget = z.infer<typeof RobloxThumbnailTargetSchema>;
type RobloxThumbnailRaw = z.infer<typeof RobloxThumbnailRawSchema>;
type RobloxThumbnail = z.infer<typeof RobloxThumbnailSchema>;
declare const RobloxServerEntrySchema: z.ZodObject<{
    jobId: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
    maxPlayers: z.ZodNumber;
    playing: z.ZodNumber;
    fps: z.ZodNumber;
    ping: z.ZodNumber;
    playerImgs: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
declare const RobloxServerLocationSchema: z.ZodObject<{
    ip: z.ZodString;
    jobId: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
    countryCode: z.ZodString;
    countryName: z.ZodString;
    regionName: z.ZodString;
    city: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    isp: z.ZodString;
    timezone: z.ZodString;
}, z.core.$strip>;
declare const RobloxServerEntryWithLocationSchema: z.ZodObject<{
    jobId: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
    maxPlayers: z.ZodNumber;
    playing: z.ZodNumber;
    fps: z.ZodNumber;
    ping: z.ZodNumber;
    playerImgs: z.ZodArray<z.ZodString>;
    location: z.ZodNullable<z.ZodObject<{
        ip: z.ZodString;
        jobId: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
        countryCode: z.ZodString;
        countryName: z.ZodString;
        regionName: z.ZodString;
        city: z.ZodString;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        isp: z.ZodString;
        timezone: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare function robloxServersResultSchema<E extends z.ZodTypeAny>(entrySchema: E): z.ZodObject<{
    previousPageCursor: z.ZodNullable<z.ZodString>;
    nextPageCursor: z.ZodNullable<z.ZodString>;
    data: z.ZodArray<E>;
}, z.core.$strip>;
type RobloxServerEntry = z.infer<typeof RobloxServerEntrySchema>;
type RobloxServerEntryWithLocation = z.infer<typeof RobloxServerEntryWithLocationSchema>;
type RobloxServerLocation = z.infer<typeof RobloxServerLocationSchema>;
type RobloxServersResult<E extends RobloxServerEntry = RobloxServerEntry> = {
    previousPageCursor: string | null;
    nextPageCursor: string | null;
    data: E[];
};
declare const RobloxPresenceEntrySchema: z.ZodObject<{
    userId: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">;
    userPresenceType: z.ZodNumber;
    lastLocation: z.ZodString;
    placeId: z.ZodNullable<z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_PlaceId", "out">>;
    rootPlaceId: z.ZodNullable<z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_PlaceId", "out">>;
    gameId: z.ZodNullable<z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">>;
    universeId: z.ZodNullable<z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UniverseId", "out">>;
    lastOnline: z.ZodString;
}, z.core.$strip>;
type RobloxPresenceEntry = z.infer<typeof RobloxPresenceEntrySchema>;
declare const RobloxPlaceInfoSchema: z.ZodObject<{
    placeId: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_PlaceId", "out">;
    universeId: z.ZodNullable<z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UniverseId", "out">>;
    name: z.ZodString;
    description: z.ZodString;
    creator: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        type: z.ZodString;
    }, z.core.$strip>;
    price: z.ZodNullable<z.ZodNumber>;
    playing: z.ZodNumber;
    visits: z.ZodNumber;
    maxPlayers: z.ZodNumber;
    created: z.ZodString;
    updated: z.ZodString;
    logos: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
type RobloxPlaceInfo = z.infer<typeof RobloxPlaceInfoSchema>;
declare const RobloxFriendEntrySchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">;
    name: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserName", "out">;
    displayName: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_UserDisplayName", "out">;
    hasVerifiedBadge: z.ZodOptional<z.ZodBoolean>;
    isOnline: z.ZodOptional<z.ZodBoolean>;
    isDeleted: z.ZodOptional<z.ZodBoolean>;
    friendFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
type RobloxFriendEntry = z.infer<typeof RobloxFriendEntrySchema>;
declare const RobloxServerRawSchema: z.ZodObject<{
    id: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
    maxPlayers: z.ZodNumber;
    playing: z.ZodNumber;
    fps: z.ZodNumber;
    ping: z.ZodNumber;
    playerTokens: z.ZodArray<z.ZodString>;
}, z.core.$loose>;
type RobloxServerRaw = z.infer<typeof RobloxServerRawSchema>;
declare const RobloxServersPageRawSchema: z.ZodObject<{
    previousPageCursor: z.ZodNullable<z.ZodString>;
    nextPageCursor: z.ZodNullable<z.ZodString>;
    data: z.ZodArray<z.ZodObject<{
        id: z.core.$ZodBranded<z.ZodString, "RobloxApi::Roblox_JobId", "out">;
        maxPlayers: z.ZodNumber;
        playing: z.ZodNumber;
        fps: z.ZodNumber;
        ping: z.ZodNumber;
        playerTokens: z.ZodArray<z.ZodString>;
    }, z.core.$loose>>;
}, z.core.$strip>;
type RobloxServersPageRaw = z.infer<typeof RobloxServersPageRawSchema>;
declare const GamejoinResponseSchema: z.ZodObject<{
    joinScript: z.ZodOptional<z.ZodObject<{
        MachineAddress: z.ZodOptional<z.ZodString>;
        UdmuxEndpoints: z.ZodOptional<z.ZodArray<z.ZodObject<{
            Address: z.ZodString;
            Port: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type GamejoinResponse = z.infer<typeof GamejoinResponseSchema>;
declare const RobloxUniverseFromPlaceRawSchema: z.ZodObject<{
    universeId: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
declare const RobloxUniverseFromPlaceSchema: z.ZodObject<{
    placeId: z.ZodNumber;
    universeId: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
declare const RobloxGameDetailsRawSchema: z.ZodObject<{}, z.core.$loose>;
declare const RobloxGameMediaEntrySchema: z.ZodObject<{
    imageId: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
type RobloxUniverseFromPlaceRaw = z.infer<typeof RobloxUniverseFromPlaceRawSchema>;
type RobloxUniverseFromPlace = z.infer<typeof RobloxUniverseFromPlaceSchema>;
type RobloxGameDetailsRaw = z.infer<typeof RobloxGameDetailsRawSchema>;
type RobloxGameMediaEntry = z.infer<typeof RobloxGameMediaEntrySchema>;
declare const RobloxIpGeoRawSchema: z.ZodObject<{
    country_code2: z.ZodOptional<z.ZodString>;
    country_name: z.ZodOptional<z.ZodString>;
    state_prov: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    latitude: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    longitude: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    isp: z.ZodOptional<z.ZodString>;
    time_zone: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
}, z.core.$loose>;
type RobloxIpGeoRaw = z.infer<typeof RobloxIpGeoRawSchema>;
declare const RobloxThumbnailRawWithRequestIdSchema: z.ZodObject<{
    targetId: z.ZodPreprocess<z.ZodOptional<z.ZodUnion<readonly [z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_AssetId", "out">, z.core.$ZodBranded<z.ZodNumber, "RobloxApi::Roblox_UserId", "out">]>>>;
    token: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodString>;
    isCircular: z.ZodOptional<z.ZodBoolean>;
    imageUrl: z.ZodNullable<z.ZodString>;
    state: z.ZodString;
    version: z.ZodString;
    requestId: z.ZodString;
}, z.core.$strip>;
type RobloxThumbnailRawWithRequestId = z.infer<typeof RobloxThumbnailRawWithRequestIdSchema>;

interface RobloxApiCache {
    select: <T>(type: string, separators: string[]) => Promise<Array<{
        separator: string;
        data: T;
    }>>;
    upsert: <T>(type: string, expire: number, items: Array<{
        separator: string;
        data: T;
    }>) => Promise<void>;
}
/**
 * Per-resource TTL overrides (milliseconds), passed to `createRobloxApi({ ttl })`.
 * Any key left unset falls back to its built-in default (see DEFAULT_TTL_CONFIG).
 * Setting a key to `0` disables caching entirely for that resource: every call
 * fetches fresh data and nothing is read from or written to the cache.
 */
interface RobloxTtlConfig {
    usersSimple?: number;
    users?: number;
    usernames?: number;
    thumbnailAssets?: number;
    thumbnails?: number;
    serversSimple?: number;
    friends?: number;
    placeInfo?: number;
    serverLocationJob?: number;
    serverLocationIp?: number;
    serverLocationMachine?: number;
}
type ResolvedTtlConfig = Required<RobloxTtlConfig>;
declare const DEFAULT_TTL_CONFIG: ResolvedTtlConfig;
declare function resolveTtlConfig(ttl?: RobloxTtlConfig): ResolvedTtlConfig;

interface CreateRobloxApiOptions {
    cache: RobloxApiCache;
    cookies: RobloxCookie[];
    ipgeolocationKey: string;
    /** Per-resource cache TTL overrides. See RobloxTtlConfig for defaults / disabling. */
    ttl?: RobloxTtlConfig;
}
interface ServersOpts {
    placeId: RobloxPlaceId;
    count?: number;
    serverType?: 'Public' | 'Friend';
    cursor?: string;
    thumbnailFormat?: Partial<RobloxThumbnailTarget>;
}
type WithImg<T> = T & {
    img: string | null;
};

declare function createRobloxApi({ cache, cookies: cookiesList, ipgeolocationKey, ttl, }: CreateRobloxApiOptions): {
    authenticated: (cookies: RobloxCookie[]) => Promise<RobloxAuthenticatedUser[]>;
    usersSimple: (userIds: RobloxUserId[]) => Promise<RobloxUserSimple[]>;
    users: (userIds: RobloxUserId[]) => Promise<RobloxUser[]>;
    usersByName: (usernames: string[]) => Promise<RobloxUserSimple[]>;
    thumbnailAssets: (opts: {
        assetIds: RobloxAssetId[];
        size?: string;
        format?: string;
    }) => Promise<RobloxThumbnail[]>;
    thumbnailsBatch: (targets: RobloxThumbnailTarget[], formatDefaults?: Partial<RobloxThumbnailTarget>) => Promise<RobloxThumbnail[]>;
    serversSimple: (opts: ServersOpts) => Promise<RobloxServersResult<RobloxServerEntry>>;
    servers: (opts: ServersOpts) => Promise<RobloxServersResult<RobloxServerEntryWithLocation>>;
    presence: (userIds: RobloxUserId[]) => Promise<RobloxPresenceEntry[]>;
    placeInfo: (placeIds: RobloxPlaceId[]) => Promise<RobloxPlaceInfo[]>;
    usersSimpleWithImg: (userIds: RobloxUserId[]) => Promise<WithImg<RobloxUserSimple>[]>;
    usersWithImg: (userIds: RobloxUserId[]) => Promise<WithImg<RobloxUser>[]>;
    usersByNamesWithImg: (usernames: string[]) => Promise<WithImg<RobloxUserSimple>[]>;
    track: (opts: {
        placeId: RobloxPlaceId;
        targets: Array<string | number>;
    }) => Promise<Array<{
        user: WithImg<RobloxUserSimple>;
        server: (RobloxServerEntry & {
            location: RobloxServerLocation | null;
        }) | null;
    }>>;
    serversRegion: (opts: {
        placeId: RobloxPlaceId;
        jobIds: RobloxJobId[];
    }) => Promise<RobloxServerLocation[]>;
    friends: (userId: RobloxUserId) => Promise<RobloxFriendEntry[]>;
    sendFriendRequest: (targetUserId: RobloxUserId) => Promise<void>;
    unfriend: (targetUserId: RobloxUserId) => Promise<void>;
};
type RobloxApi = ReturnType<typeof createRobloxApi>;

export { type CreateRobloxApiOptions, DEFAULT_TTL_CONFIG, type GamejoinResponse, GamejoinResponseSchema, type ResolvedTtlConfig, type RobloxApi, type RobloxApiCache, type RobloxAssetId, RobloxAssetIdSchema, type RobloxAuthenticatedUser, type RobloxCookie, RobloxCookieSchema, type RobloxDisplayName, RobloxDisplayNameSchema, type RobloxFriendEntry, RobloxFriendEntrySchema, type RobloxGameDetailsRaw, RobloxGameDetailsRawSchema, type RobloxGameMediaEntry, RobloxGameMediaEntrySchema, type RobloxIpGeoRaw, RobloxIpGeoRawSchema, type RobloxJobId, RobloxJobIdSchema, type RobloxPlaceId, RobloxPlaceIdSchema, type RobloxPlaceInfo, RobloxPlaceInfoSchema, type RobloxPresenceEntry, RobloxPresenceEntrySchema, type RobloxServerEntry, RobloxServerEntrySchema, type RobloxServerEntryWithLocation, RobloxServerEntryWithLocationSchema, type RobloxServerLocation, RobloxServerLocationSchema, type RobloxServerRaw, RobloxServerRawSchema, type RobloxServersPageRaw, RobloxServersPageRawSchema, type RobloxServersResult, type RobloxThumbnail, type RobloxThumbnailRaw, RobloxThumbnailRawSchema, type RobloxThumbnailRawWithRequestId, RobloxThumbnailRawWithRequestIdSchema, RobloxThumbnailSchema, type RobloxThumbnailTarget, RobloxThumbnailTargetSchema, type RobloxTtlConfig, type RobloxUniverseFromPlace, type RobloxUniverseFromPlaceRaw, RobloxUniverseFromPlaceRawSchema, RobloxUniverseFromPlaceSchema, type RobloxUniverseId, RobloxUniverseIdSchema, type RobloxUser, type RobloxUserAgeBracket, RobloxUserAgeBracketSchema, type RobloxUserBirthdate, RobloxUserBirthdateSchema, type RobloxUserCountryCode, RobloxUserCountryCodeSchema, type RobloxUserDescription, RobloxUserDescriptionSchema, type RobloxUserGender, RobloxUserGenderSchema, type RobloxUserId, RobloxUserIdSchema, type RobloxUserName, RobloxUserNameSchema, type RobloxUserRoles, RobloxUserRolesSchema, RobloxUserSchema, type RobloxUserSimple, RobloxUserSimpleSchema, type ServersOpts, type WithImg, createRobloxApi, isRobloxAssetId, isRobloxCookie, isRobloxDisplayName, isRobloxJobId, isRobloxPlaceId, isRobloxUniverseId, isRobloxUserId, isRobloxUserName, resolveTtlConfig, robloxServersResultSchema };
