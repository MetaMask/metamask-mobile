# Phase 3: Read Services

## Goal

Build MarketDataService and PortfolioService using BaseDataService patterns. Hook old PredictController read methods to delegate to these new services. The old controller translates new service responses back to old state shapes via compat mappers before publishing to old hooks.

## Prerequisites

- Phase 2 complete (generic `PredictClient`, `PolymarketAdapter`, and `PredictSessionService` are functional and wired to the legacy `PolymarketProvider`).

## Deliverables

- `MarketDataService.ts` handling all market-related data fetching and caching.
- `PortfolioService.ts` managing user-specific data like balances and positions through `PredictSessionService`.
- Refactored `PredictController.ts` where read-only methods delegate to the new services.

## Step-by-Step Tasks

### 1. Build MarketDataService

Create `app/components/UI/PredictNext/services/market-data/MarketDataService.ts`. This service will be the primary source for market information.

- Implement `getCarouselEvents`, `getEvents` (feed), `getEvent`, `searchEvents`, `getPriceHistory`, `getCryptoPriceHistory`, `getCryptoReferencePrice`, `getPrices`, and `getEventSeries`.
- Use `PredictSessionService.getClient(ownerAddress)` to obtain the active `PredictClient` as the data source for market reads.
- Implement caching logic using the `BaseDataService` pattern to reduce redundant API calls.
- Ensure all methods return canonical types.

### 2. Build PortfolioService

Create `app/components/UI/PredictNext/services/portfolio/PortfolioService.ts`. This service manages the user's personal state within the Predict feature.

- Implement `getBalance`, `getVenueInfo`, `getPositions` (open, resolved, and claimable), `getActivity`, and `getUnrealizedPnL`.
- Do **not** implement `getAccountReadiness`. Account Readiness is owned by `PredictSessionService` (which stores `readinessByOwner` in its `BaseController` state slice); hooks read it via Redux selectors.
- Do not add `getRewards` unless the old code exposes a concrete rewards read path by the time this phase starts.
- Use `PredictSessionService.getClient(ownerAddress)` for account-scoped venue reads, then call client methods. Do not pass session objects through service APIs.
- Handle the logic for calculating aggregate values like total portfolio value or total unrealized PnL.

### 3. Update PredictController Read Methods

Modify `app/components/UI/Predict/controllers/PredictController.ts` to delegate to the new services.

- Identify current read methods on the old controller:
  - `getMarkets`
  - `searchMarkets`
  - `getCarouselMarkets`
  - `getMarket`
  - `getMarketSeries`
  - `getCryptoTargetPrice` (legacy name; maps to PredictNext `getCryptoReferencePrice`)
  - `getPriceHistory`
  - `getCryptoPriceHistory`
  - `getPrices`
  - `getPositions`
  - `getActivity`
  - `getUnrealizedPnL`
  - `getAccountReadiness` (delegates to `PredictSessionService:fetchAccountReadiness` action, not to a portfolio read)
  - `getBalance`
  - `getVenueInfo`
- Replace their internal logic with calls to `MarketDataService`, `PortfolioService`, or `PredictSessionService` as appropriate. Note that `getAccountReadiness` specifically delegates to `PredictSessionService`, not `PortfolioService`.
- Use compat mappers from `app/components/UI/PredictNext/compat/mappers.ts` to translate canonical service responses back to the legacy state shapes used by the controller.
- Keep `ownerAddress` terminology at new service boundaries. Do not expose venue account addresses, session objects, API keys, wallet types, or deployment flags from services; map those only in temporary legacy seams where old code still requires them.
- Update the controller's internal state and trigger updates to old hooks.

### 4. Messenger and Cache Invalidation

Ensure the new services are properly integrated with the app's messaging system.

- Register `MarketDataService` and `PortfolioService` as first-class Engine messenger clients with scoped messengers.
- Add service names to `DATA_SERVICES` so `@metamask/react-data-query` can route UI query keys to service actions.
- Register read actions such as `PredictMarketData:getEvents` and `PredictPortfolio:getPositions` on the service messengers.
- Define the Service Events each read service subscribes to for cache invalidation or patching, even if Phase 3 initially handles only broad invalidation.
- Implement cache invalidation logic. For example, when a network change occurs, the services should clear their caches and trigger a refresh.

## Files Created

| File Path                                                                      | Description                                        | Estimated Lines |
| ------------------------------------------------------------------------------ | -------------------------------------------------- | --------------- |
| `app/components/UI/PredictNext/services/market-data/MarketDataService.ts`      | Service for market data, events, and search        | 350-500         |
| `app/components/UI/PredictNext/services/market-data/MarketDataService.test.ts` | Unit tests for MarketDataService                   | 200-300         |
| `app/components/UI/PredictNext/services/portfolio/PortfolioService.ts`         | Service for user balances, positions, and activity | 400-600         |
| `app/components/UI/PredictNext/services/portfolio/PortfolioService.test.ts`    | Unit tests for PortfolioService                    | 250-350         |

## Files Affected in Old Code

| File Path                                                    | Expected Change                                      |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| `app/components/UI/Predict/controllers/PredictController.ts` | Read methods refactored to delegate to new services. |

## Acceptance Criteria

- `MarketDataService` passes service integration tests with a mocked `PredictSessionService` returning a mock `PredictClient`.
- `PortfolioService` passes service integration tests with mocked `PredictSessionService` and `PredictClient` seams.
- `PredictController` state remains consistent with previous versions.
- Old hooks like `usePredictMarket` and `usePredictPositions` continue to receive data in the expected legacy format.
- Data fetching performance is maintained or improved through service-level caching.

## Estimated PRs

- **PR 1**: MarketDataService implementation and controller wiring.
- **PR 2**: PortfolioService implementation and controller wiring.
- **PR 3**: Messenger integration and cache invalidation logic.
