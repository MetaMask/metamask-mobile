# Collectibles Pack Partner integration

This branch adds Pack Partner to the existing Collectibles module. Tapping the homepage carousel title opens `CollectiblesHomeScreen` in `CollectiblesLayout`. Back returns to the wallet.

## Review stack

The Pack Partner integration is extracted in four dependent steps, each with its
own tests: **2.1 client and contracts**, **2.2 data service and Engine registration**,
**2.3 provider and controller journal**, **2.4 hooks and selectors**. The original
`collectibles-2-pack-partner-provider` branch is retained for comparison. No product
screen, Social service or Collectibles API service belongs to these steps.

## Naming convention

The feature is **Collectibles**, always plural. Use `Collectibles` for class,
component and type prefixes (`CollectiblesController`, `CollectiblesPack`),
`collectibles` for functions, paths, query keys and feature-owned identifiers,
and `COLLECTIBLES` for constants, routes and environment-variable prefixes
(`MM_COLLECTIBLES_*`). The remote feature flag is `collectiblesEnabled`.
Apply this convention to controllers, services, clients, hooks, tests, translations
and documentation. Do not introduce singular feature aliases.

Existing platform NFT terminology and external package, provider or design-source
contracts retain their original names; a module rename must not alter those APIs.
This is a coordinated rename of an unreleased module, not a second controller or
compatibility layer.

## Feature flag

The homepage section, Trade menu and navigator registration use `selectCollectiblesEnabled`.
The version-gated remote flag `collectiblesEnabled` takes priority:

```json
{ "enabled": true, "minimumVersion": "8.23.0" }
```

The shared validator checks the installed native app version. A valid disabled
flag keeps the feature hidden. When the validator returns `undefined` (missing or
invalid flag, or the development remote-flag override), development builds can
fall back to `MM_COLLECTIBLES_ENABLED=true`. Release builds have no local fallback.
Visibility does not depend on the selected account or its network. See the
[shared flag rules](../../../../docs/readme/version-gated-feature-flags.md).

## Pack Partner integration

Step 2.1 introduces the validated `PackPartnerApiClient`, transport errors,
response schemas, shared contracts and environment configuration. The client
supports the read and transaction endpoints; it does not schedule reads, cache
responses, sign transactions or automatically replay financial commands.
All settlement amounts are exact decimal strings of USDC base units (six decimals).
Prepared packs require non-blank memos and transaction bytes, for both single
and batch generation. Empty or whitespace-only values fail with `INVALID_RESPONSE`
at the client boundary before being returned to a caller.
Submission responses also require a non-blank signature, even when `success`
is omitted; `success: false` still rejects the submission.

Step 2.2 adds `PackPartnerDataService`, extending `BaseDataService`, and registers
it in Engine with its messenger and query keys. It owns read caching, coalescing,
bounded read retries and collection-only persistence through `StorageService`.
The catalogue stays transient; a complete owned collection is loaded in pages of
500 and its last successful snapshot is restored for offline display. Reset clears
snapshots and drains writes before service messengers are destroyed. A storage
cleanup failure is reported after other controllers clear their wallet data.
After an opening or sale, explicitly invalidating the affected wallet refreshes
its collection even if other reads evicted its background entry or its read key.
Passing `refetchType: 'none'` only marks the matching query stale.
Pack inventory retains all requested pages for the current query and stops at
a cursor already seen by either the UI or the background client.
See [read-service policies](services/data/README.md).

The controller remains the empty initialization shell. Transaction orchestration
and its journal arrive in step 2.3; React hooks and balance reads arrive in 2.4.
The homepage entry and placeholder screen are unchanged.

## Controller registration and persistence

`CollectiblesController` extends `BaseController` with an empty state. Engine
creates its messenger and controller, passes `persistedState.CollectiblesController`
(or the default state), and exposes it through `Engine.context` and `Engine.state`.
The standard `getState` action and `stateChanged` event connect it to Redux and
the existing controller storage discovery. Wallet reset calls `clearState`.
Controller state is excluded from exported state logs.

This preserves the standard persistence and restoration wiring. There are no
persisted fields yet: `metadata` is empty, so `EngineService` has nothing to write
to disk. Future state fields must declare their persistence metadata and default
values. Do not introduce a custom storage implementation, immediate disk flush,
or migration from the unreleased Gacha prototype.

Implementation references:

- [Engine initializer](../../../core/Engine/controllers/collectibles-controller/index.ts)
- [Messenger registration](../../../core/Engine/messengers/collectibles-controller-messenger/index.ts)
- [Engine persistence](../../../core/EngineService/EngineService.ts)
- [Controller storage](../../../store/persistConfig/index.ts)

### Environment

Metro rejects an unsupported network when creating the bundle.
`MM_COLLECTIBLES_ENVIRONMENT` selects `devnet` or `mainnet`. When unset, development
builds default to devnet and other builds to mainnet. Configure
`MM_PACK_PARTNER_{DEVNET,MAINNET}_{API_URL,CARDS_API_URL,WEBSITE_URL}` only in ignored
local configuration. Empty endpoints disable partner calls; see `.js.env.example`.

`PACK_PARTNER_DEVNET_API_KEY` is a **temporary local-development workaround until the proxy is configured**. Set it only in the ignored local `.js.env`, never in CI, shared builds or release configuration. The client sends `x-api-key` only in a development build on devnet, and only to the packs API, never the cards API. Mainnet and release builds ignore any key, including an explicit client option; there is no mainnet key variable. An empty key preserves public access. Remove this workaround when authentication moves behind the proxy. Configuration and transport tests cover the development/environment combinations.

Signing is not wired at this step. The published Solana Snap dependency is unchanged.

Collectibles does not extend QuickBuy. Future product screens must disable Buy
when Solana USDC is insufficient and keep alternate-token payment disabled until
MetaMask Pay supports that destination.

## Module boundary

Code outside `app/components/UI/Collectibles/` imports only the module's public
API, [`index.ts`](index.ts). It exports exactly what callers are supported in
depending on; everything else is private. When a caller needs something new,
add a named export to that file rather than reaching inside.

These rules follow from it:

- **`index.ts` is a boundary, never a file name.** A module carries its own
  name (`routes/CollectiblesLayout.tsx`, `selectors/featureFlags.ts`): a lone file does not
  become `index.ts` just because it sits in its own directory, because that
  makes it unsearchable by name. `index.ts` is reserved for the module entry
  point above and for component directories, where the
  [component scaffold](../../../../.agents/skills/mms-component-scaffold/SKILL.md)
  requires one. Never use `export *` in either: Metro does not tree-shake
  barrels, so importing one symbol evaluates the whole file at startup.
- **Internal files have explicit names and direct imports.** Provider contracts,
  schemas, constants and utilities have named files; do not introduce barrels.
  Shared contracts are not duplicate runtime schemas or mappers.
- **Composition wiring is listed, not re-exported.** Engine init, its
  messenger, `Engine.types` and the navigation param list have to reach inside
  the module. They are named in the fence's composition allowlist, so the
  dependency stays visible instead of being hidden behind an export that
  product code could then use by accident.

## Scope for contributors and agents

Keep this branch limited to the Pack Partner integration and its Engine/storage
wiring. Do not introduce the POC's artwork, routes, UI, Social or Collectibles API
services. Preserve the initialization branch's public entry points.

## Test layer placement

Client, schema and amount tests exercise transport and pure validation with HTTP
mocked. There is no new screen behavior requiring component-view or device tests.
Service integration tests run the real HTTP validation, `BaseDataService`,
query bridge and `StorageService` with HTTP and disk I/O substituted. They cover
cache policy, full pagination, offline restart and reset races. Engine tests cover
registration and storage cleanup ordering. They do not prove native disk durability.

```sh
yarn jest app/components/UI/Collectibles/services app/components/UI/Collectibles/providers --runInBand --coverage=false
yarn jest -c jest.config.integration.js app/components/UI/Collectibles/services --runInBand --coverage=false
```

### Test conventions

Start with the repository's [mobile testing guide](../../../../.agents/skills/mms-mobile-testing/SKILL.md)
and [component-view conventions](../../../../docs/testing/component-view-tests.md).
Apply these rules to Collectibles tests, including its homepage entry outside
the module directory:

- **Translated copy:** use `strings('collectibles.title')`
  from `locales/i18n` when querying localized text, rather than repeating the
  English copy. This keeps tests aligned with translation keys when copy changes.
  Use exported test-ID constants for structural queries.
- **Fresh elements after transitions:** do not hold a `findBy*` result across
  navigation, loading or a state change that can remount the element. Await the
  relevant readiness marker, then press a fresh `getByTestId(...)`. For assertions
  after navigation, use `waitFor(() => expect(screen.getByTestId(...)).toBeOnTheScreen())`.
- **Isolated Engine updates:** use the [Collectibles renderer helpers](../../../../tests/component-view/renderers/collectibles.tsx)
  for simulated controller updates. Preserve other flags and controller fields
  such as `cacheTimestamp`; save the previous Engine state and restore it in
  `finally`, even if an assertion fails. `jest.clearAllMocks()` does not undo
  assignments to `Engine.state`. Isolation must hold between iOS and Android runs.
- **Distinct coverage:** selector logic and the initial flag gate have unit
  coverage. Keep the live kill-switch scenario in component-view tests: first
  show the section, then disable the flag through the Engine-to-Redux update
  path and assert that it disappears without remounting the homepage. Explain
  this distinction rather than duplicating a static visibility test.
- **Accurate test names:** name only conditions explicitly established by the
  fixture and behavior asserted by the test. Do not claim an account or network
  scenario merely because the fixture happens to default to it.

The [homepage entry tests](../../Views/Homepage/Sections/Collectibles/CollectiblesSection.view.test.tsx)
demonstrate these conventions. The [testing skill's component-view rules](../../../../.agents/skills/mms-mobile-testing/references/component-view.md)
also cover localized labels and mock isolation.

### Review evidence

Follow the repository's [Definition of Ready for Review](../../../../docs/readme/ready-for-review.md).
Keep PR descriptions and Gherkin aligned with the actual plural identifiers,
especially `collectiblesEnabled`, `MM_COLLECTIBLES_ENABLED` and `CollectiblesController`.
Document the platform, build type and exact flag setup, including remote-flag
precedence. Report commands and results actually obtained on the reviewed code;
component-view runs for Android are not Android device tests. State unperformed
or non-applicable performance checks explicitly, and provide screenshots for
visible changes from the branch under review, not from the full POC.
