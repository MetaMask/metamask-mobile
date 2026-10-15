# Watchlist Homepage Performance Audit

**Date:** 2026-07-27 (updated 2026-07-28)  
**Scope:** Homepage watchlist section vs other home sections (tokens / perps / predictions / top traders)  
**Environment:** iOS, Metro `__DEV__`, filter logs on `HomepagePerf`

## Summary

Watchlist Time-to-Content was **~2.3s** on cold start, dominated by `AuthenticationController:getBearerToken` which waits for the **message-signing-snap to boot** (~2.8s, 82% of the snap call time). The actual key derivation is only ~610ms.

**This is a cold-load issue.** After the snap boots and entropy is cached, `getBearerToken` resolves in 0–3ms. This affects all features calling `getBearerToken` on startup, not just watchlist.

Hardcoding the bearer JWT (bypassing auth) cut watchlist TTC to **~1.6s** (−31%), confirming auth/snap-boot as the primary bottleneck.

### Controlled A/B comparison (Jul 27, 2026)

| Metric                         | Test 1 — real auth | Test 2 — hardcoded bearer    | Delta                     |
| ------------------------------ | ------------------ | ---------------------------- | ------------------------- |
| `AUSGetHeaders` `bearerMs`     | 1,594ms            | **0ms** (`source=hardcoded`) | −1,594ms                  |
| AUS `headersMs`                | ~1,594ms           | 198ms                        | −1,396ms                  |
| AUS `fetchMs` (user-storage)   | 329ms              | 447ms                        | +118ms (network variance) |
| AUS blob total                 | 1,923ms            | 646ms                        | −1,277ms (−66%)           |
| `WatchlistHydrate` (Token API) | 368ms              | 808ms                        | +440ms (network variance) |
| `WatchlistQuery` total         | 2,292ms            | 1,456ms                      | −836ms (−36%)             |
| **Watchlist TTC**              | **2,384ms**        | **1,638ms**                  | **−746ms (−31%)**         |

> Network variance inflated Test 2 hydrate (808ms vs 368ms). Normalizing for that, the structural auth savings are ~1,594ms, putting the normalized TTC improvement at **~58–60%**.

### Snap call timing

| Metric                       | Test 1             | Test 2             | Clean run 3 |
| ---------------------------- | ------------------ | ------------------ | ----------- |
| `snapGetAllPublicKeys` total | 3,208ms            | 3,461ms            | 3,438ms     |
| Coalescing active            | Yes (1 snap fired) | Yes (1 snap fired) | Yes         |
| Post-cache `getBearerToken`  | 0–3ms              | 0–2ms              | 0–3ms       |

### Snap call breakdown (from `SnapController:handleRequest` instrumentation)

| Phase                                                   | Duration     | % of snap call |
| ------------------------------------------------------- | ------------ | -------------- |
| `platformMs` (onboarding gate / `ensureCanUsePlatform`) | ~9ms         | negligible     |
| `startupMs` (snap boot / `startSnap`)                   | ~2,819ms     | **82%**        |
| `rpcMs` (actual `getAllPublicKeys` execution)           | ~610ms       | 18%            |
| **Total**                                               | **~3,438ms** |                |

> **Key finding:** The bottleneck is **snap boot time**, not the key derivation itself. The `message-signing-snap` takes ~2.8s to boot on cold start. Once booted, subsequent calls have `startupMs=0`.

### Section TTC comparison (Test 1 — real auth)

| Section       | TTC (ms)  | Content              |
| ------------- | --------- | -------------------- |
| tokens        | 0         | filled (cached)      |
| perps         | 0         | empty                |
| defi          | 0         | filled               |
| nfts          | 0         | filled               |
| predict       | 1,730     | filled               |
| top_traders   | 2,196     | filled               |
| **watchlist** | **2,384** | **filled (slowest)** |

## Call path

```text
WatchlistSection
  → useTokenWatchlistQuery
      → readFromTokenWatchList()
          → messenger: AuthenticatedUserStorageService:getAssetsWatchlist
              → fetchQuery (60s in-memory cache possible)
                  → #getHeaders
                      → AuthenticationController:getBearerToken   ← primary cost
                  → GET {user-storage}/api/v1/preferences/assets-watchlist
                  → response.json()
      → getTokens(ids)  → GET token.api .../assets
      → addBalanceToTokens (Redux, sync)
  → useSectionPerformance TTC / DataFetch
```

Package source (core): `@metamask/authenticated-user-storage`  
`getAssetsWatchlist` → `#getHeaders` → `messenger.call('AuthenticationController:getBearerToken')`.

**Endpoints**

- User storage (prod): `GET https://user-storage.api.cx.metamask.io/api/v1/preferences/assets-watchlist`
- Token API: `GET https://token.api.cx.metamask.io/assets?assetIds=...&includeMarketData=true&includeRwaData=true`

## Instrumentation used

App-side (`HomepagePerf` prefix):

- `TTC` / `DataFetch` — `useSectionPerformance`
- `WatchlistBlob` / `WatchlistHydrate` / `WatchlistQuery` / `WatchlistBalance`

Temporary package logs in `node_modules` (local-only, wiped by `yarn install`):

**`@metamask/authenticated-user-storage` (`.cjs` + `.mjs`):**

- `AUSGetHeaders` — bearer timing + fingerprint (not full token)
- `AUSGetAssetsWatchlist` — `headersMs` / `fetchMs` / `jsonMs`
- `AUSGetAssetsWatchlistTotal`
- Optional `TEMP_HARDCODED_BEARER_TOKEN` bypass for A/B

**`@metamask/profile-sync-controller` (`.cjs` + `.mjs`):**

- `AuthGetBearerTokenStart` / `AuthGetBearerToken` — callId, entropyMs, accessTokenMs
- `AuthPrimaryEntropy` — path (snap-start, coalesced, cache), snapMs
- `SRPGetAccessToken` — session vs login path timing

**`@metamask/snaps-controllers` (`SnapController.cjs` + `.mjs`):**

- `SnapHandleRequest` — snap, method, `platformMs`, `startupMs`, `rpcMs`, `totalMs`
  - `platformMs` = time in `ensureCanUsePlatform` (onboarding gate)
  - `startupMs` = time in `startSnap` (snap boot)
  - `rpcMs` = time in actual RPC execution

> Clear any hardcoded JWT when done. All package edits are local-only.

---

## Logs — Test 1: real `getBearerToken` (no bypass)

### Section TTC

```text
HomepagePerf TTC section=tokens durationMs=0 content_state=filled
HomepagePerf TTC section=perps durationMs=0 content_state=empty
HomepagePerf TTC section=defi durationMs=0 content_state=filled
HomepagePerf TTC section=nfts durationMs=0 content_state=filled
HomepagePerf TTC section=predict durationMs=1730 content_state=filled
HomepagePerf TTC section=top_traders durationMs=2196 content_state=filled
HomepagePerf TTC section=watchlist durationMs=2384 content_state=filled    ← slowest
```

### Auth + watchlist flow

```text
HomepagePerf AuthPrimaryEntropyWarm start
HomepagePerf AuthPrimaryEntropy path=snap-start                            ← 1 snap call only (coalescing works)
HomepagePerf AuthPrimaryEntropy path=coalesced                             ← all other callers coalesce
HomepagePerf AuthPrimaryEntropy path=snap snapMs=3208 keyCount=1           ← snap completes in 3.2s

HomepagePerf AUSGetHeadersStart section=watchlist t=1785162529743
HomepagePerf AuthGetBearerToken callId=13 entropyMs=1582 accessTokenMs=1 totalMs=1586
HomepagePerf AUSGetHeaders section=watchlist bearerMs=1593 source=getBearerToken

HomepagePerf AUSGetAssetsWatchlist section=watchlist headersMs=1594 fetchMs=329 jsonMs=0 status=200
HomepagePerf AUSGetAssetsWatchlistTotal section=watchlist totalMs=1923 result=blob
HomepagePerf WatchlistBlob section=watchlist messengerMs=1923 validateMs=0 totalMs=1923 count=4
HomepagePerf WatchlistHydrate section=watchlist fetchMs=368 normalizeMs=0 totalMs=368 batches=1 count=4
HomepagePerf WatchlistQuery section=watchlist mode=hydrated blobMs=1924 hydrateMs=368 totalMs=2292 count=4
HomepagePerf TTC section=watchlist durationMs=2384 content_state=filled
```

### Post-cache calls (instant)

```text
HomepagePerf AuthGetBearerToken callId=16 entropyMs=0 totalMs=1 providedEntropy=false   ← path=cache
HomepagePerf AuthGetBearerToken callId=17 entropyMs=0 totalMs=3 providedEntropy=false
HomepagePerf AuthGetBearerToken callId=10 entropyMs=0 totalMs=1 providedEntropy=true    ← caller passed id
```

**Reading**

- Auth bearer: **1,594ms** (67% of watchlist TTC).
- Snap `snapGetAllPublicKeys`: 3,208ms; watchlist didn't wait the full 3.2s because its `getBearerToken` call started ~1.6s after the snap began.
- After snap cache warms, `getBearerToken` drops to 0–3ms.

---

## Logs — Test 2: hardcoded bearer (auth bypassed)

### Section TTC

```text
HomepagePerf TTC section=tokens durationMs=0 content_state=filled
HomepagePerf TTC section=perps durationMs=0 content_state=empty
HomepagePerf TTC section=defi durationMs=0 content_state=empty
HomepagePerf TTC section=nfts durationMs=0 content_state=filled
HomepagePerf TTC section=watchlist durationMs=1638 content_state=filled    ← no longer slowest
HomepagePerf TTC section=top_traders durationMs=2023 content_state=filled
HomepagePerf TTC section=predict durationMs=2192 content_state=filled
```

### Watchlist flow

```text
HomepagePerf AUSGetHeaders section=watchlist bearerMs=0 source=hardcoded hasToken=true fingerprint=eyJhbGci…gPydquEo len=1260

HomepagePerf AUSGetAssetsWatchlist section=watchlist headersMs=198 fetchMs=447 jsonMs=0 status=200
HomepagePerf AUSGetAssetsWatchlistTotal section=watchlist totalMs=646 result=blob
HomepagePerf WatchlistBlob section=watchlist messengerMs=647 validateMs=0 totalMs=647 count=4
HomepagePerf WatchlistHydrate section=watchlist fetchMs=808 normalizeMs=0 totalMs=808 batches=1 count=4
HomepagePerf WatchlistQuery section=watchlist mode=hydrated blobMs=647 hydrateMs=809 totalMs=1456 count=4
HomepagePerf TTC section=watchlist durationMs=1638 content_state=filled
```

**Reading**

- `source=hardcoded` + `bearerMs=0` confirms bypass was active.
- Same fingerprint → stable token for experiment.
- Blob dropped from 1,923ms → 646ms (−66%) with auth removed.
- Hydrate was slower this run (808ms vs 368ms) due to network variance.
- Watchlist (~1.6s) faster than top_traders (~2.0s) and predict (~2.2s).

---

## Earlier app-only run (auth probe before package logs)

Useful as a second confirmation before in-package instrumentation. App warmed/measured bearer separately:

```text
HomepagePerf WatchlistAuth section=watchlist bearerMs=3570 success=true
HomepagePerf WatchlistBlob section=watchlist messengerMs=312 validateMs=0 totalMs=313 count=4
HomepagePerf WatchlistHydrate section=watchlist fetchMs=21 normalizeMs=0 totalMs=21 batches=1 count=4
HomepagePerf WatchlistQuery section=watchlist mode=hydrated blobMs=3884 hydrateMs=22 totalMs=3906 count=4
HomepagePerf TTC section=watchlist durationMs=4440 content_state=filled
```

After warming JWT, AUS messenger was only ~312ms — again showing auth, not the watchlist GET body, as the large cost.

---

## Root cause (refined) — message-signing-snap boot time

### Where the time goes

Instrumentation of `SnapController:handleRequest` revealed the ~3.4s `getAllPublicKeys` breaks down as:

```text
snapGetAllPublicKeys (3,438ms total)
├─ platformMs (ensureCanUsePlatform / onboarding gate): 9ms      ← negligible
├─ startupMs (startSnap / snap boot): 2,819ms                    ← 82% — THE BOTTLENECK
└─ rpcMs (actual key derivation): 610ms                          ← 18% — fast
```

The **message-signing-snap boot** is the root cause, not the key derivation itself.

### Cold load vs warm

| Scenario                                       | getBearerToken time | Notes                                         |
| ---------------------------------------------- | ------------------- | --------------------------------------------- |
| **Cold start** (app launch / first unlock)     | ~1.7–3.4s           | Waiting for snap boot                         |
| **Warm navigation** (tab switch, back to home) | 0–3ms               | Entropy cached (`path=cache`)                 |
| **App resumed from background**                | Depends             | Fast if snap still in memory; cold if evicted |

### Auth flow breakdown

Later instrumentation of `AuthenticationController.getBearerToken` showed:

- `SRPGetAccessToken path=session` is **~0ms** (not login).
- `unlockMs=0`, `accessTokenMs=0`.
- Almost all time is **`entropyMs`** with `AuthPrimaryEntropy path=snap snapMs≈3200–3500`.

### Other flows affected (not just watchlist)

Many homepage/init callers hit `getBearerToken()` **without** `entropySourceId` at once, all blocked on the same snap boot:

| Caller                        | Source file                                |
| ----------------------------- | ------------------------------------------ |
| Assets controller init        | `assets-controller-init.ts`                |
| Social controller hydration   | `social-controller-hydration.ts`           |
| Money account upgrade         | `money-account-upgrade-controller-init.ts` |
| Popular tokens                | `useFetchPopularTokens.ts`                 |
| Watchlist (AUS `#getHeaders`) | `storage.ts`                               |
| ReactQueryService (multiple)  | `ReactQueryService.ts`                     |
| Braze / notifications         | `index.ts`                                 |

**Any feature using `AuthenticatedUserStorageService` or `getBearerToken` during startup pays this penalty on cold load.**

### What happens

Each call does:

```text
getBearerToken()  // no entropy id
  → getPrimaryEntropySourceId()
      → cache miss → snapGetAllPublicKeys()   // ~2–4s, concurrent stampede
  → getAccessToken(session)                   // ~0ms
```

The in-memory primary-entropy cache is only set **after** the first snap call finishes. Concurrent callers all see an empty cache and **all** invoke the snap in parallel (thundering herd). After cache is warm, later calls are instant (`path=cache`, `totalMs=0`).

Contrast: `callId=9` / `18` / `19` with `providedEntropy=true` → `entropyMs=0`, `totalMs≈1–3`.

### Sample log excerpt (homepage open)

```text
AuthGetBearerTokenStart callId=1..8,10..14 providedEntropy=false   # stampede
AUSGetHeadersStart section=watchlist
AuthGetBearerTokenStart callId=9 providedEntropy=true
SRPGetAccessToken path=session totalMs=0
AuthGetBearerToken callId=9 totalMs=1 providedEntropy=true          # fast

AuthPrimaryEntropy path=snap snapMs=4211 keyCount=1
AuthGetBearerToken callId=5 unlockMs=0 entropyMs=4211 accessTokenMs=0 totalMs=4211

AuthPrimaryEntropy path=snap snapMs=2679 ...
AuthGetBearerToken callId=11 entropyMs=2680 totalMs=2682            # watchlist bearer
AUSGetHeaders bearerMs=2684

AuthGetBearerToken callId=15 ... AuthPrimaryEntropy path=cache totalMs=0  # after warm
```

Watchlist TTC this run: **~2384ms** (still dominated by entropy/snap wait + AUS fetch).

### Fix directions (core / app)

1. **Coalesce in-flight** `getPrimaryEntropySourceId` (single shared promise) — same pattern as SRP `pairSrpProfiles` dedupe.
2. **Warm primary entropy id once** at unlock / sign-in before homepage fan-out.
3. **Pass `entropySourceId`** into `getBearerToken` where callers already know it (avoids snap entirely).
4. Optional: local watchlist ID cache so UI is not blocked on this path.

---

## Conclusions

1. **Primary bottleneck:** The **message-signing-snap boot time** (~2.8s, 82% of the snap call). The actual key derivation is only ~610ms (18%). The onboarding gate is negligible (~9ms).
2. **This is a cold-load issue:** After the snap boots and entropy is cached, `getBearerToken` resolves in 0–3ms. Warm navigation is fast.
3. **Affects all auth-dependent features on startup**, not just watchlist: assets controller, social sync, popular tokens, notifications, etc.
4. **Secondary costs:** User-storage HTTP (~0.3–0.5s) and Token API hydrate (~0.05–0.8s, network-dependent).
5. **Not the problem:** SRP `#login`, Superstruct validate, Redux balance overlay, `assertIsUnlocked`.
6. Hardcoded-bearer experiment confirms: bypassing `getBearerToken` dropped blob time by 66% (1,923ms → 646ms) and TTC by 31% (2,384ms → 1,638ms).

## Suggested follow-ups

### High impact (snap boot is the root cause)

- **Investigate message-signing-snap boot time** — why does it take ~2.8s vs ~900ms for solana/bitcoin snaps? Is it starting later when JS thread is busy, or inherently heavier?
- **Boot message-signing-snap earlier** — trigger it at unlock before homepage features need it.
- **Snap team consultation** — can snap boot be optimized or parallelized better?

### Medium impact (auth layer)

- Fix stampede in `@metamask/profile-sync-controller` (`getPrimaryEntropySourceId` in-flight coalescing + early warm). _(Already prototyped locally, coalescing works.)_
- Audit high-churn `getBearerToken()` call sites that omit entropy id on startup.
- Pass `entropySourceId` where callers already know it (avoids snap entirely).
