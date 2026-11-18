# Collectibles Pack Partner integration

This branch adds the Pack Partner integration to the Collectibles foundation.
It retains the empty `CollectiblesHome` screen from the wallet homepage.
Both the section title and its button open that screen; the header returns to the
wallet. There are no tabs or bottom menu.

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

The homepage section and navigator registration use `selectCollectiblesEnabledFlag`.
The version-gated remote flag `collectiblesEnabled` takes priority:

```json
{ "enabled": true, "minimumVersion": "8.15.0" }
```

The shared validator checks the installed native app version. A valid disabled
flag keeps the feature hidden. When the validator returns `undefined` (missing or
invalid flag, or the development remote-flag override), development builds can
fall back to `MM_COLLECTIBLES_ENABLED=true`. Release builds have no local fallback.
Visibility does not depend on the selected account or its network. See the
[shared flag rules](../../../../docs/readme/version-gated-feature-flags.md).

## Pack Partner integration

This PR builds on module initialization. It adds the Pack Partner client, cached
reads, polled openings, transaction workflow, hooks and persisted operation journal.
The placeholder screen and homepage entry remain unchanged. Social and Collectibles
API services, mocks and product screens belong to later PRs.

```text
Read hooks → PackPartnerDataService → PackPartnerApiClient
Command hooks → CollectiblesController → PackPartnerProvider → PackPartnerApiClient
Openings hook + presentation queue → PackPartnerDataService → PackPartnerApiClient
```

The provider keeps the existing `PackPartnerProvider` naming used by the client,
models and companion Snap. Application-facing types are aliases of Pack Partner
models, not duplicate schemas or runtime mappers.

### Controller registration and persistence

Engine registers `CollectiblesController` through its messenger and registers
`PackPartnerDataService` as a stateless service.
The controller persists onboarding and an environment-isolated journal of purchases,
openings, reveal progress and buybacks through standard controller metadata and
Engine storage. Signed transaction bytes stay in memory. Unlock triggers recovery
by memo; no financial network request is started during initialization.

Display data stays outside the controller. The read service persists only the last
successful complete owned collection through the standard `StorageService`, keyed
by environment and wallet. Reset clears that snapshot and invalidates in-flight
work before asynchronous Snap cleanup; storage cleanup finishes before services
are destroyed. There is no migration from the unreleased Gacha prototype.

See [read and command policies](services/data/README.md) and
[recovery guarantees](services/data/recovery-persistence.md), and the
[recent openings specification](services/data/recent-openings.md).

### Environment and signing

`MM_COLLECTIBLES_ENVIRONMENT` selects `devnet` or `mainnet`. When unset, development
builds default to devnet and other builds to mainnet. Configure
`MM_PACK_PARTNER_{DEVNET,MAINNET}_{API_URL,CARDS_API_URL,WEBSITE_URL}` only in ignored
local configuration. Optional `PACK_PARTNER_{DEVNET,MAINNET}_API_KEY` values are
never persisted. Empty endpoints disable partner calls; see `.js.env.example`.

USDC transaction amounts are decimal strings of base units (six decimals).
Mainnet balance uses `AssetsController`. Devnet alone reads the selected account
through the existing Accounts API client: the upstream service returns devnet
balances with a mainnet asset prefix and does not advertise devnet to the controller.
The helper verifies the requested account and exact configured mint, accepts those
prefixes only locally, and never inserts the result into shared asset state.
Devnet uses `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`.

Signing requires the companion Snap's `signPackPartnerBuy` and
`signPackPartnerBuyback` methods. This branch retains the repository's published
Snap dependency; it does not commit a developer filesystem dependency. Until a
release contains those methods, purchases fail with `SNAP_UNSUPPORTED`. Real
purchase validation requires the coordinated Snap release or an explicit local
build override; automated tests mock signing and never spend funds.

Collectibles does not extend QuickBuy. Future product screens must disable Buy
when Solana USDC is insufficient and keep alternate-token payment disabled until
MetaMask Pay supports that destination.

## Module boundary

Code outside `app/components/UI/Collectibles/` imports only the module's public
API, [`index.ts`](index.ts). It exports exactly what callers are supported in
depending on; everything else is private. When a caller needs something new,
add a named export to that file rather than reaching inside.

Two rules follow from it:

- **`index.ts` is a boundary, never a file name.** A module carries its own
  name (`routes.tsx`, `selectors/featureFlags.ts`): a lone file does not
  become `index.ts` just because it sits in its own directory, because that
  makes it unsearchable by name. `index.ts` is reserved for the module entry
  point above and for component directories, where the
  [component scaffold](../../../../.agents/skills/mms-component-scaffold/SKILL.md)
  requires one. Never use `export *` in either: Metro does not tree-shake
  barrels, so importing one symbol evaluates the whole file at startup.
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

Integration tests exercise real client validation, service caching/storage and
controller/provider workflows with HTTP, Snap and storage boundaries mocked.
Unit tests cover parsers, amounts, guard contracts, state restoration and hooks;
hook tests use the shared query harness without adding product screens. Existing
init component-view tests remain the navigation regression check. No device E2E
or real transaction is required for this extraction.

```sh
yarn jest app/components/UI/Collectibles/providers app/components/UI/Collectibles/controllers app/components/UI/Collectibles/services app/core/Engine/controllers/collectibles-controller app/core/Engine/controllers/collectibles-data-services-init.test.ts app/core/Engine/messengers/collectibles-controller-messenger app/core/Engine/messengers/collectibles-data-services-messenger.test.ts --runInBand --coverage=false
yarn jest -c jest.config.integration.js app/components/UI/Collectibles --runInBand --coverage=false
yarn jest -c jest.config.view.js app/components/Views/Homepage/Sections/Collectibles --runInBand --coverage=false
```
