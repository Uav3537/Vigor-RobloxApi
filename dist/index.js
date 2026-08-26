// src/lib/csrf.ts
var CsrfTokenManager = class {
  tokenMap = /* @__PURE__ */ new Map();
  pendingMap = /* @__PURE__ */ new Map();
  get(cookie) {
    return this.tokenMap.get(cookie) ?? null;
  }
  set(cookie, token) {
    this.tokenMap.set(cookie, token);
  }
  invalidate(cookie) {
    this.tokenMap.delete(cookie);
  }
  async refresh(cookie) {
    const existing = this.pendingMap.get(cookie);
    if (existing) return existing;
    const pending = (async () => {
      try {
        const response = await fetch("https://accountinformation.roblox.com/v1/description", {
          method: "POST",
          headers: {
            "Cookie": `.ROBLOSECURITY=${cookie}`,
            "User-Agent": "Roblox/WinInet",
            "Content-Type": "application/json",
            "Content-Length": "2"
          },
          body: "{}"
        });
        const token = response.headers.get("x-csrf-token");
        if (!token) throw new Error("CSRF token not found in response headers");
        this.tokenMap.set(cookie, token);
        return token;
      } finally {
        this.pendingMap.delete(cookie);
      }
    })();
    this.pendingMap.set(cookie, pending);
    return pending;
  }
  async getOrRefresh(cookie) {
    const cached = this.get(cookie);
    if (cached) return cached;
    return this.refresh(cookie);
  }
};

// src/lib/network.ts
import { vigor as vigor2 } from "vigor-fetch";

// src/lib/middlewares.ts
import { vigor, VigorFetchError } from "vigor-fetch";
function isFetchFailed(cause) {
  return cause instanceof VigorFetchError && cause.code === "FETCH_FAILED" && cause.data != null;
}
function makeHeaderMiddlewares(opts) {
  const { getCookie, csrfManager, winInet = false, csrf = false } = opts;
  let builder = vigor.builders.fetch.middlewares().before("intercept", async (ctx, api) => {
    const cookie = getCookie();
    ctx.record.cookie = cookie;
    const headers = {
      Cookie: `.ROBLOSECURITY=${cookie}`
    };
    if (winInet) headers["User-Agent"] = "Roblox/WinInet";
    if (csrf) headers["X-CSRF-Token"] = await csrfManager.getOrRefresh(cookie);
    api.setHeaders(headers);
    return ctx;
  });
  if (csrf) {
    builder = builder.onError("intercept", async (ctx, api) => {
      const cause = ctx.error;
      if (isFetchFailed(cause) && cause.data.status === 403) {
        const cookie = ctx.record.cookie ?? getCookie();
        const newToken = cause.data.response.headers.get("x-csrf-token");
        if (newToken) {
          csrfManager.set(cookie, newToken);
        } else {
          csrfManager.invalidate(cookie);
          await csrfManager.refresh(cookie);
        }
        api.proceedRestart();
      }
      return ctx;
    });
  }
  return builder;
}
function pickKey(key) {
  return vigor.builders.fetch.middlewares().after("intercept", async (ctx, api) => {
    api.setResult(ctx.result[key]);
    return ctx;
  });
}
var dataInterceptor = pickKey("data");
function validate(schema) {
  return vigor.builders.fetch.middlewares().after("intercept", async (ctx, api) => {
    api.setResult(schema.parse(ctx.result));
    return ctx;
  });
}
function pickKeyValidated(key, schema) {
  return vigor.builders.fetch.middlewares().after("intercept", async (ctx, api) => {
    const picked = ctx.result[key];
    api.setResult(schema.parse(picked));
    return ctx;
  });
}

// src/lib/network.ts
function createNetworkClients(opts) {
  const { cookies, csrfManager } = opts;
  const cookiePool = cookies.map((cookie) => ({ cookie, lastUsed: 0 }));
  function pickCookie() {
    const entry = cookiePool.reduce((a, b) => a.lastUsed < b.lastUsed ? a : b);
    entry.lastUsed = Date.now();
    return entry.cookie;
  }
  const poolCookieMiddlewares = makeHeaderMiddlewares({ getCookie: pickCookie, csrfManager });
  const poolCookieWinInetMiddlewares = makeHeaderMiddlewares({ getCookie: pickCookie, csrfManager, winInet: true });
  const poolCookieCsrfMiddlewares = makeHeaderMiddlewares({ getCookie: pickCookie, csrfManager, winInet: true, csrf: true });
  const usersApi = vigor2.fetch("https://users.roblox.com/v1").middlewares(poolCookieWinInetMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(7)).algorithms((a) => a.backoff({ initial: 200, unit: 800, multiplier: 1.7 }))
  );
  const thumbnailsApi = vigor2.fetch("https://thumbnails.roblox.com/v1").middlewares(poolCookieWinInetMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(5)).algorithms((a) => a.backoff({ initial: 1e3, multiplier: 2.5 }))
  );
  const gamesApi = vigor2.fetch("https://games.roblox.com/v1").middlewares(poolCookieMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(5)).algorithms((a) => a.backoff({ initial: 1e3, multiplier: 2.5 }))
  );
  const presenceApi = vigor2.fetch("https://presence.roblox.com/v1").middlewares(poolCookieMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(5)).algorithms((a) => a.backoff({ initial: 500, multiplier: 2 }))
  );
  const apisRoblox = vigor2.fetch("https://apis.roblox.com").middlewares(poolCookieMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(5)).algorithms((a) => a.backoff({ initial: 1e3, multiplier: 2 }))
  );
  const gamejoinApi = vigor2.fetch("https://gamejoin.roblox.com/v1").middlewares(poolCookieWinInetMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(7)).algorithms((a) => a.backoff({ initial: 500, multiplier: 1.5 }))
  );
  const ipgeolocationApi = vigor2.fetch("https://api.ipgeolocation.io").retry(
    (r) => r.settings((s) => s.maxAttempts(4)).algorithms((a) => a.backoff({ initial: 500, multiplier: 2 }))
  );
  const friendsApi = vigor2.fetch("https://friends.roblox.com/v1").middlewares(poolCookieCsrfMiddlewares).retry(
    (r) => r.settings((s) => s.maxAttempts(5)).algorithms((a) => a.backoff({ initial: 500, multiplier: 2 }))
  );
  return {
    pickCookie,
    usersApi,
    thumbnailsApi,
    gamesApi,
    presenceApi,
    apisRoblox,
    gamejoinApi,
    ipgeolocationApi,
    friendsApi
  };
}

// src/types/cache.ts
var DEFAULT_TTL_CONFIG = {
  usersSimple: 30 * 60 * 1e3,
  users: 60 * 60 * 1e3,
  usernames: 30 * 60 * 1e3,
  thumbnailAssets: 6 * 60 * 60 * 1e3,
  thumbnails: 6 * 60 * 60 * 1e3,
  serversSimple: 5 * 1e3,
  friends: 10 * 60 * 1e3,
  placeInfo: 60 * 60 * 1e3,
  serverLocationJob: 12 * 60 * 60 * 1e3,
  serverLocationIp: 31 * 24 * 60 * 60 * 1e3,
  serverLocationMachine: 2 * 24 * 60 * 60 * 1e3
};
function resolveTtlConfig(ttl) {
  return { ...DEFAULT_TTL_CONFIG, ...ttl };
}

// src/lib/cache.ts
function createCacheHelpers(cache, ttl) {
  const ttlConfig = resolveTtlConfig(ttl);
  async function withCache(opts) {
    const { type, ttlKey, keys, getKey, fetchMissing, fallback } = opts;
    const ttlMs = ttlConfig[ttlKey];
    if (ttlMs === 0) {
      const fetched = await fetchMissing(keys);
      const map = new Map(fetched.map((item) => [getKey(item), item]));
      return keys.map((k) => map.get(k) ?? fallback);
    }
    const cached = await cache.select(type, keys);
    const cacheMap = new Map(cached.map(({ separator, data }) => [separator, data]));
    const missing = keys.filter((k) => !cacheMap.has(k));
    if (missing.length > 0) {
      const fetched = await fetchMissing(missing);
      await cache.upsert(type, ttlMs, fetched.map((item) => ({ separator: getKey(item), data: item })));
      fetched.forEach((item) => cacheMap.set(getKey(item), item));
    }
    return keys.map((k) => cacheMap.get(k) ?? fallback);
  }
  async function ttlSelect(ttlKey, type, keys) {
    if (ttlConfig[ttlKey] === 0 || keys.length === 0) return [];
    return cache.select(type, keys);
  }
  async function ttlUpsert(ttlKey, type, items) {
    const ttlMs = ttlConfig[ttlKey];
    if (ttlMs === 0 || items.length === 0) return;
    await cache.upsert(type, ttlMs, items);
  }
  return { withCache, ttlSelect, ttlUpsert, ttlConfig };
}

// src/apis/users.ts
import { z as z3 } from "zod";
import { vigor as vigor3 } from "vigor-fetch";

// src/types/responses.ts
import { z as z2 } from "zod";

// src/types/branded.ts
import { z } from "zod";
var RobloxUserIdSchema = z.number().int().positive().min(1).max(1e11).brand();
var RobloxUserNameSchema = z.string().min(3).max(20).regex(/^[A-Za-z0-9_]+$/, "Roblox username may only contain letters, numbers, and underscores").refine((v) => !v.startsWith("_") && !v.endsWith("_"), {
  message: "Username cannot start or end with an underscore"
}).refine((v) => !v.includes("__"), {
  message: "Username cannot contain consecutive underscores"
}).brand();
var RobloxDisplayNameSchema = z.string().min(3).max(20).brand();
var RobloxCookieSchema = z.string().min(50).startsWith(
  "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_",
  { message: "Not a valid .ROBLOSECURITY cookie" }
).brand();
var RobloxPlaceIdSchema = z.number().int().positive().min(1).max(1e11).brand();
var RobloxUniverseIdSchema = z.number().int().positive().min(1).max(1e11).brand();
var RobloxJobIdSchema = z.string().uuid("JobId must be a valid UUID").brand();
var RobloxAssetIdSchema = z.number().int().positive().min(1).max(1e11).brand();
function isRobloxUserId(value) {
  return RobloxUserIdSchema.safeParse(value).success;
}
function isRobloxUserName(value) {
  return RobloxUserNameSchema.safeParse(value).success;
}
function isRobloxDisplayName(value) {
  return RobloxDisplayNameSchema.safeParse(value).success;
}
function isRobloxCookie(value) {
  return RobloxCookieSchema.safeParse(value).success;
}
function isRobloxPlaceId(value) {
  return RobloxPlaceIdSchema.safeParse(value).success;
}
function isRobloxUniverseId(value) {
  return RobloxUniverseIdSchema.safeParse(value).success;
}
function isRobloxJobId(value) {
  return RobloxJobIdSchema.safeParse(value).success;
}
function isRobloxAssetId(value) {
  return RobloxAssetIdSchema.safeParse(value).success;
}

// src/types/responses.ts
var RobloxUserSimpleSchema = z2.object({
  id: RobloxUserIdSchema,
  name: RobloxUserNameSchema,
  displayName: RobloxDisplayNameSchema,
  hasVerifiedBadge: z2.boolean(),
  requestedUsername: z2.string().optional()
});
var RobloxUserSchema = RobloxUserSimpleSchema.extend({
  description: z2.string(),
  externalAppDisplayName: z2.string().nullable(),
  isBanned: z2.boolean(),
  created: z2.string()
});
var RobloxUserDescriptionSchema = z2.object({
  description: z2.string()
});
var RobloxUserBirthdateSchema = z2.object({
  birthYear: z2.number(),
  birthMonth: z2.number(),
  birthDay: z2.number()
});
var RobloxUserGenderSchema = z2.object({
  gender: z2.number()
});
var RobloxUserAgeBracketSchema = z2.object({
  ageBracket: z2.number()
});
var RobloxUserCountryCodeSchema = z2.object({
  countryCode: z2.string()
});
var RobloxUserRolesSchema = z2.object({
  roles: z2.array(z2.string())
});
var RobloxThumbnailTargetBaseSchema = z2.object({
  targetId: z2.preprocess(
    (v) => v === 0 ? void 0 : v,
    z2.union([RobloxAssetIdSchema, RobloxUserIdSchema]).optional()
  ),
  token: z2.string().optional(),
  type: z2.string().optional(),
  size: z2.string().optional(),
  format: z2.string().optional(),
  isCircular: z2.boolean().optional()
});
var RobloxThumbnailTargetSchema = RobloxThumbnailTargetBaseSchema.refine(
  (v) => v.targetId != null !== (v.token != null),
  { message: "Exactly one of targetId or token must be provided" }
);
var RobloxThumbnailRawSchema = RobloxThumbnailTargetBaseSchema.extend({
  imageUrl: z2.string().nullable(),
  state: z2.string(),
  version: z2.string()
});
var RobloxThumbnailSchema = RobloxThumbnailTargetBaseSchema.extend({
  url: z2.string().nullable(),
  state: z2.string(),
  version: z2.string()
});
var RobloxServerEntrySchema = z2.object({
  jobId: RobloxJobIdSchema,
  maxPlayers: z2.number(),
  playing: z2.number(),
  fps: z2.number(),
  ping: z2.number(),
  playerImgs: z2.array(z2.string())
});
var RobloxServerLocationSchema = z2.object({
  ip: z2.string(),
  jobId: RobloxJobIdSchema,
  countryCode: z2.string(),
  countryName: z2.string(),
  regionName: z2.string(),
  city: z2.string(),
  latitude: z2.number(),
  longitude: z2.number(),
  isp: z2.string(),
  timezone: z2.string()
});
var RobloxServerEntryWithLocationSchema = RobloxServerEntrySchema.extend({
  location: RobloxServerLocationSchema.nullable()
});
function robloxServersResultSchema(entrySchema) {
  return z2.object({
    previousPageCursor: z2.string().nullable(),
    nextPageCursor: z2.string().nullable(),
    data: z2.array(entrySchema)
  });
}
var RobloxPresenceEntrySchema = z2.object({
  userId: RobloxUserIdSchema,
  userPresenceType: z2.number(),
  lastLocation: z2.string(),
  placeId: RobloxPlaceIdSchema.nullable(),
  rootPlaceId: RobloxPlaceIdSchema.nullable(),
  gameId: RobloxJobIdSchema.nullable(),
  universeId: RobloxUniverseIdSchema.nullable(),
  lastOnline: z2.string()
});
var RobloxPlaceInfoSchema = z2.object({
  placeId: RobloxPlaceIdSchema,
  universeId: RobloxUniverseIdSchema.nullable(),
  name: z2.string(),
  description: z2.string(),
  creator: z2.object({
    id: z2.number(),
    name: z2.string(),
    type: z2.string()
  }),
  price: z2.number().nullable(),
  playing: z2.number(),
  visits: z2.number(),
  maxPlayers: z2.number(),
  created: z2.string(),
  updated: z2.string(),
  logos: z2.array(z2.string())
});
var RobloxFriendEntrySchema = z2.object({
  id: RobloxUserIdSchema,
  name: RobloxUserNameSchema,
  displayName: RobloxDisplayNameSchema,
  hasVerifiedBadge: z2.boolean().optional(),
  isOnline: z2.boolean().optional(),
  isDeleted: z2.boolean().optional(),
  friendFrom: z2.string().nullable().optional()
});
var RobloxServerRawSchema = z2.object({
  id: RobloxJobIdSchema,
  maxPlayers: z2.number(),
  playing: z2.number(),
  fps: z2.number(),
  ping: z2.number(),
  playerTokens: z2.array(z2.string())
}).passthrough();
var RobloxServersPageRawSchema = robloxServersResultSchema(RobloxServerRawSchema);
var GamejoinResponseSchema = z2.object({
  joinScript: z2.object({
    MachineAddress: z2.string().optional(),
    UdmuxEndpoints: z2.array(z2.object({ Address: z2.string(), Port: z2.number() })).optional()
  }).optional()
});
var RobloxUniverseFromPlaceRawSchema = z2.object({
  universeId: z2.number().optional()
}).passthrough();
var RobloxUniverseFromPlaceSchema = z2.object({
  placeId: z2.number(),
  universeId: z2.number().nullable()
});
var RobloxGameDetailsRawSchema = z2.object({}).passthrough();
var RobloxGameMediaEntrySchema = z2.object({
  imageId: z2.number().optional()
}).passthrough();
var RobloxIpGeoRawSchema = z2.object({
  country_code2: z2.string().optional(),
  country_name: z2.string().optional(),
  state_prov: z2.string().optional(),
  city: z2.string().optional(),
  latitude: z2.union([z2.string(), z2.number()]).optional(),
  longitude: z2.union([z2.string(), z2.number()]).optional(),
  isp: z2.string().optional(),
  time_zone: z2.object({ name: z2.string().optional() }).passthrough().optional()
}).passthrough();
var RobloxThumbnailRawWithRequestIdSchema = RobloxThumbnailRawSchema.extend({
  requestId: z2.string()
});

// src/lib/tools.ts
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function partition(arr, pred) {
  const pass = [], fail = [];
  for (const item of arr) (pred(item) ? pass : fail).push(item);
  return { pass, fail };
}

// src/apis/users.ts
function createUsersApi({ usersApi, csrfManager, withCache }) {
  async function authenticated(cookies) {
    const results = await vigor3.all(...cookies.map((cookie) => async () => {
      const base = usersApi.middlewares(makeHeaderMiddlewares({ getCookie: () => cookie, csrfManager, winInet: true }));
      const [user, description, birthdate, gender, ageBracket, countryCode, roles] = await Promise.allSettled([
        base.path("users", "authenticated").middlewares(validate(RobloxUserSimpleSchema)).request(),
        base.path("description").middlewares(validate(RobloxUserDescriptionSchema)).request(),
        base.path("birthdate").middlewares(validate(RobloxUserBirthdateSchema)).request(),
        base.path("gender").middlewares(validate(RobloxUserGenderSchema)).request(),
        base.path("users", "authenticated", "age-bracket").middlewares(validate(RobloxUserAgeBracketSchema)).request(),
        base.path("users", "authenticated", "country-code").middlewares(validate(RobloxUserCountryCodeSchema)).request(),
        base.path("users", "authenticated", "roles").middlewares(validate(RobloxUserRolesSchema)).request()
      ]);
      if (user.status === "rejected") throw user.reason;
      return {
        ...user.value,
        ...description.status === "fulfilled" ? description.value : {},
        ...birthdate.status === "fulfilled" ? birthdate.value : {},
        ...gender.status === "fulfilled" ? gender.value : {},
        ...ageBracket.status === "fulfilled" ? ageBracket.value : {},
        ...countryCode.status === "fulfilled" ? countryCode.value : {},
        ...roles.status === "fulfilled" ? roles.value : {}
      };
    })).request();
    return results;
  }
  async function usersSimple(userIds) {
    return withCache({
      type: "usersSimple",
      ttlKey: "usersSimple",
      keys: userIds.map(String),
      getKey: (item) => String(item.id),
      fallback: {},
      fetchMissing: async (missing) => {
        const grouped = await vigor3.all(
          ...chunk(missing.map(Number), 100).map(
            (group) => () => usersApi.path("users").body("overwrite", { userIds: group, excludeBannedUsers: false }).middlewares(pickKeyValidated("data", z3.array(RobloxUserSimpleSchema))).request()
          )
        ).request();
        const results = grouped.flat();
        return results.filter((u) => u.id != null && u.name != null && u.displayName != null);
      }
    });
  }
  async function users(userIds) {
    return withCache({
      type: "users",
      ttlKey: "users",
      keys: userIds.map(String),
      getKey: (item) => String(item.id),
      fallback: {},
      fetchMissing: async (missing) => {
        const results = await vigor3.all(
          ...missing.map(
            (id) => () => usersApi.path("users", id).middlewares(validate(RobloxUserSchema)).request()
          )
        ).settings((s) => s.concurrency(2)).request();
        return results.filter(
          (u) => u.id != null && u.name != null && u.displayName != null && u.description != null
        );
      }
    });
  }
  return { authenticated, usersSimple, users };
}

// src/apis/usersByName.ts
import { z as z4 } from "zod";
import { vigor as vigor4 } from "vigor-fetch";
function createUsersByNameApi({ usersApi, withCache }) {
  async function usersByName(usernames) {
    return withCache({
      type: "usernames",
      ttlKey: "usernames",
      keys: usernames,
      getKey: (item) => item.requestedUsername ?? item.name,
      fallback: {},
      fetchMissing: async (missing) => {
        const grouped = await vigor4.all(
          ...chunk(missing, 100).map(
            (group) => () => usersApi.path("usernames", "users").body("overwrite", { usernames: group, excludeBannedUsers: false }).middlewares(pickKeyValidated("data", z4.array(RobloxUserSimpleSchema))).request()
          )
        ).request();
        const results = grouped.flat();
        return results.filter((u) => u.id != null && u.name != null && u.displayName != null);
      }
    });
  }
  return { usersByName };
}

// src/apis/presence.ts
import { z as z5 } from "zod";
import { vigor as vigor5 } from "vigor-fetch";
function createPresenceApi({ presenceApi }) {
  async function presence(userIds) {
    const grouped = await vigor5.all(
      ...chunk(userIds, 50).map(
        (group) => () => presenceApi.path("presence", "users").body("overwrite", { userIds: group }).middlewares(pickKeyValidated("userPresences", z5.array(RobloxPresenceEntrySchema))).request()
      )
    ).request();
    return grouped.flat();
  }
  return { presence };
}

// src/apis/thumbnails.ts
import { z as z6 } from "zod";
import { vigor as vigor6 } from "vigor-fetch";
function createThumbnailsApi({ thumbnailsApi, withCache }) {
  function thumbnailCacheKey(t) {
    const base = t.targetId ? `id:${t.targetId}` : `token:${t.token}`;
    return `${base}:${t.type}:${t.size}:${t.format}`;
  }
  async function fetchThumbnailFallback(targets) {
    const byUserId = targets.filter(
      (t) => t.targetId != null
    );
    if (byUserId.length === 0) return /* @__PURE__ */ new Map();
    const groups = /* @__PURE__ */ new Map();
    for (const t of byUserId) {
      const key = `${t.size}:${t.format}:${t.isCircular ?? false}`;
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    const resultMap = /* @__PURE__ */ new Map();
    await vigor6.all(
      ...Array.from(groups.values()).flatMap(
        (group) => chunk(group, 100).map((part) => async () => {
          try {
            const res = await thumbnailsApi.path("users", "avatar-headshot").query({
              userIds: part.map((t) => t.targetId).join(","),
              size: part[0].size,
              format: part[0].format,
              isCircular: part[0].isCircular ?? false,
              includeBackground: false
            }).middlewares(pickKeyValidated("data", z6.array(RobloxThumbnailRawSchema))).request();
            const byTargetId = new Map(res.map((r) => [r.targetId, r]));
            part.forEach((t) => {
              const found = byTargetId.get(t.targetId);
              if (found) resultMap.set(t.requestId, found);
            });
          } catch {
          }
        })
      )
    ).settings((s) => s.concurrency(5)).request();
    return resultMap;
  }
  async function thumbnailAssets(opts) {
    const { assetIds, size = "150x150", format = "Png" } = opts;
    const targets = assetIds.map((id) => ({ targetId: id, type: "Asset", size, format }));
    return withCache({
      type: "thumbnailAssets",
      ttlKey: "thumbnailAssets",
      keys: targets.map(thumbnailCacheKey),
      getKey: (item) => thumbnailCacheKey(item),
      fallback: { url: null },
      fetchMissing: async (missingKeys) => {
        const missingTargets = targets.filter((t) => missingKeys.includes(thumbnailCacheKey(t)));
        const missingIds = missingTargets.map((t) => t.targetId);
        const grouped = await vigor6.all(
          ...chunk(missingIds, 100).map(
            (group) => () => thumbnailsApi.path("assets").query({ assetIds: group.join(","), size, format }).middlewares(pickKeyValidated("data", z6.array(RobloxThumbnailRawSchema))).request()
          )
        ).request();
        const results = grouped.flat().map((t) => ({
          ...t,
          type: "Asset",
          size,
          format,
          url: t.state === "Completed" ? t.imageUrl : null
        }));
        return results.filter((r) => r.state === "Completed");
      }
    });
  }
  async function fetchThumbnailsRaw(targets) {
    const batch = targets.map((t, i) => ({ ...t, requestId: String(i) }));
    const batchMap = new Map(batch.map((t) => [t.requestId, t]));
    const grouped = await vigor6.all(
      ...chunk(batch, 100).map(
        (group) => () => thumbnailsApi.path("batch").body("overwrite", group).middlewares(pickKeyValidated("data", z6.array(RobloxThumbnailRawWithRequestIdSchema))).request()
      )
    ).request();
    const results = grouped.flat();
    const resultByRequestId = new Map(results.map((r) => [r.requestId, r]));
    const needsFallback = batch.filter((t) => {
      const r = resultByRequestId.get(t.requestId);
      return !r || r.state !== "Completed";
    });
    if (needsFallback.length > 0) {
      const fallbackMap = await fetchThumbnailFallback(needsFallback);
      fallbackMap.forEach((raw, requestId) => resultByRequestId.set(requestId, { ...raw, requestId }));
    }
    const merged = batch.map((t) => {
      const item = resultByRequestId.get(t.requestId);
      const original = batchMap.get(t.requestId) ?? {};
      if (!item) {
        return { ...original, url: null, state: "Error", version: "" };
      }
      const { requestId: _rid, ...rest } = item;
      return {
        ...original,
        ...rest,
        url: rest.state === "Completed" ? rest.imageUrl : null
      };
    });
    return merged.filter((m) => m.state === "Completed");
  }
  async function thumbnailsBatch(targets, formatDefaults = {}) {
    const defaults = {
      type: "AvatarHeadShot",
      size: "150x150",
      format: "Png",
      isCircular: false,
      ...formatDefaults
    };
    const withDefaults = targets.map((t) => ({ ...defaults, ...t }));
    const tokenTargets = withDefaults.filter((t) => t.targetId == null && t.token != null);
    const cacheTargets = withDefaults.filter((t) => t.targetId != null);
    const [cached, fresh] = await Promise.all([
      cacheTargets.length > 0 ? withCache({
        type: "thumbnails",
        ttlKey: "thumbnails",
        keys: cacheTargets.map(thumbnailCacheKey),
        getKey: (item) => thumbnailCacheKey(item),
        fallback: { url: null },
        fetchMissing: async (missingKeys) => {
          const missingTargets = cacheTargets.filter((t) => missingKeys.includes(thumbnailCacheKey(t)));
          return fetchThumbnailsRaw(missingTargets);
        }
      }) : Promise.resolve([]),
      tokenTargets.length > 0 ? fetchThumbnailsRaw(tokenTargets) : Promise.resolve([])
    ]);
    return [...cached.filter((t) => t.url != null), ...fresh];
  }
  return { thumbnailCacheKey, thumbnailAssets, thumbnailsBatch };
}

// src/apis/gamejoin.ts
function createGamejoinApi({ gamejoinApi }) {
  async function extractIps(placeId, jobId) {
    try {
      const res = await gamejoinApi.path("join-game-instance").body("overwrite", { placeId, gameId: jobId }).middlewares(validate(GamejoinResponseSchema)).request();
      return {
        publicIp: res?.joinScript?.UdmuxEndpoints?.[0]?.Address ?? null,
        machineAddress: res?.joinScript?.MachineAddress ?? null
      };
    } catch {
      return { publicIp: null, machineAddress: null };
    }
  }
  return { extractIps };
}

// src/apis/serversRegion.ts
import { vigor as vigor7 } from "vigor-fetch";
function createServersRegionApi({
  ipgeolocationApi,
  ipgeolocationKey,
  extractIps,
  ttlSelect,
  ttlUpsert
}) {
  async function fetchIpLocation(ip) {
    try {
      const raw = await ipgeolocationApi.path("ipgeo").query({ apiKey: ipgeolocationKey, ip, fields: "country_code2,country_name,state_prov,city,latitude,longitude,isp,time_zone" }).middlewares(validate(RobloxIpGeoRawSchema)).request();
      return {
        ip,
        countryCode: String(raw.country_code2 ?? ""),
        countryName: String(raw.country_name ?? ""),
        regionName: String(raw.state_prov ?? ""),
        city: String(raw.city ?? ""),
        latitude: Number(raw.latitude ?? 0),
        longitude: Number(raw.longitude ?? 0),
        isp: String(raw.isp ?? ""),
        timezone: String(raw.time_zone?.name ?? "")
      };
    } catch {
      return null;
    }
  }
  async function serversRegion(opts) {
    const { placeId, jobIds } = opts;
    if (jobIds.length === 0) return [];
    const cachedByJob = await ttlSelect("serverLocationJob", "serverLocation:job", jobIds);
    const jobHitMap = new Map(cachedByJob.map(({ separator, data }) => [separator, data]));
    const missJobIds = jobIds.filter((id) => !jobHitMap.has(id));
    if (missJobIds.length === 0) return jobIds.map((id) => jobHitMap.get(id));
    const extracted = await vigor7.all(
      ...missJobIds.map((jobId) => async () => {
        const { publicIp, machineAddress } = await extractIps(placeId, jobId);
        return { jobId, publicIp, machineAddress };
      })
    ).settings((s) => s.concurrency(3)).request();
    const validExtracted = extracted.filter(
      (e) => e.publicIp !== null
    );
    const machineAddresses = [...new Set(validExtracted.map((e) => e.machineAddress).filter((m) => m !== null))];
    const cachedByMachine = await ttlSelect("serverLocationMachine", "serverLocation:machine", machineAddresses);
    const machineHitMap = new Map(cachedByMachine.map(({ separator, data }) => [separator, data]));
    const { pass: machineHits, fail: machineMiss } = validExtracted.reduce(
      (acc, e) => {
        const cached = e.machineAddress ? machineHitMap.get(e.machineAddress) : void 0;
        if (cached) acc.pass.push({ ...e, loc: cached });
        else acc.fail.push(e);
        return acc;
      },
      { pass: [], fail: [] }
    );
    const missPublicIps = [...new Set(machineMiss.map((e) => e.publicIp))];
    const cachedByIp = await ttlSelect("serverLocationIp", "serverLocation:ip", missPublicIps);
    const ipHitMap = new Map(cachedByIp.map(({ separator, data }) => [separator, data]));
    const stillMissIps = missPublicIps.filter((ip) => !ipHitMap.has(ip));
    if (stillMissIps.length > 0) {
      const fetched = await vigor7.all(
        ...stillMissIps.map((ip) => async () => ({ ip, loc: await fetchIpLocation(ip) }))
      ).settings((s) => s.concurrency(5)).request();
      const toUpsertIp = fetched.filter((e) => e.loc !== null);
      if (toUpsertIp.length > 0) {
        await ttlUpsert("serverLocationIp", "serverLocation:ip", toUpsertIp.map(({ ip, loc }) => ({ separator: ip, data: loc })));
        toUpsertIp.forEach(({ ip, loc }) => ipHitMap.set(ip, loc));
      }
    }
    const toUpsertMachine = [];
    for (const e of machineMiss) {
      const loc = ipHitMap.get(e.publicIp);
      if (loc && e.machineAddress && !machineHitMap.has(e.machineAddress)) {
        toUpsertMachine.push({ separator: e.machineAddress, data: loc });
        machineHitMap.set(e.machineAddress, loc);
      }
    }
    if (toUpsertMachine.length > 0) await ttlUpsert("serverLocationMachine", "serverLocation:machine", toUpsertMachine);
    const jobLocations = [];
    const toUpsertJob = [];
    for (const { jobId, loc } of machineHits) {
      const full = { ...loc, jobId };
      jobLocations.push(full);
      toUpsertJob.push({ separator: jobId, data: full });
    }
    for (const e of machineMiss) {
      const loc = ipHitMap.get(e.publicIp);
      if (!loc) continue;
      const full = { ...loc, jobId: e.jobId };
      jobLocations.push(full);
      toUpsertJob.push({ separator: e.jobId, data: full });
    }
    if (toUpsertJob.length > 0) await ttlUpsert("serverLocationJob", "serverLocation:job", toUpsertJob);
    const resultMap = new Map([
      ...jobHitMap.entries(),
      ...jobLocations.map((loc) => [loc.jobId, loc])
    ]);
    return jobIds.flatMap((id) => {
      const loc = resultMap.get(id);
      return loc ? [loc] : [];
    });
  }
  return { fetchIpLocation, serversRegion };
}

// src/lib/rate-limiter.ts
function makeRateLimiter(opts) {
  const { limit, windowMs } = opts;
  const queue = [];
  let count = 0;
  let windowStart = Date.now();
  let timer = null;
  function drain() {
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      count = 0;
    }
    while (queue.length > 0 && count < limit) {
      count++;
      const next = queue.shift();
      next();
    }
    if (queue.length > 0 && timer == null) {
      const delay = Math.max(0, windowMs - (Date.now() - windowStart));
      timer = setTimeout(() => {
        timer = null;
        drain();
      }, delay);
    }
  }
  return function schedule(fn) {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        fn().then(resolve, reject);
      });
      drain();
    });
  };
}
var gamesServersRateLimiter = makeRateLimiter({ limit: 20, windowMs: 60 * 1e3 });
var friendsApiRateLimiter = makeRateLimiter({ limit: 20, windowMs: 60 * 1e3 });

// src/apis/servers.ts
function createServersApi({ gamesApi, withCache, thumbnailsBatch, serversRegion }) {
  async function serversSimple(opts) {
    const { placeId, count = 1, serverType = "Public", cursor, thumbnailFormat } = opts;
    const cacheKey = `${placeId}:${serverType}:${count}:${cursor ?? ""}`;
    const [result] = await withCache({
      type: "serversSimple",
      ttlKey: "serversSimple",
      keys: [cacheKey],
      getKey: () => cacheKey,
      fallback: { previousPageCursor: null, nextPageCursor: null, data: [] },
      fetchMissing: async () => {
        let nextCursor = cursor ?? null;
        let prevCursor = null;
        const rawData = [];
        for (let i = 0; i < count; i++) {
          const page = await gamesServersRateLimiter(
            () => gamesApi.path("games", placeId, "servers", serverType).query({ limit: 100, ...nextCursor ? { cursor: nextCursor } : {} }).middlewares(validate(RobloxServersPageRawSchema)).request()
          );
          if (i === 0) prevCursor = page.previousPageCursor;
          nextCursor = page.nextPageCursor;
          rawData.push(...page.data);
          if (!nextCursor) break;
        }
        const thumbTargets = rawData.flatMap((s) => s.playerTokens.map((token) => ({ token, type: "AvatarHeadShot", size: "150x150", format: "Png", ...thumbnailFormat })));
        const thumbResults = await thumbnailsBatch(thumbTargets, thumbnailFormat);
        const thumbMap = new Map(thumbResults.map((t) => [t.token, t.url]));
        return [{
          previousPageCursor: prevCursor,
          nextPageCursor: nextCursor,
          data: rawData.map((s) => ({
            jobId: s.id,
            maxPlayers: s.maxPlayers,
            playing: s.playing,
            fps: s.fps,
            ping: s.ping,
            playerImgs: s.playerTokens.map((tok) => thumbMap.get(tok)).filter((url) => url != null)
          }))
        }];
      }
    });
    return result;
  }
  async function servers(opts) {
    const result = await serversSimple(opts);
    const jobIds = result.data.map((s) => s.jobId);
    const locationList = await serversRegion({ placeId: opts.placeId, jobIds }).catch(() => []);
    const locationMap = new Map(locationList.map((l) => [l.jobId, l]));
    return {
      ...result,
      data: result.data.map((s) => ({
        ...s,
        location: locationMap.get(s.jobId) ?? null
      }))
    };
  }
  return { serversSimple, servers };
}

// src/apis/placeInfo.ts
import { z as z7 } from "zod";
import { vigor as vigor8 } from "vigor-fetch";
function createPlaceInfoApi({ apisRoblox, gamesApi, withCache, thumbnailAssets }) {
  async function placeInfo(placeIds) {
    return withCache({
      type: "placeInfo",
      ttlKey: "placeInfo",
      keys: placeIds.map(String),
      getKey: (item) => String(item.placeId),
      fallback: {},
      fetchMissing: async (missing) => {
        const universeEntries = await vigor8.all(
          ...missing.map(
            (placeId) => () => apisRoblox.path("universes", "v1", "places", placeId, "universe").middlewares(
              vigor8.builders.fetch.middlewares().after("intercept", async (ctx, api) => {
                const r = RobloxUniverseFromPlaceRawSchema.parse(ctx.result);
                api.setResult({ placeId: Number(placeId), universeId: r?.universeId ?? null });
                return ctx;
              })
            ).request()
          )
        ).request();
        const metaList = await vigor8.all(
          ...universeEntries.map(({ placeId, universeId }) => async () => {
            if (!universeId) return { placeId, universeId: null, info: null, assetIds: [] };
            const [details, media] = await Promise.all([
              gamesApi.path("games").query({ universeIds: universeId }).middlewares(pickKeyValidated("data", z7.array(RobloxGameDetailsRawSchema))).request(),
              gamesApi.path("games", universeId, "media").middlewares(pickKeyValidated("data", z7.array(RobloxGameMediaEntrySchema))).request()
            ]);
            return {
              placeId,
              universeId,
              info: details?.[0] ?? null,
              assetIds: (media ?? []).map((m) => m.imageId).filter((id) => id != null)
            };
          })
        ).request();
        const allAssetIds = [...new Set(metaList.flatMap((m) => m.assetIds))];
        const assetUrlMap = /* @__PURE__ */ new Map();
        if (allAssetIds.length > 0) {
          const thumbs = await thumbnailAssets({ assetIds: allAssetIds, size: "768x432", format: "Png" });
          thumbs.forEach((t) => {
            if (t.targetId != null && t.url) assetUrlMap.set(t.targetId, t.url);
          });
        }
        return metaList.map(({ placeId, universeId, info, assetIds }) => ({
          ...info ?? {},
          placeId,
          universeId,
          logos: assetIds.map((id) => assetUrlMap.get(id)).filter((u) => u != null)
        }));
      }
    });
  }
  return { placeInfo };
}

// src/apis/withImg.ts
function createWithImgApi({ usersSimple, users, usersByName, thumbnailsBatch }) {
  async function usersSimpleWithImg(userIds) {
    const [userList, thumbs] = await Promise.all([
      usersSimple(userIds),
      thumbnailsBatch(userIds.map((id) => ({ targetId: id })))
    ]);
    const imgMap = new Map(thumbs.map((t) => [t.targetId, t.url]));
    return userList.map((u) => ({ ...u, img: imgMap.get(u.id) ?? null }));
  }
  async function usersWithImg(userIds) {
    const [userList, thumbs] = await Promise.all([
      users(userIds),
      thumbnailsBatch(userIds.map((id) => ({ targetId: id })))
    ]);
    const imgMap = new Map(thumbs.map((t) => [t.targetId, t.url]));
    return userList.map((u) => ({ ...u, img: imgMap.get(u.id) ?? null }));
  }
  async function usersByNamesWithImg(usernames) {
    const userList = await usersByName(usernames);
    const thumbs = await thumbnailsBatch(userList.map((u) => ({ targetId: u.id })));
    const imgMap = new Map(thumbs.map((t) => [t.targetId, t.url]));
    return userList.map((u) => ({ ...u, img: imgMap.get(u.id) ?? null }));
  }
  return { usersSimpleWithImg, usersWithImg, usersByNamesWithImg };
}

// src/apis/track.ts
var DEFAULT_HASHES = /* @__PURE__ */ new Set([
  "5816BB6B457A7A2FD8F0299D6F79DADF",
  "D517857E5CC51E2FF93E63E20241169E",
  "56DFC0F87BABBE49C6D1BE708AE9A66A",
  "C16BE31B5A403C45279B3FF5533980E9",
  "51E47F0C53DA3A617158586DF73B1236",
  "ACCF91F734E311F4A0EF23C3EDA54284",
  "CF083BB49C3304C593C43617FF06418E",
  "3259891600987E41060EC3A43511F2F9",
  "19F6EB627A565DF5ABC0B82925B2C760",
  "5CB6042A80C64D34BA98721C96F5D6A3",
  "E592BA2BBFA44C9021643D25BC014BD5",
  "661AD135B4409FF51BC4A6D80E6AC0C7",
  "8E0E19FD517F46AD46A8A322377CA89B",
  "1E8FFEC57F042949AEFAC69FECC72D38",
  "64D3D8C3021F7E8442CCA2825051A87A"
]);
function getHash(url) {
  if (!url) return null;
  const match = url.match(/-([0-9A-Fa-f]{32})-/);
  return match ? match[1].toUpperCase() : null;
}
function createTrackApi({ usersByName, usersSimple, serversSimple, thumbnailsBatch, serversRegion }) {
  async function track(opts) {
    const { placeId, targets } = opts;
    const { pass: rawIds, fail: names } = partition(targets, (t) => !Number.isNaN(Number(t)));
    const resolvedIds = (await usersByName(names)).map((u) => u.id);
    const idList = [...rawIds.map(Number), ...resolvedIds];
    const [userList, serverResult, thumbs] = await Promise.all([
      usersSimple(idList),
      serversSimple({ placeId, count: 20 }),
      thumbnailsBatch(idList.map((id) => ({ targetId: id })))
    ]);
    const thumbnailsMap = new Map(thumbs.map((t) => [t.targetId, t.url]));
    const serverHashMap = /* @__PURE__ */ new Map();
    serverResult.data.forEach(
      (s) => s.playerImgs.forEach((img) => {
        const h = getHash(img);
        if (h) serverHashMap.set(h, s);
      })
    );
    const matchedJobIds = /* @__PURE__ */ new Set();
    const userServerMap = /* @__PURE__ */ new Map();
    for (const user of userList) {
      const img = thumbnailsMap.get(user.id) ?? null;
      const hash = getHash(img);
      const server = hash && !DEFAULT_HASHES.has(hash) ? serverHashMap.get(hash) ?? null : null;
      if (server) {
        userServerMap.set(user.id, server);
        matchedJobIds.add(server.jobId);
      }
    }
    const locationList = matchedJobIds.size > 0 ? await serversRegion({ placeId, jobIds: [...matchedJobIds] }) : [];
    const locationMap = new Map(locationList.map((l) => [l.jobId, l]));
    return userList.map((user) => {
      const img = thumbnailsMap.get(user.id) ?? null;
      const server = userServerMap.get(user.id) ?? null;
      return {
        user: { ...user, img },
        server: server ? { ...server, location: locationMap.get(server.jobId) ?? null } : null
      };
    });
  }
  return { track };
}

// src/apis/friends.ts
import { z as z8 } from "zod";
function createFriendsApi({ friendsApi, withCache }) {
  async function friends(userId) {
    const [result] = await withCache({
      type: "friends",
      ttlKey: "friends",
      keys: [String(userId)],
      getKey: () => String(userId),
      fallback: [],
      fetchMissing: async () => {
        const list = await friendsApiRateLimiter(
          () => friendsApi.path("users", userId, "friends").middlewares(pickKeyValidated("data", z8.array(RobloxFriendEntrySchema))).request()
        );
        return [list];
      }
    });
    return result;
  }
  async function sendFriendRequest(targetUserId) {
    await friendsApiRateLimiter(
      () => friendsApi.path("users", targetUserId, "request-friendship").body("overwrite", {}).request()
    );
  }
  async function unfriend(targetUserId) {
    await friendsApiRateLimiter(
      () => friendsApi.path("users", targetUserId, "unfriend").body("overwrite", {}).request()
    );
  }
  return { friends, sendFriendRequest, unfriend };
}

// src/index.ts
function createRobloxApi({
  cache,
  cookies: cookiesList,
  ipgeolocationKey,
  ttl
}) {
  const csrfManager = new CsrfTokenManager();
  const {
    usersApi,
    thumbnailsApi,
    gamesApi,
    presenceApi,
    apisRoblox,
    gamejoinApi,
    ipgeolocationApi,
    friendsApi
  } = createNetworkClients({ cookies: cookiesList, csrfManager });
  const { withCache, ttlSelect, ttlUpsert } = createCacheHelpers(cache, ttl);
  const { authenticated, usersSimple, users } = createUsersApi({ usersApi, csrfManager, withCache });
  const { usersByName } = createUsersByNameApi({ usersApi, withCache });
  const { presence } = createPresenceApi({ presenceApi });
  const { thumbnailAssets, thumbnailsBatch } = createThumbnailsApi({ thumbnailsApi, withCache });
  const { extractIps } = createGamejoinApi({ gamejoinApi });
  const { serversRegion } = createServersRegionApi({ ipgeolocationApi, ipgeolocationKey, extractIps, ttlSelect, ttlUpsert });
  const { serversSimple, servers } = createServersApi({ gamesApi, withCache, thumbnailsBatch, serversRegion });
  const { placeInfo } = createPlaceInfoApi({ apisRoblox, gamesApi, withCache, thumbnailAssets });
  const { usersSimpleWithImg, usersWithImg, usersByNamesWithImg } = createWithImgApi({ usersSimple, users, usersByName, thumbnailsBatch });
  const { track } = createTrackApi({ usersByName, usersSimple, serversSimple, thumbnailsBatch, serversRegion });
  const { friends, sendFriendRequest, unfriend } = createFriendsApi({ friendsApi, withCache });
  return {
    authenticated,
    usersSimple,
    users,
    usersByName,
    thumbnailAssets,
    thumbnailsBatch,
    serversSimple,
    servers,
    presence,
    placeInfo,
    usersSimpleWithImg,
    usersWithImg,
    usersByNamesWithImg,
    track,
    serversRegion,
    friends,
    sendFriendRequest,
    unfriend
  };
}
export {
  DEFAULT_TTL_CONFIG,
  GamejoinResponseSchema,
  RobloxAssetIdSchema,
  RobloxCookieSchema,
  RobloxDisplayNameSchema,
  RobloxFriendEntrySchema,
  RobloxGameDetailsRawSchema,
  RobloxGameMediaEntrySchema,
  RobloxIpGeoRawSchema,
  RobloxJobIdSchema,
  RobloxPlaceIdSchema,
  RobloxPlaceInfoSchema,
  RobloxPresenceEntrySchema,
  RobloxServerEntrySchema,
  RobloxServerEntryWithLocationSchema,
  RobloxServerLocationSchema,
  RobloxServerRawSchema,
  RobloxServersPageRawSchema,
  RobloxThumbnailRawSchema,
  RobloxThumbnailRawWithRequestIdSchema,
  RobloxThumbnailSchema,
  RobloxThumbnailTargetSchema,
  RobloxUniverseFromPlaceRawSchema,
  RobloxUniverseFromPlaceSchema,
  RobloxUniverseIdSchema,
  RobloxUserAgeBracketSchema,
  RobloxUserBirthdateSchema,
  RobloxUserCountryCodeSchema,
  RobloxUserDescriptionSchema,
  RobloxUserGenderSchema,
  RobloxUserIdSchema,
  RobloxUserNameSchema,
  RobloxUserRolesSchema,
  RobloxUserSchema,
  RobloxUserSimpleSchema,
  createRobloxApi,
  isRobloxAssetId,
  isRobloxCookie,
  isRobloxDisplayName,
  isRobloxJobId,
  isRobloxPlaceId,
  isRobloxUniverseId,
  isRobloxUserId,
  isRobloxUserName,
  resolveTtlConfig,
  robloxServersResultSchema
};
