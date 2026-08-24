import { z } from 'zod'

export const RobloxUserIdSchema = z
    .number()
    .int()
    .positive()
    .min(1)
    .max(100_000_000_000)
    .brand<'RobloxApi::Roblox_UserId'>()

export const RobloxUserNameSchema = z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9_]+$/, 'Roblox username may only contain letters, numbers, and underscores')
    .refine((v) => !v.startsWith('_') && !v.endsWith('_'), {
        message: 'Username cannot start or end with an underscore',
    })
    .refine((v) => !v.includes('__'), {
        message: 'Username cannot contain consecutive underscores',
    })
    .brand<'RobloxApi::Roblox_UserName'>()

export const RobloxDisplayNameSchema = z
    .string()
    .min(3)
    .max(20)
    .brand<'RobloxApi::Roblox_UserDisplayName'>()

export const RobloxCookieSchema = z
    .string()
    .min(50)
    .startsWith(
        '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_',
        { message: 'Not a valid .ROBLOSECURITY cookie' }
    )
    .brand<'RobloxApi::Roblox_Cookie'>()

export const RobloxPlaceIdSchema = z
    .number()
    .int()
    .positive()
    .min(1)
    .max(100_000_000_000)
    .brand<'RobloxApi::Roblox_PlaceId'>()

export const RobloxUniverseIdSchema = z
    .number()
    .int()
    .positive()
    .min(1)
    .max(100_000_000_000)
    .brand<'RobloxApi::Roblox_UniverseId'>()

export const RobloxJobIdSchema = z
    .string()
    .uuid('JobId must be a valid UUID')
    .brand<'RobloxApi::Roblox_JobId'>()

export const RobloxAssetIdSchema = z
    .number()
    .int()
    .positive()
    .min(1)
    .max(100_000_000_000)
    .brand<'RobloxApi::Roblox_AssetId'>()

export type RobloxUserId      = z.infer<typeof RobloxUserIdSchema>
export type RobloxUserName    = z.infer<typeof RobloxUserNameSchema>
export type RobloxDisplayName = z.infer<typeof RobloxDisplayNameSchema>
export type RobloxCookie      = z.infer<typeof RobloxCookieSchema>
export type RobloxPlaceId     = z.infer<typeof RobloxPlaceIdSchema>
export type RobloxUniverseId  = z.infer<typeof RobloxUniverseIdSchema>
export type RobloxJobId       = z.infer<typeof RobloxJobIdSchema>
export type RobloxAssetId     = z.infer<typeof RobloxAssetIdSchema>

export function isRobloxUserId(value: number): value is RobloxUserId { return RobloxUserIdSchema.safeParse(value).success }
export function isRobloxUserName(value: string): value is RobloxUserName { return RobloxUserNameSchema.safeParse(value).success }
export function isRobloxDisplayName(value: string): value is RobloxDisplayName { return RobloxDisplayNameSchema.safeParse(value).success }
export function isRobloxCookie(value: string): value is RobloxCookie { return RobloxCookieSchema.safeParse(value).success }
export function isRobloxPlaceId(value: number): value is RobloxPlaceId { return RobloxPlaceIdSchema.safeParse(value).success }
export function isRobloxUniverseId(value: number): value is RobloxUniverseId { return RobloxUniverseIdSchema.safeParse(value).success }
export function isRobloxJobId(value: string): value is RobloxJobId { return RobloxJobIdSchema.safeParse(value).success }
export function isRobloxAssetId(value: number): value is RobloxAssetId { return RobloxAssetIdSchema.safeParse(value).success }
