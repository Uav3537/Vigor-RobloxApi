import { RobloxUserId } from '@/types/branded'
import { RobloxUserSimple, RobloxUser } from '@/types/responses'
import { WithImg } from '@/types/api'

import { createUsersApi } from '@/apis/users'
import { createUsersByNameApi } from '@/apis/usersByName'
import { createThumbnailsApi } from '@/apis/thumbnails'

export type WithImgApiDeps = {
    usersSimple:     ReturnType<typeof createUsersApi>['usersSimple']
    users:           ReturnType<typeof createUsersApi>['users']
    usersByName:     ReturnType<typeof createUsersByNameApi>['usersByName']
    thumbnailsBatch: ReturnType<typeof createThumbnailsApi>['thumbnailsBatch']
}

export function createWithImgApi({ usersSimple, users, usersByName, thumbnailsBatch }: WithImgApiDeps) {

    async function usersSimpleWithImg(userIds: RobloxUserId[]): Promise<WithImg<RobloxUserSimple>[]> {
        const [userList, thumbs] = await Promise.all([
            usersSimple(userIds),
            thumbnailsBatch(userIds.map(id => ({ targetId: id }))),
        ])
        const imgMap = new Map(thumbs.map(t => [t.targetId, t.url]))
        return userList.map(u => ({ ...u, img: imgMap.get(u.id) ?? null }))
    }

    async function usersWithImg(userIds: RobloxUserId[]): Promise<WithImg<RobloxUser>[]> {
        const [userList, thumbs] = await Promise.all([
            users(userIds),
            thumbnailsBatch(userIds.map(id => ({ targetId: id }))),
        ])
        const imgMap = new Map(thumbs.map(t => [t.targetId, t.url]))
        return userList.map(u => ({ ...u, img: imgMap.get(u.id) ?? null }))
    }

    async function usersByNamesWithImg(usernames: string[]): Promise<WithImg<RobloxUserSimple>[]> {
        const userList = await usersByName(usernames)
        const thumbs = await thumbnailsBatch(userList.map(u => ({ targetId: u.id })))
        const imgMap = new Map(thumbs.map(t => [t.targetId, t.url]))
        return userList.map(u => ({ ...u, img: imgMap.get(u.id) ?? null }))
    }

    return { usersSimpleWithImg, usersWithImg, usersByNamesWithImg }
}
