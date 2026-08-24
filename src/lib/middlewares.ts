import { z } from 'zod'
import vigor, { VigorFetchError } from 'vigor-fetch'
import { RobloxCookie } from '@/types/branded'
import { CsrfTokenManager } from './csrf'

export type VigorFetchFailedData = {
    status:     number
    statusText: string
    response:   Response
    url:        string
    parsed:     unknown
}

export function isFetchFailed(cause: unknown): cause is VigorFetchError<'FETCH_FAILED', any> & { data: VigorFetchFailedData } {
    return cause instanceof VigorFetchError && cause.code === 'FETCH_FAILED' && cause.data != null
}

/**
 * Builds the before/after middleware chain that attaches the ROBLOSECURITY cookie
 * (and optionally a WinInet user-agent + CSRF token) to every request, with
 * automatic CSRF token refresh + retry on a 403 response.
 */
export function makeHeaderMiddlewares(opts: {
    getCookie:   () => RobloxCookie
    csrfManager: CsrfTokenManager
    winInet?:    boolean
    csrf?:       boolean
}) {
    const { getCookie, csrfManager, winInet = false, csrf = false } = opts

    let builder = vigor.builders.fetch.middlewares()
        .before("intercept", async (ctx, api) => {
            const cookie = getCookie()
            ctx.record.cookie = cookie

            const headers: Record<string, string> = {
                Cookie: `.ROBLOSECURITY=${cookie}`,
            }
            if (winInet) headers['User-Agent'] = 'Roblox/WinInet'
            if (csrf)    headers['X-CSRF-Token'] = await csrfManager.getOrRefresh(cookie)

            api.setHeaders(headers)
            return ctx
        })

    if (csrf) {
        builder = builder.onError("intercept", async (ctx, api) => {
            const cause = ctx.error
            if (isFetchFailed(cause) && cause.data.status === 403) {
                const cookie: RobloxCookie = ctx.record.cookie ?? getCookie()
                const newToken = cause.data.response.headers.get('x-csrf-token')

                if (newToken) {
                    csrfManager.set(cookie, newToken)
                } else {
                    csrfManager.invalidate(cookie)
                    await csrfManager.refresh(cookie)
                }
                api.proceedRestart()
            }
            return ctx
        })
    }

    return builder
}

/** Unwraps a single key from the parsed response body, e.g. `{ data: [...] }` -> `[...]`. */
export function pickKey(key: string) {
    return vigor.builders.fetch.middlewares()
        .after("intercept", async (ctx, api) => {
            api.setResult((ctx.result as Record<string, unknown>)[key])
            return ctx
        })
}

export const dataInterceptor = pickKey('data')

/**
 * 응답 body를 주어진 zod 스키마로 런타임 검증한다. 검증에 실패하면 zod가
 * ZodError를 던지며(상위 try/catch나 vigor 에러 핸들링에서 처리) 스키마와
 * 어긋난 응답이 그대로 흘러들어가는 것을 막는다.
 */
export function validate<T>(schema: z.ZodType<T>) {
    return vigor.builders.fetch.middlewares()
        .after("intercept", async (ctx, api) => {
            api.setResult(schema.parse(ctx.result))
            return ctx
        })
}

/** `pickKey(key)` + `validate(schema)`를 한 스텝으로 합친 헬퍼. */
export function pickKeyValidated<T>(key: string, schema: z.ZodType<T>) {
    return vigor.builders.fetch.middlewares()
        .after("intercept", async (ctx, api) => {
            const picked = (ctx.result as Record<string, unknown>)[key]
            api.setResult(schema.parse(picked))
            return ctx
        })
}
