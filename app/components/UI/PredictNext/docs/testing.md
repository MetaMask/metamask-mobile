# PredictNext Testing Strategy

## Testing Philosophy

PredictNext should test behavior at the level where users experience it. The redesign favors fewer, deeper tests over large numbers of shallow unit tests.

Principles:

- test real behavior, not implementation details
- test deep modules at their real seam boundaries
- rely on component view tests as the main UI confidence layer
- keep pure unit tests only where logic is truly isolated and stable

Related docs:

- [components](./components.md)
- [hooks](./hooks.md)
- [state management](./state-management.md)
- [error handling](./error-handling.md)

## Testing Pyramid for Predict

| Level                     | What                        | Count (est.) | Framework                       |
| ------------------------- | --------------------------- | ------------ | ------------------------------- |
| Component View Tests      | Views with real Redux state | ~8-10 files  | tests/component-view/ framework |
| Service Integration Tests | Services with mock adapter  | ~6 files     | Jest + mock adapter             |
| Adapter Integration Tests | Adapter with mock HTTP      | ~1-2 files   | Jest + nock                     |
| Unit Tests                | Pure utility functions      | ~3-5 files   | Jest                            |
| E2E Tests                 | Full user flows             | ~10 files    | Detox                           |

This pyramid concentrates coverage where behavior is most meaningful while preserving fast feedback.

## Component View Tests: Primary Surface

Component view tests are the primary UI safety net.

Why they are the right default:

- they use the existing `tests/component-view/` framework
- they exercise screens with realistic state
- they avoid brittle mocking of hook internals
- they validate composition between views, hooks, Redux, and the engine boundary

Rules:

- mock only Engine edges and allowed native modules
- drive scenarios with presets and fixture overrides
- assert visible behavior and interaction outcomes
- avoid testing individual primitives in isolation

Existing infrastructure to build on:

- `initialStatePredict` preset
- `renderPredictFeedView` renderer
- `MOCK_PREDICT_MARKET` fixture

Infrastructure to expand:

- presets for positions, active orders, balance states, sports games, resolved events, and geo-blocked users
- renderers for `PredictHome`, `EventDetails`, `OrderScreen`, and `TransactionsView`
- fixtures for canonical event, market, outcome, and position models
- `nock` API mocks in `tests/component-view/api-mocking/predict.ts`

Example view test:

```typescript
import '../../../tests/component-view/mocks';
import Engine from '../../../app/core/Engine';
import { renderPredictHomeView } from '../../../tests/component-view/renderers/predictHome';
import { MOCK_PREDICT_EVENT } from '../../../tests/component-view/fixtures/predict';

describe('PredictHome', () => {
  it('shows featured carousel when events are available', async () => {
    jest
      .spyOn(Engine.context.PredictMarketDataService, 'getCarouselEvents')
      .mockResolvedValue([MOCK_PREDICT_EVENT]);

    const { findByTestId } = renderPredictHomeView();

    expect(await findByTestId('featured-carousel')).toBeOnTheScreen();
  });
});
```

Example renderer shape:

```typescript
import React from 'react';
import { renderScreen } from '../helpers/renderScreen';
import { PredictHome } from '../../../app/components/UI/PredictNext/components/views/PredictHome';
import { initialStatePredict } from '../presets/predict';

export function renderPredictHomeView(overrides = {}) {
  return renderScreen(<PredictHome />, {
    state: {
      ...initialStatePredict(),
      ...overrides,
    },
  });
}
```

Recommended view test scenarios:

- featured carousel visible when curated events exist
- event feed empty state when search returns zero matches
- order form disables primary action for insufficient balance
- geo-blocked user sees unavailable flow instead of trading UI
- resolved event shows claimable positions and hidden buy actions
- transactions screen groups pending and completed activity correctly

## Service Integration Tests

Service integration tests exercise service logic with a mocked adapter boundary. The service should be treated as a deep module with one public interface and internal workflow that deserves direct verification.

What to test here:

- state-machine transitions
- retries and fallback behavior
- cache invalidation requests
- mapping of raw adapter failures to `PredictError`

Example: `TradingService` integration test

```typescript
import { TradingService } from '../TradingService';
import { PredictErrorCode } from '../../errors/PredictError';

describe('TradingService', () => {
  it('completes preview to place flow with deposit when balance is insufficient', async () => {
    const adapter = {
      previewOrder: jest
        .fn()
        .mockResolvedValue({ total: '25.00', fee: '0.50' }),
      ensureFunding: jest.fn().mockResolvedValue({ deposited: true }),
      placeOrder: jest.fn().mockResolvedValue({ orderId: 'order-1' }),
    };

    const service = new TradingService({
      adapter,
      logger: console as never,
      analytics: { trackEvent: jest.fn() } as never,
    });

    const preview = await service.previewOrder({
      marketId: 'market-1',
      outcomeId: 'yes',
      amount: '25',
    });

    expect(preview.total).toBe('25.00');

    await service.placeOrder({
      marketId: 'market-1',
      outcomeId: 'yes',
      amount: '25',
      paymentToken: 'USDC',
    });

    expect(adapter.ensureFunding).toHaveBeenCalledTimes(1);
    expect(adapter.placeOrder).toHaveBeenCalledTimes(1);
  });

  it('maps adapter rejection to PredictError for user-facing handling', async () => {
    const adapter = {
      previewOrder: jest.fn(),
      ensureFunding: jest.fn(),
      placeOrder: jest
        .fn()
        .mockRejectedValue(new Error('exchange rejected order')),
    };

    const service = new TradingService({
      adapter,
      logger: console as never,
      analytics: { trackEvent: jest.fn() } as never,
    });

    await expect(
      service.placeOrder({
        marketId: 'market-1',
        outcomeId: 'yes',
        amount: '25',
        paymentToken: 'USDC',
      }),
    ).rejects.toMatchObject({ code: PredictErrorCode.ORDER_REJECTED });
  });
});
```

One test file per service is a good default:

- `MarketDataService.test.ts`
- `PortfolioService.test.ts`
- `TradingService.test.ts`
- `TransactionService.test.ts`
- `LiveDataService.test.ts`
- `GuardService.test.ts`

## Adapter Integration Tests

Adapter integration tests verify the boundary between third-party APIs and Predict canonical types. They use `nock` to mock HTTP responses and confirm data transformation.

What to test:

- response parsing
- field normalization
- missing-field tolerance
- transformation into canonical `PredictEvent`, `PredictMarket`, and `PredictOutcome`

Example:

```typescript
import nock from 'nock';
import { PolymarketAdapter } from '../PolymarketAdapter';

describe('PolymarketAdapter', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('maps Gamma API events into PredictEvent', async () => {
    nock('https://gamma-api.polymarket.com')
      .get('/events')
      .query(true)
      .reply(200, [
        {
          id: 'event-1',
          title: 'Will ETH close above $4,000 on Friday?',
          markets: [
            {
              id: 'market-1',
              outcomes: [
                { id: 'yes', name: 'Yes', price: 0.63 },
                { id: 'no', name: 'No', price: 0.37 },
              ],
            },
          ],
        },
      ]);

    const adapter = new PolymarketAdapter({
      baseUrl: 'https://gamma-api.polymarket.com',
    });
    const [event] = await adapter.fetchEvents({ category: 'crypto' });

    expect(event.id).toBe('event-1');
    expect(event.markets).toHaveLength(1);
    expect(event.markets[0].outcomes[0]).toMatchObject({
      id: 'yes',
      label: 'Yes',
      price: 0.63,
    });
  });
});
```

## Unit Tests: Minimal and Focused

Unit tests remain valuable for pure functions with no environmental dependencies.

Good candidates:

- price formatting
- date label formatting
- validation helpers
- market parsing utilities

Example:

```typescript
import { formatPrice } from '../formatPrice';

describe('formatPrice', () => {
  it('formats cents without losing intent', () => {
    expect(formatPrice(63, 'cents')).toBe('63¢');
  });

  it('formats dollars with two decimals', () => {
    expect(formatPrice(12.5, 'dollars')).toBe('$12.50');
  });
});
```

Avoid unit tests for hooks and presentational components when the same behavior is already covered more effectively through view tests.

## What Not to Test

Do not spend test budget on these surfaces:

- individual hooks in isolation
- individual components in isolation
- controller delegation that only forwards a call
- private service methods
- styles or internal prop plumbing

These tests usually duplicate stronger coverage from view tests and service integration tests.

## Migration Impact

Current state:

- 169 unit tests
- 87K lines of test code
- 2.38:1 test-to-source ratio

Target state:

- ~25-30 test files
- ~8-12K lines of test code
- ~0.3-0.5:1 test-to-source ratio

Expected reduction:

- roughly 85-90% less test code

The goal is not less confidence. The goal is fewer, higher-value tests.

## Test Infrastructure Checklist

| Item                                          | Type     | Status   | Notes                                           |
| --------------------------------------------- | -------- | -------- | ----------------------------------------------- |
| `initialStatePredict`                         | Preset   | Existing | Base state for Predict flows                    |
| `predictPositionsOpen`                        | Preset   | New      | Open positions for portfolio and detail screens |
| `predictPositionsResolved`                    | Preset   | New      | Won, lost, and claimable states                 |
| `predictActiveOrder`                          | Preset   | New      | Pending order session in Redux                  |
| `predictLowBalance`                           | Preset   | New      | Order disabled and deposit path scenarios       |
| `predictSportsGame`                           | Preset   | New      | Scoreboard and live sports cards                |
| `predictGeoBlocked`                           | Preset   | New      | Guard and unavailable routing                   |
| `renderPredictFeedView`                       | Renderer | Existing | Existing feed surface                           |
| `renderPredictHomeView`                       | Renderer | New      | Home route integration                          |
| `renderEventDetailsView`                      | Renderer | New      | Details route integration                       |
| `renderOrderScreenView`                       | Renderer | New      | Order workflow integration                      |
| `renderTransactionsView`                      | Renderer | New      | Activity route integration                      |
| `MOCK_PREDICT_EVENT`                          | Fixture  | New      | Canonical event fixture                         |
| `MOCK_PREDICT_MARKET`                         | Fixture  | Existing | Binary market fixture                           |
| `MOCK_PREDICT_OUTCOME`                        | Fixture  | New      | Outcome fixture                                 |
| `MOCK_PREDICT_POSITION`                       | Fixture  | New      | Position fixture                                |
| `tests/component-view/api-mocking/predict.ts` | API mock | New      | Shared mock HTTP responses                      |

## Recommended File Layout

```text
tests/
  component-view/
    fixtures/
      predict.ts
    presets/
      predict.ts
    renderers/
      predictHome.tsx
      eventDetails.tsx
      orderScreen.tsx
      transactionsView.tsx
    api-mocking/
      predict.ts
app/
  components/
    UI/
      PredictNext/
        services/
          MarketDataService.test.ts
          PortfolioService.test.ts
          TradingService.test.ts
          TransactionService.test.ts
          LiveDataService.test.ts
          GuardService.test.ts
        adapters/
          PolymarketAdapter.test.ts
          KalshiAdapter.test.ts
        utils/
          formatPrice.test.ts
          parseOutcome.test.ts
```

This strategy keeps testing aligned with the architecture: deep modules, realistic seams, and a small number of high-signal tests.
