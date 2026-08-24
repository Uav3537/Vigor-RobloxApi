import { z } from 'zod'
import { vigor } from 'vigor-fetch'

import { RobloxCookie, RobloxUserId } from '@/types/branded'
import {
    RobloxUserSimple,
    RobloxUser,
    RobloxAuthenticatedUser,
    RobloxUserDescription,
    RobloxUserBirthdate,
    RobloxUserGender,
    RobloxUserAgeBracket,
    RobloxUserCountryCode,
    RobloxUserRoles,
    RobloxUserSimpleSchema,
    RobloxUserSchema,
    RobloxUserDescriptionSchema,
    RobloxUserBirthdateSchema,
    RobloxUserGenderSchema,
    RobloxUserAgeBracketSchema,
    RobloxUserCountryCodeSchema,
    RobloxUserRolesSchema,
} from '@/types/responses'

import { CsrfTokenManager } from '@/lib/csrf'
import { createNetworkClients } from '@/lib/network'
import { createCacheHelpers } from '@/lib/cache'
import { makeHeaderMiddlewares, pickKeyValidated, validate } from '@/lib/middlewares'
import { chunk } from '@/lib/tools'

export type UsersApiDeps = {
    usersApi:    ReturnType<typeof createNetworkClients>['usersApi']
    csrfManager: CsrfTokenManager
    withCache:   ReturnType<typeof createCacheHelpers>['withCache']
}

export function createUsersApi({ usersApi, csrfManager, withCache }: UsersApiDeps) {

    async function authenticated(cookies: RobloxCookie[]): Promise<RobloxAuthenticatedUser[]> {
        const results = await vigor.all(...cookies.map(cookie => async () => {
            const base = usersApi.middlewares(makeHeaderMiddlewares({ getCookie: () => cookie, csrfManager, winInet: true }))

            const [user, description, birthdate, gender, ageBracket, countryCode, roles] = await Promise.allSettled([
                base.path('users', 'authenticated').middlewares(validate(RobloxUserSimpleSchema)).request<RobloxUserSimple>(),
                base.path('description').middlewares(validate(RobloxUserDescriptionSchema)).request<RobloxUserDescription>(),
                base.path('birthdate').middlewares(validate(RobloxUserBirthdateSchema)).request<RobloxUserBirthdate>(),
                base.path('gender').middlewares(validate(RobloxUserGenderSchema)).request<RobloxUserGender>(),
                base.path('users', 'authenticated', 'age-bracket').middlewares(validate(RobloxUserAgeBracketSchema)).request<RobloxUserAgeBracket>(),
                base.path('users', 'authenticated', 'country-code').middlewares(validate(RobloxUserCountryCodeSchema)).request<RobloxUserCountryCode>(),
                base.path('users', 'authenticated', 'roles').middlewares(validate(RobloxUserRolesSchema)).request<RobloxUserRoles>(),
            ])
            if (user.status === 'rejected') throw user.reason

            return {
                ...user.value,
                ...(description.status === 'fulfilled' ? description.value : {}),
                ...(birthdate.status   === 'fulfilled' ? birthdate.value   : {}),
                ...(gender.status      === 'fulfilled' ? gender.value      : {}),
                ...(ageBracket.status  === 'fulfilled' ? ageBracket.value  : {}),
                ...(countryCode.status === 'fulfilled' ? countryCode.value : {}),
                ...(roles.status       === 'fulfilled' ? roles.value       : {}),
            } satisfies RobloxAuthenticatedUser
        })).request<RobloxAuthenticatedUser[]>()

        return results
    }

    async function usersSimple(userIds: RobloxUserId[]): Promise<RobloxUserSimple[]> {
        return withCache<RobloxUserSimple>({
            type:     'usersSimple',
            ttlKey:   'usersSimple',
            keys:     userIds.map(String),
            getKey:   item => String(item.id),
            fallback: {} as RobloxUserSimple,
            fetchMissing: async missing => {
                const grouped = await vigor.all(
                    ...chunk(missing.map(Number), 100).map(group => () =>
                        usersApi
                            .path('users')
                            .body("overwrite", { userIds: group, excludeBannedUsers: false })
                            .middlewares(pickKeyValidated('data', z.array(RobloxUserSimpleSchema)))
                            .request<RobloxUserSimple[]>()
                    )
                ).request<RobloxUserSimple[][]>()
                const results = grouped.flat()
                return results.filter(u => u.id != null && u.name != null && u.displayName != null)
            },
        })
    }

    async function users(userIds: RobloxUserId[]): Promise<RobloxUser[]> {
        return withCache<RobloxUser>({
            type:     'users',
            ttlKey:   'users',
            keys:     userIds.map(String),
            getKey:   item => String(item.id),
            fallback: {} as RobloxUser,
            fetchMissing: async missing => {
                const results = await vigor.all(
                    ...missing.map(id => () =>
                        usersApi.path('users', id).middlewares(validate(RobloxUserSchema)).request<RobloxUser>()
                    )
                )
                .settings(s => s.concurrency(2))
                .request<RobloxUser[]>()
                return results.filter(
                    u => u.id != null && u.name != null && u.displayName != null && u.description != null
                )
            },
        })
    }

    return { authenticated, usersSimple, users }
}
