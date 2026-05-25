# Phase 2: Polymarket Adapter, PredictSessionService, and Legacy PolymarketProvider Delegation

## Goal

Build the stateless `PolymarketAdapter` (implementing `VenueAdapter`) and `PredictSessionService` (which produces session-bound `PredictClient` views) for PredictNext, then incrementally redirect legacy `PolymarketProvider` methods to delegate to them. The legacy `PolymarketProvider` remains the public legacy surface during this phase: it obtains a `PredictClient` from `PredictSessionService.getClient(ownerAddress)`, calls methods on the bound view, receives canonical PredictNext types, and maps them back to legacy types through `PredictNext/compat/`.

This phase must not move every current `PolymarketProvider` responsibility into the adapter. `PolymarketAdapter` owns venue translation and stateless venue protocol operations. `PredictSessionService` owns session caching keyed by active `venueId` and `ownerAddress`, plus auth, eligibility, readiness, refresh, invalidation, and construction of the session-bound `PredictClient` view that wraps the active adapter. Stateful product workflows move later into services.

There is no separate `PredictClient` class or hand-maintained interface in Phase 2. `PredictClient` is a derived type alias declared in Phase 1's adapter types module; the _runtime_ bound view that callers hold is produced inside `PredictSessionService` by binding the active session into a proxy of `PolymarketAdapter`.

## Prerequisites

- Phase 1 complete:
  - canonical types
  - `VenueAdapter` contract and derived `PredictClient` type
  - `PredictSessionService` contract
  - `PredictError` model
  - compat mappers
  - foundational barrel exports
- Agreement that canonical entities are rich enough to preserve legacy UI behavior during delegation.

## Responsibility Boundary

### Session-bound view (`PredictClient`) owns in Phase 2

- presenting canonical product-facing venue methods to callers (its shape is mechanically derived from `VenueAdapter`; nothing to implement separately)
- routing every venue operation through the active adapter with the session supplied by `PredictSessionService` (this binding lives inside the session service's proxy logic)
- keeping session objects out of product services, controllers, hooks, and components

### PolymarketAdapter owns in Phase 2

- Gamma API event, series, search, carousel, and event-detail requests
- CLOB price history, price, orderbook, preview, and raw order submission requests
- Data/account API positions, activity, balance, account readiness, and PnL requests using explicit session context
- venue DTO to canonical type mapping
- stateless venue protocol operations and payload construction from explicit params and session context
- venue transaction payload construction (`buildDepositTx`, `buildWithdrawTx`, `buildClaimTx`), including venue-specific payload signing needed to produce valid calldata
- typed live data subscription creation

### PredictSessionService owns in Phase 2

- resolving `PredictSigner` from `ownerAddress`
- returning a generic `PredictClient` bound to active venue, active adapter, current session, and `ownerAddress`
- asking `PolymarketAdapter.createSession` for new session material when the cached session is missing or expired
- caching Polymarket session material by active venue and `ownerAddress`
- maintaining operational eligibility and account-readiness state needed to create a valid session/client
- invalidating session material on account switch, explicit refresh, auth failure, or active venue change
- keeping API keys, headers, venue account addresses, wallet types, deployment flags, and session objects out of product service APIs
- avoiding public session-purpose or scope types; any internal credential differences stay behind `PredictSessionService` and adapter-created session data

### Client/adapter does not own in Phase 2

- product-level signer resolution from app state
- session caching or refresh policy outside `PredictSessionService`
- order rate limiting
- active-order state transitions
- deposit-before-order orchestration
- optimistic portfolio cache patches
- transaction status side effects
- canonical read cache policy and retries
- analytics emission
- UI state

Those stay in the legacy `PolymarketProvider` and old controller temporarily, then move to services in Phases 3 and 4.

## Naming Rules

Use the new `PredictClient` method names from `docs/adapters.md`.

| Legacy `PolymarketProvider` method                         | PredictNext boundary                                     | Notes                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `getMarkets`                                               | `fetchEvents`                                            | legacy `PredictMarket` maps to canonical `PredictEvent`           |
| `searchMarkets`                                            | `searchEvents`                                           | returns paginated canonical events                                |
| `getCarouselMarkets`                                       | `fetchCarouselEvents`                                    | preserves carousel filtering/collapse rules                       |
| `getMarketsByIds`                                          | `fetchEventsByIds`                                       | event IDs in canonical terminology                                |
| `getMarketDetails`                                         | `fetchEvent`                                             | legacy `marketId` currently means event ID                        |
| `getMarketSeries`                                          | `fetchEventSeries`                                       | preserve current series behavior                                  |
| `getPriceHistory`                                          | `fetchPriceHistory`                                      | market ID here is canonical Market/condition ID                   |
| `getCryptoPriceHistory`                                    | `fetchCryptoPriceHistory`                                | crypto up/down auxiliary price history                            |
| `getCryptoTargetPrice`                                     | `fetchCryptoReferencePrice`                              | PredictNext term is Reference Price, not target price             |
| `getPrices`                                                | `fetchPrices`                                            | token/outcome query based, not just event IDs                     |
| `getPositions`                                             | client `fetchPositions`                                  | `PredictSessionService.getClient(ownerAddress)` first             |
| `getActivity`                                              | client `fetchActivity`                                   | `PredictSessionService.getClient(ownerAddress)` first             |
| `getUnrealizedPnL`                                         | client `fetchUnrealizedPnL`                              | `PredictSessionService.getClient(ownerAddress)` first             |
| `getBalance`                                               | client `fetchBalance`                                    | returns settlement-currency decimal string; legacy maps to number |
| `getAccountState`                                          | client `fetchAccountReadiness` + temporary legacy helper | legacy shape preserved at old seam                                |
| `previewOrder`                                             | client `getOrderPreview`                                 | quote/read; legacy behavior preserved                             |
| internal `#submitOrder` / `placeOrder` lower-level request | client `submitOrder`                                     | legacy `PolymarketProvider` keeps workflow wrapper initially      |
| `prepareDeposit`                                           | client `buildDepositTx({ mode: 'editable-template' })`   | full deposit workflow remains outside client/adapter              |
| `prepareWithdraw`                                          | client `buildWithdrawTx({ mode: 'editable-template' })`  | transaction lifecycle hooks remain outside client initially       |
| `prepareClaim`                                             | client `buildClaimTx`                                    | beforeSign/publish/confirm remain outside client initially        |
| `subscribeToGameUpdates`                                   | `createSubscription({ channel: 'gameUpdates' })`         |
| `subscribeToMarketPrices`                                  | `createSubscription({ channel: 'marketPrices' })`        |
| `subscribeToOrderbook`                                     | `createSubscription({ channel: 'orderbook' })`           |
| `subscribeToCryptoPrices`                                  | `createSubscription({ channel: 'cryptoPrices' })`        |

## Deliverables

- `app/components/UI/PredictNext/adapters/types.ts` — `VenueAdapter` contract and derived `PredictClient` type alias (declared in Phase 1; finalized here against the real implementation)
- `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts` — stateless `VenueAdapter` implementation
- `PredictSessionService` implementation wired to the active adapter registry and Predict signer provider; produces the session-bound `PredictClient` proxy
- Polymarket venue API modules for Gamma, CLOB, crypto price, data/account APIs, and live data
- Polymarket DTO modules local to the adapter implementation
- Polymarket mapper modules from venue DTOs to canonical PredictNext entities
- adapter unit/integration tests using mocked API responses
- legacy `PolymarketProvider.ts` delegated method-by-method with legacy behavior preserved

## Step-by-Step Tasks

### 1. Create the adapter module layout

Create the module skeleton without switching old code yet.

```text
app/components/UI/PredictNext/adapters/
├── types.ts                              # VenueAdapter + derived PredictClient type
├── index.ts
└── polymarket/
    ├── PolymarketAdapter.ts              # VenueAdapter implementation
    ├── PolymarketAdapter.test.ts
    ├── index.ts
    ├── venue-api/
    │   ├── gammaClient.ts
    │   ├── clobClient.ts
    │   ├── dataApiClient.ts
    │   └── liveDataClient.ts
    ├── dto/
    │   ├── gamma.ts
    │   ├── clob.ts
    │   └── dataApi.ts
    ├── mappers/
    │   ├── eventMapper.ts
    │   ├── positionMapper.ts
    │   ├── activityMapper.ts
    │   ├── priceMapper.ts
        │   └── accountMapper.ts
        └── utils/
            └── queryParams.ts
```

Do not import venue DTOs, clients, mappers, or helper functions from old `Predict/providers/polymarket/*` into PredictNext. Dependency direction is one-way during migration: legacy `Predict/` may import and delegate to `PredictNext/`, but `PredictNext/` must not import old `Predict/` modules except through the temporary `compat/` bridge. Move or recreate DTO definitions and venue helper behavior inside the new Polymarket adapter module, lock behavior with characterization tests, then let old code delegate downward.

### 2. Implement event read mapping first

Implement:

- `fetchEvents`
- `fetchEvent`
- `fetchEventsByIds`
- `fetchCarouselEvents`
- `searchEvents`
- `fetchEventSeries`

Preserve current behavior from `PolymarketProvider.ts` and `utils.ts` without importing those modules into PredictNext:

- category query-param construction
- `world-cup` filtering
- `customQueryParams` handling
- carousel ended-game filtering
- carousel moneyline collapse
- sports game parsing into canonical optional `PredictGame` metadata
- team lookup/enrichment into canonical `PredictTeam` metadata
- extended sports child-event merging into one canonical parent `PredictEvent` with grouped `PredictMarket` entries and provenance metadata
- event series mapping
- highlighted events remain a controller/service concern, not client or adapter behavior

Acceptance for this step:

- adapter tests prove venue DTOs map to canonical `PredictEvent`/`PredictMarket`/`PredictOutcome`
- client/adapter tests prove financial values are normalized to decimal strings, while legacy compat mappers convert back to legacy numbers where required
- paginated client results use canonical `cursor` for cursor-based endpoints and `totalResults` for page-based search results
- compat mapper tests prove canonical results map back to the same legacy `PredictMarket` shape expected by old UI
- no legacy `PolymarketProvider` delegation yet unless tests are already in place
- no imports from old `Predict/providers/polymarket/*` in PredictNext client or adapter code

### 3. Delegate legacy read methods one at a time

Update old `PolymarketProvider.ts` method-by-method:

1. `getMarkets`
2. `searchMarkets`
3. `getCarouselMarkets`
4. `getMarketDetails`
5. `getMarketsByIds`
6. `getMarketSeries`
7. `getPriceHistory`
8. `getPrices`
9. `getCryptoPriceHistory`
10. `getCryptoTargetPrice` (legacy name maps to PredictNext `fetchCryptoReferencePrice`)

Each legacy method should follow the same pattern:

```text
legacy params
  → compat mapper or local client-param mapper
  → PredictSessionService.getClient(ownerAddress)
  → PredictClient method
  → PolymarketAdapter internally
  → canonical result
  → compat mapper
  → legacy result
```

Add temporary delegation comments in old code, for example:

```typescript
// PredictNext migration: delegate venue request to PredictClient, then map
// canonical Event data back to legacy PredictMarket until Phase 7 cleanup.
```

Acceptance for this step:

- existing `PolymarketProvider` tests continue to pass or are updated to assert delegated behavior
- old controller and hooks are untouched
- no UI behavior changes

### 4. Implement portfolio/account client methods

Implement `PredictClient` methods bound to the owner's session:

- `fetchPositions`
- `fetchActivity`
- `fetchUnrealizedPnL`
- `fetchBalance`
- `fetchAccountReadiness`

Important account-readiness note:

Current legacy `getAccountState` is partly a venue request and partly venue account resolution. It derives Safe/deposit-wallet addresses, checks on-chain deployment, and checks Polymarket activity. PredictNext must not bake those Polymarket internals into the canonical account model, especially because legacy Safe support is expected to disappear after users migrate to deposit wallets.

Keep this split:

- client `fetchAccountReadiness` → returns product-level `PredictAccountReadiness` (`ownerAddress`, `venueId`, `canTrade`, status, blockers) for venue/account readiness only; feature flags and app-wide network guard state are composed above the client
- venue account resolution → Polymarket session/account-context helper used by `PredictSessionService` and `PolymarketAdapter.createSession`
- legacy account shape mapping → temporary Polymarket migration helper outside the generic `PredictClient` contract
- auth/session caching and client construction policy → `PredictSessionService`
- canonical read caching policy → `PortfolioService` in Phase 3
- transaction setup/preflight workflow → `TransactionService` in Phase 4

Services may cache `PredictAccountReadiness`, but they must not reimplement or depend on Polymarket Safe/deposit-wallet derivation rules. `PredictSessionService` may cache operational account context needed to construct the session/client, but it must not expose that context as product state.

Acceptance for this step:

- old `getPositions`, `getActivity`, `getUnrealizedPnL`, `getBalance`, and `getAccountState` return the same legacy shapes
- client `fetchBalance` returns `PredictBalance.amount` as a settlement-currency decimal string; legacy `getBalance` maps it to the current human `number` for old consumers
- client `fetchAccountReadiness` returns only product-level readiness, while legacy `PolymarketProvider.getAccountState` may use a temporary Polymarket-specific helper to preserve `{ address, isDeployed, walletType }`
- optimistic position overlays are still applied by the legacy `PolymarketProvider`, not by the client or adapter, until `TradingService` emits Service Events and `PortfolioService` owns cache patches in Phase 4
- account-readiness ownership transitions from legacy `PolymarketProvider` to `PredictSessionService` during this phase; auth/session cache and client construction live in `PredictSessionService` from the start

### 5. Implement order preview and raw order submission

Implement:

- client `getOrderPreview`
- client `submitOrder`

Keep this split:

- `PredictClient.getOrderPreview` delegates orderbook reads, preview math, and canonical preview mapping to `PolymarketAdapter`.
- `PredictClient.submitOrder` delegates CLOB order signing, headers, serialization, and raw submit to `PolymarketAdapter` using session material managed by `PredictSessionService`.
- `PredictSessionService` resolves the required signer from `ownerAddress`; legacy `Signer` objects stay at the legacy `PolymarketProvider` seam during delegation and are not added to client method params.
- Legacy `PolymarketProvider` still owns rate limiting, claimable-position guard, optimistic overlay creation/removal, and legacy `OrderResult` shape until `TradingService` emits Service Events and `PortfolioService` owns cache patches.

Acceptance for this step:

- `previewOrder` returns the same legacy preview after compat mapping
- `placeOrder` behavior remains unchanged from the old UI perspective
- buy/sell error mapping remains compatible with existing controller handling

### 6. Implement transaction builders without moving workflows

Implement `PredictClient` methods:

- `buildDepositTx`
- `buildWithdrawTx`
- `buildClaimTx`

`buildDepositTx` and `buildWithdrawTx` must support `mode: 'editable-template'` for legacy `prepareDeposit` and `prepareWithdraw` delegation. In this mode they return the same zero-amount, editable ERC20 transfer templates the current confirmation / Transaction Pay flow updates after transaction creation. They also support `mode: 'fixed-amount'` for future service-owned flows that already know the final amount. `fixed-amount` requires an `amount`; forgetting an amount must not silently create an editable template.

Do not move these legacy `PolymarketProvider` or old controller responsibilities into the client or adapter:

- `beforeSignClaim`
- `publishClaim`
- `confirmClaim`
- `beforePublishDepositWalletDeposit`
- `syncDepositWalletBalanceAllowanceForDepositTransaction`
- `signWithdraw` as a transaction-controller lifecycle hook
- transaction status side effects

Client transaction builders may still perform Polymarket-specific signing needed to produce valid transaction calldata using session material managed by `PredictSessionService`. They must stop at returning a canonical `TransactionBatch`; submission, confirmation, before-sign/before-publish hooks, and state side effects belong to Phase 4 `TransactionService` or the controller integration around it.

Acceptance for this step:

- old `prepareDeposit`, `prepareWithdraw`, and `prepareClaim` preserve transaction shapes
- old `prepareDeposit` delegates through `buildDepositTx({ mode: 'editable-template' })` and still allows confirmation / Transaction Pay to update amount and payment token later
- old `prepareWithdraw` delegates through `buildWithdrawTx({ mode: 'editable-template' })`, while legacy `signWithdraw` behavior is represented by `buildWithdrawTx({ mode: 'fixed-amount', amount })` after the edited amount is known
- transaction lifecycle hooks still work through old controller and legacy `PolymarketProvider` code

### 7. Implement typed live subscription boundary

Implement the client boundary for venue streams:

- `createSubscription({ channel: 'gameUpdates', ... })`
- `createSubscription({ channel: 'marketPrices', ... })`
- `createSubscription({ channel: 'orderbook', ... })`
- `createSubscription({ channel: 'cryptoPrices', ... })`

The client delegates opening the venue stream and normalizing venue messages to `PolymarketAdapter`. It must not own long-lived read-model caches or `GameCache`-style overlays. Write-through query-cache updates are a Phase 4 `LiveDataService` + read-service responsibility.

Preserve current `subscribeToOrderbook` behavior in legacy code until Phase 4: bootstrap with REST `getOrderBook` and seed the WebSocket manager so charts have an initial snapshot.

Acceptance for this step:

- client can create typed venue subscriptions without owning overlay state
- legacy subscription callback payloads are unchanged for old hooks
- legacy `GameCache` overlay behavior remains temporary until `LiveDataService` and read services own write-through cache updates
- `getConnectionStatus` remains available until `LiveDataService` owns it

### 8. Add characterization tests

Before broad delegation, lock current behavior with tests around:

- category/event query param generation
- event DTO to canonical Event mapping
- canonical Event to legacy PredictMarket mapping
- carousel filtering and moneyline collapse
- sports game/team/child-event behavior
- price history mapping
- crypto up/down price history mapping
- crypto up/down **Reference Price** mapping from legacy target-price behavior
- `/prices` token query mapping
- positions/activity mapping
- order preview math
- deposit/withdraw/claim transaction shapes
- live subscription channel mapping

These tests are more valuable than line-by-line unit tests because the migration goal is behavior preservation.

## Files Created

| File Path                                                                              | Description                                                       | Estimated Lines |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------- |
| `app/components/UI/PredictNext/adapters/types.ts`                                      | `VenueAdapter` contract + derived `PredictClient` type alias      | 200-300         |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`               | Stateless Polymarket `VenueAdapter` implementation                | 450-750         |
| `app/components/UI/PredictNext/services/predict-session/PredictSessionService.ts`      | Session cache owner; produces session-bound `PredictClient` proxy | 150-300         |
| `app/components/UI/PredictNext/services/predict-session/PredictSessionService.test.ts` | Session service tests, including the proxy binding logic          | 150-250         |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.test.ts`          | Adapter protocol tests (canonical contract verification)          | 300-500         |
| `app/components/UI/PredictNext/adapters/polymarket/venue-api/*.ts`                     | Venue API client functions                                        | 300-600         |
| `app/components/UI/PredictNext/adapters/polymarket/dto/*.ts`                           | Venue DTO definitions                                             | 150-300         |
| `app/components/UI/PredictNext/adapters/polymarket/mappers/*.ts`                       | Venue DTO-to-canonical mappers                                    | 300-600         |
| `app/components/UI/PredictNext/adapters/polymarket/index.ts`                           | Polymarket adapter barrel export                                  | 5-10            |

## Files Affected in Old Code

| File Path                                                                   | Expected Change                                                                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`      | Incremental delegation to `PredictSessionService.getClient(owner)` → session-bound `PredictClient` view, with legacy type mapping |
| `app/components/UI/Predict/providers/polymarket/PolymarketProvider.test.ts` | Existing tests updated to verify delegated behavior where useful                                                                  |

## Non-Goals

- No UI migration.
- No old controller rewrite beyond what is required to keep existing behavior.
- No broad read/write service extraction beyond the focused `VenueAdapter` + `PredictSessionService` seam needed to keep adapters stateless.
- No change to route params.
- No deletion of legacy `PolymarketProvider` helpers until services are ready to own the extracted workflows.

## Acceptance Criteria

- `PolymarketAdapter` implements `VenueAdapter`, remains stateless, and is not imported by product services or controllers.
- `PredictSessionService` owns signer resolution plus session cache and returns session-bound `PredictClient` views keyed by active venue and owner address.
- All values returned through the `PredictClient` view are canonical PredictNext entities, never venue DTOs.
- Legacy `PolymarketProvider` methods return the same legacy data shapes as before.
- No changes are required in `PredictController.ts` or old hooks for read delegation PRs.
- Stateful workflows remain outside the adapter; auth/session/eligibility/readiness state lives in `PredictSessionService`.
- Existing Predict behavior remains unchanged with the feature enabled.

## Estimated PRs

- **PR 1**: Adapter module skeleton, Polymarket adapter, DTOs, event mappers, venue API clients, and tests.
- **PR 2**: Legacy `PolymarketProvider` read delegation for events, search, carousel, details, series, price history, crypto reference prices, and prices (calls the bound `PredictClient` view).
- **PR 3**: Portfolio/account adapter methods and legacy `PolymarketProvider` delegation.
- **PR 4**: Order preview and raw order submission adapter methods; legacy `PolymarketProvider` keeps workflow wrapper.
- **PR 5**: Transaction builders and typed live subscription delegation.
