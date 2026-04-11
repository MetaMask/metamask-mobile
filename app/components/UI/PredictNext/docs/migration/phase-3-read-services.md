# Phase 3: Read Services

## Goal

Build MarketDataService and PortfolioService using BaseDataService patterns. Hook old PredictController read methods to delegate to these new services. The old controller translates new service responses back to old state shapes via compat mappers before publishing to old hooks.

## Prerequisites

- Phase 2 complete (PolymarketAdapter is functional and wired to the old provider).

## Deliverables

- `MarketDataService.ts` handling all market-related data fetching and caching.
- `PortfolioService.ts` managing user-specific data like balances and positions.
- Refactored `PredictController.ts` where read-only methods delegate to the new services.

## Step-by-Step Tasks

### 1. Build MarketDataService

Create `app/components/UI/PredictNext/services/market-data/MarketDataService.ts`. This service will be the primary source for market information.

- Implement `getFeaturedEvents`, `getEvents` (feed), `getEventDetails`, `searchEvents`, `getPriceHistory`, and `getSeries`.
- Use `PolymarketAdapter` as the data source.
- Implement caching logic using the `BaseDataService` pattern to reduce redundant API calls.
- Ensure all methods return canonical types.

### 2. Build PortfolioService

Create `app/components/UI/PredictNext/services/portfolio/PortfolioService.ts`. This service manages the user's personal state within the Predict feature.

- Implement `getBalances`, `getPositions` (open, resolved, and claimable), `getActivityFeed`, `getUnrealizedPnL`, `getRewards`, and `getAccountState`.
- Consume the adapter for raw data.
- Handle the logic for calculating aggregate values like total portfolio value or total unrealized PnL.

### 3. Update PredictController Read Methods

Modify `app/components/UI/Predict/controllers/PredictController.ts` to delegate to the new services.

- Identify methods like `fetchMarketData`, `fetchEventDetails`, `fetchPortfolio`, and `refreshBalances`.
- Replace their internal logic with calls to `MarketDataService` or `PortfolioService`.
- Use compat mappers from `app/components/UI/PredictNext/compat/mappers.ts` to translate canonical service responses back to the legacy state shapes used by the controller.
- Update the controller's internal state and trigger updates to old hooks.

### 4. Messenger and Cache Invalidation

Ensure the new services are properly integrated with the app's messaging system.

- Register the services with the controller messenger.
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

- `MarketDataService` and `PortfolioService` pass all unit tests.
- `PredictController` state remains consistent with previous versions.
- Old hooks like `usePredictMarket` and `usePredictPositions` continue to receive data in the expected legacy format.
- Data fetching performance is maintained or improved through service-level caching.

## Estimated PRs

- **PR 1**: MarketDataService implementation and controller wiring.
- **PR 2**: PortfolioService implementation and controller wiring.
- **PR 3**: Messenger integration and cache invalidation logic.
