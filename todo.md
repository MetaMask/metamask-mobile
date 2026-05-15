# Dev-API switch (`MM_DEV_API_ENV`) — outstanding work

A central `app/core/devApiEnv.ts` switch points auth + downstream services at
non-prod backends. Set `MM_DEV_API_ENV=dev` (or `uat`) in `.js.env` to flip.

## Wired

JWT issuer / consumer URLs are now env-aware:

- `AuthenticationController` (mints JWT against the right OIDC env)
- `AuthenticatedUserStorageService`
- `ProfileMetricsService`
- `ChompApiService` (`MM_DEV_API_ENV=dev` wins over the remote feature flag)
- `BridgeController` + `BridgeStatusController` (via `BRIDGE_API_BASE_URL`)
- `BackendWebSocketService` (`gateway.api.cx.metamask.io` ↔ `dev-api`)
- `SocialService` (via `apiUrl(AppConstants.SOCIAL_API_URL)`)
- `NotificationServicesController` (via `env.env`)
- `UserStorageController` (identity) (via `config.env`)
- Sentinel API (`tx-sentinel-{n}.api.cx.metamask.io`) — also covers
  `SmartTransactionsController` via `setSentinelApiAuth`
- Perps `DataLakeService` (`perps.api.cx.metamask.io/api/v1/orders`)
- Bridge UI hooks (`useSearchTokens`, `usePopularTokens`) — auto-covered via
  the shared `BRIDGE_API_BASE_URL`

## Still TODO

### Patched via patch-package

These had no constructor option for URL/env. Each is rewritten at module load
to consult `process.env.MM_DEV_API_ENV` and swap `*.api.cx.metamask.io` for
`*.dev-api.cx.metamask.io`. Patches live in `patches/` and apply via
`yarn patch-package --error-on-fail` (run by `scripts/setup.mjs`).

- [x] `TokenBalancesController` — `patches/@metamask+assets-controllers+106.0.0.patch`
      rewrites `MULTICHAIN_ACCOUNTS_DOMAIN` in `multi-chain-accounts.{cjs,mjs}`.
- [x] `AssetsController` via `createApiPlatformClient` —
      `patches/@metamask+core-backend+6.3.0.patch` rewrites `API_URLS`
      (accounts/prices/token/tokens) in `shared-types.{cjs,mjs}`.

Long-term: file upstream PRs that add an `env` / `apiBaseUrl` option to
`TokenBalancesController` and `createApiPlatformClient`, then drop the patches.

### Verification

- [ ] Confirm the dev-api hostname pattern (`*.api.cx.metamask.io` →
      `*.dev-api.cx.metamask.io`) holds for **Sentinel** and **Perps**. The
      `apiUrl()` helper assumes this convention; both have a
      `TODO(MM_DEV_API_ENV)` comment at the URL definition.
- [ ] Confirm a UAT chomp endpoint exists; if so, add it to
      `CHOMP_URL_BY_DEV_API_ENV` in `chomp-api-service-init.ts`.

### Optional follow-ups

- [ ] Surface the resolved env in Settings > Developer Options so QA and
      engineers can see at a glance which backend the build is hitting.
- [ ] Developer Settings UI toggle that writes `MM_DEV_API_ENV` to
      AsyncStorage and re-reads on app restart, unblocking on-device QA
      without a rebuild.

## Verification

Set `MM_DEV_API_ENV=dev` in `.js.env`, rebuild, sign in, and confirm:

- Auth: outbound requests target `oidc.dev-api.cx.metamask.io`.
- Chomp: `[ChompApiServiceInit] MM_DEV_API_ENV=dev; using env URL`.
- Bridge / WebSocket / Sentinel / Perps / Social / UserStorage /
  Notifications: outbound URLs include `dev-api` subdomains.
