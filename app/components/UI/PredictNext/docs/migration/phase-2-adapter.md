# Phase 2: Polymarket Adapter and Legacy Provider Delegation

## Goal

Build the new `PolymarketAdapter` as the provider seam for PredictNext, then incrementally redirect old `PolymarketProvider` methods to delegate to it. The old provider remains the public legacy surface during this phase: it calls the adapter, receives canonical PredictNext types, and maps them back to legacy types through `PredictNext/compat/`.

This phase must not move every current `PolymarketProvider` responsibility into the adapter. The adapter owns provider translation and provider requests. Stateful workflows move later into services.

## Prerequisites

- Phase 1 complete:
  - canonical types
  - `PredictAdapter` interface
  - `PredictError` model
  - compat mappers
  - foundational barrel exports
- Agreement that canonical entities are rich enough to preserve legacy UI behavior during delegation.

## Responsibility Boundary

### Adapter owns in Phase 2

- Gamma API event, series, search, carousel, and event-detail requests
- CLOB price history, price, orderbook, preview, and raw order submission requests
- Data/account API positions, activity, balance, account state, and PnL requests
- provider DTO to canonical type mapping
- provider authentication helpers such as CLOB API keys and L2 headers
- provider transaction payload construction (`buildDepositTx`, `buildWithdrawTx`, `buildClaimTx`)
- typed live data subscription creation

### Adapter does not own in Phase 2

- order rate limiting
- active-order state transitions
- deposit-before-order orchestration
- optimistic position overlays
- transaction status side effects
- cache policy and retries
- analytics emission
- UI state

Those stay in the old provider/controller temporarily and move to services in Phases 3 and 4.

## Naming Rules

Use the new adapter method names from `docs/adapters.md`.

| Legacy provider method                                     | Adapter method                                    | Notes                                                       |
| ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `getMarkets`                                               | `fetchEvents`                                     | legacy `PredictMarket` maps to canonical `PredictEvent`     |
| `searchMarkets`                                            | `searchEvents`                                    | returns paginated canonical events                          |
| `getCarouselMarkets`                                       | `fetchCarouselEvents`                             | preserves carousel filtering/collapse rules                 |
| `getMarketsByIds`                                          | `fetchEventsByIds`                                | event IDs in canonical terminology                          |
| `getMarketDetails`                                         | `fetchEvent`                                      | legacy `marketId` currently means event ID                  |
| `getMarketSeries`                                          | `fetchEventSeries`                                | preserve current series behavior                            |
| `getPriceHistory`                                          | `fetchPriceHistory`                               | market ID here is canonical Market/condition ID             |
| `getPrices`                                                | `fetchPrices`                                     | token/outcome query based, not just event IDs               |
| `getPositions`                                             | `fetchPositions`                                  | owner address in, provider account resolved inside adapter  |
| `getActivity`                                              | `fetchActivity`                                   | owner address in                                            |
| `getUnrealizedPnL`                                         | `fetchUnrealizedPnL`                              | owner address in                                            |
| `getBalance`                                               | `fetchBalance`                                    | owner address in                                            |
| `getAccountState`                                          | `fetchAccountState`                               | owner address in                                            |
| `previewOrder`                                             | `getOrderPreview`                                 | adapter returns canonical preview                           |
| internal `#submitOrder` / `placeOrder` lower-level request | `submitOrder`                                     | old provider keeps workflow wrapper initially               |
| `prepareDeposit`                                           | `buildDepositTx`                                  | full deposit workflow remains outside adapter               |
| `prepareWithdraw`                                          | `buildWithdrawTx`                                 | signing/publish hooks remain outside adapter initially      |
| `prepareClaim`                                             | `buildClaimTx`                                    | beforeSign/publish/confirm remain outside adapter initially |
| `subscribeToGameUpdates`                                   | `createSubscription({ channel: 'gameUpdates' })`  |
| `subscribeToMarketPrices`                                  | `createSubscription({ channel: 'marketPrices' })` |
| `subscribeToOrderbook`                                     | `createSubscription({ channel: 'orderbook' })`    |
| `subscribeToCryptoPrices`                                  | `createSubscription({ channel: 'cryptoPrices' })` |

## Deliverables

- `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`
- Polymarket adapter client modules for Gamma, CLOB, data/account APIs, and live data
- Polymarket DTO modules local to the adapter
- Polymarket mapper modules from provider DTOs to canonical PredictNext entities
- adapter unit/integration tests using mocked API responses
- old `PolymarketProvider.ts` delegated method-by-method with legacy behavior preserved

## Step-by-Step Tasks

### 1. Create the Polymarket adapter module layout

Create the module skeleton without switching old code yet.

```text
app/components/UI/PredictNext/adapters/polymarket/
├── PolymarketAdapter.ts
├── PolymarketAdapter.test.ts
├── index.ts
├── client/
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

Do not import provider DTOs from old `Predict/providers/polymarket/types.ts` into new code if the project rule remains “new code never imports old code.” Instead, move or recreate DTO definitions in the new adapter module, then let old code delegate downward.

### 2. Implement event read mapping first

Implement:

- `fetchEvents`
- `fetchEvent`
- `fetchEventsByIds`
- `fetchCarouselEvents`
- `searchEvents`
- `fetchEventSeries`

Preserve current behavior from `PolymarketProvider.ts` and `utils.ts`:

- category query-param construction
- `world-cup` filtering
- `customQueryParams` handling
- carousel ended-game filtering
- carousel moneyline collapse
- sports game parsing
- team lookup/enrichment
- extended sports child-event merging
- event series mapping
- highlighted events remain a controller/service concern, not adapter behavior

Acceptance for this step:

- adapter tests prove provider DTOs map to canonical `PredictEvent`/`PredictMarket`/`PredictOutcome`
- compat mapper tests prove canonical results map back to the same legacy `PredictMarket` shape expected by old UI
- no old provider delegation yet unless tests are already in place

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
10. `getCryptoTargetPrice`

Each legacy method should follow the same pattern:

```text
legacy params
  → compat mapper or local adapter-param mapper
  → PolymarketAdapter method
  → canonical result
  → compat mapper
  → legacy result
```

Add temporary delegation comments in old code, for example:

```typescript
// PredictNext migration: delegate provider request to PolymarketAdapter, then map
// canonical Event data back to legacy PredictMarket until Phase 7 cleanup.
```

Acceptance for this step:

- existing provider tests continue to pass or are updated to assert delegated behavior
- old controller and hooks are untouched
- no UI behavior changes

### 4. Implement portfolio/account methods

Implement:

- `fetchPositions`
- `fetchActivity`
- `fetchUnrealizedPnL`
- `fetchBalance`
- `fetchAccountState`

Important account-state note:

Current `getAccountState` is partly a provider request and partly account-resolution orchestration. It derives Safe/deposit-wallet addresses, checks on-chain deployment, and checks Polymarket activity. For Phase 2, keep this behind the adapter seam only if it is needed to preserve current behavior. Mark it as a candidate to split later:

- provider account resolution → adapter/internal helper during Phase 2
- caching policy → `PortfolioService` in Phase 3
- transaction setup/preflight → `TransactionService` in Phase 4

Acceptance for this step:

- old `getPositions`, `getActivity`, `getUnrealizedPnL`, `getBalance`, and `getAccountState` return the same legacy shapes
- optimistic overlays are still applied by the old provider, not by the adapter
- account-state cache remains temporary legacy/provider behavior until services own it

### 5. Implement order preview and raw order submission

Implement:

- `getOrderPreview`
- `submitOrder`

Keep this split:

- Adapter owns orderbook reads, preview math, CLOB signing, headers, serialization, raw submit.
- Old provider still owns rate limiting, claimable-position guard, optimistic overlay creation/removal, and legacy `OrderResult` shape until `TradingService` exists.

Acceptance for this step:

- `previewOrder` returns the same legacy preview after compat mapping
- `placeOrder` behavior remains unchanged from the old UI perspective
- buy/sell error mapping remains compatible with existing controller handling

### 6. Implement transaction builders without moving workflows

Implement:

- `buildDepositTx`
- `buildWithdrawTx`
- `buildClaimTx`

Do not move these old provider/controller responsibilities into the adapter:

- `beforeSignClaim`
- `publishClaim`
- `confirmClaim`
- `beforePublishDepositWalletDeposit`
- `syncDepositWalletBalanceAllowanceForDepositTransaction`
- `signWithdraw`
- transaction status side effects

Those belong to Phase 4 `TransactionService` or the controller integration around it.

Acceptance for this step:

- old `prepareDeposit`, `prepareWithdraw`, and `prepareClaim` preserve transaction shapes
- transaction lifecycle hooks still work through old controller/provider code

### 7. Implement typed live subscriptions

Implement:

- `createSubscription({ channel: 'gameUpdates', ... })`
- `createSubscription({ channel: 'marketPrices', ... })`
- `createSubscription({ channel: 'orderbook', ... })`
- `createSubscription({ channel: 'cryptoPrices', ... })`

Preserve current `subscribeToOrderbook` behavior: bootstrap with REST `getOrderBook` and seed the WebSocket manager so charts have an initial snapshot.

Acceptance for this step:

- old subscription methods delegate through the adapter
- callback payloads are unchanged for old hooks
- `getConnectionStatus` remains available until `LiveDataService` owns it

### 8. Add characterization tests

Before broad delegation, lock current behavior with tests around:

- category/event query param generation
- event DTO to canonical Event mapping
- canonical Event to legacy PredictMarket mapping
- carousel filtering and moneyline collapse
- sports game/team/child-event behavior
- price history mapping
- `/prices` token query mapping
- positions/activity mapping
- order preview math
- deposit/withdraw/claim transaction shapes
- live subscription channel mapping

These tests are more valuable than line-by-line unit tests because the migration goal is behavior preservation.

## Files Created

| File Path                                                                     | Description                        | Estimated Lines |
| ----------------------------------------------------------------------------- | ---------------------------------- | --------------- |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.ts`      | Implementation of `PredictAdapter` | 400-700         |
| `app/components/UI/PredictNext/adapters/polymarket/PolymarketAdapter.test.ts` | Adapter boundary tests             | 300-500         |
| `app/components/UI/PredictNext/adapters/polymarket/client/*.ts`               | Provider API client functions      | 300-600         |
| `app/components/UI/PredictNext/adapters/polymarket/dto/*.ts`                  | Provider DTO definitions           | 150-300         |
| `app/components/UI/PredictNext/adapters/polymarket/mappers/*.ts`              | DTO-to-canonical mappers           | 300-600         |
| `app/components/UI/PredictNext/adapters/polymarket/index.ts`                  | Polymarket adapter barrel export   | 5-10            |

## Files Affected in Old Code

| File Path                                                                   | Expected Change                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`      | Incremental delegation to `PolymarketAdapter` with legacy mapping |
| `app/components/UI/Predict/providers/polymarket/PolymarketProvider.test.ts` | Existing tests updated to verify delegated behavior where useful  |

## Non-Goals

- No UI migration.
- No old controller rewrite beyond what is required to keep existing behavior.
- No service extraction.
- No change to route params.
- No deletion of old provider helpers until services are ready to own the extracted workflows.

## Acceptance Criteria

- `PolymarketAdapter` implements the agreed `PredictAdapter` contract.
- All adapter-returned values are canonical PredictNext entities, never provider DTOs.
- Old `PolymarketProvider` methods return the same legacy data shapes as before.
- No changes are required in `PredictController.ts` or old hooks for read delegation PRs.
- Stateful workflows remain outside the adapter until the corresponding services exist.
- Existing Predict behavior remains unchanged with the feature enabled.

## Estimated PRs

- **PR 1**: Adapter module skeleton, DTOs, event mappers, read clients, and tests.
- **PR 2**: Legacy provider read delegation for events, search, carousel, details, series, price history, and prices.
- **PR 3**: Portfolio/account adapter methods and legacy provider delegation.
- **PR 4**: Order preview and raw order submission adapter methods; old provider keeps workflow wrapper.
- **PR 5**: Transaction builders and typed live subscription delegation.
