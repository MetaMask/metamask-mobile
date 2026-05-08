# Writing Tests

Reference: [SKILL.md](../SKILL.md) · [Harness Extension](harness-extension.md) · [Reference](reference.md)

---

## Read Before Writing

Before writing any test, read:

- The controller / provider / service file under test
- Any existing `*.integration.test.ts` for the same area (look beside the file and across the feature folder)
- The matching harness in `tests/integration/harnesses/<domain>.ts` — what it returns, what it mocks, what helpers it exposes
- The per-domain use-case file if one exists (e.g. `tests/integration/perps-use-cases.md`) — the authoritative list of what should be tested at this layer

If the harness for the domain doesn't exist yet, stop and read [`harness-extension.md`](harness-extension.md) first.

---

## Enumerate Use Cases

**Do this before writing a single test line.** Build a candidate list scoped and deduplicated against existing tests.

### 1. Pull from the use-case matrix (preferred)

If a per-domain use-case file exists (e.g. `tests/integration/perps-use-cases.md`), the rows assigned to **Integration** as the primary layer are the canonical list. Each row is a use case you may need to cover; pick the ones not yet implemented.

### 2. Or list user-facing actions for the area

If no use-case file exists, derive the list from the controller's public surface:

- Every public method on the controller / provider that has user-visible state effects → at least one happy-path test
- Every error code or rejection branch reachable from user input → at least one rejection test
- Every multi-step user flow that crosses methods → one end-to-end test

Ask: "What can a user **do** that touches this controller?" — open / close / edit / cancel an order, deposit / withdraw funds, change leverage, set TP/SL, switch testnet, etc.

### 3. Map each use case to a test pattern

| User action / system event                               | Valid pattern                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Public action on happy path → state changes correctly    | `await provider.X(...)` → assert on `provider.state` or selector             |
| Public action on rejection path → returns error code     | `await provider.X(...)` → assert on `result.error === ERROR_CODE`            |
| Public action that throws → throws correct error         | `await expect(provider.X(...)).rejects.toThrow(...)`                         |
| Multi-step user flow → final state correct               | sequential `await provider.X(); await provider.Y();` → assert on final state |
| Subscription event → state updates                       | invoke harness's subscription helper → assert state                          |
| State transition (loading flag, etc.) → correct ordering | call action, assert intermediate state via fake task scheduling              |
| Side-effecting call to mocked SDK → SDK called correctly | call action → `expect(mocks.client.method).toHaveBeenCalledWith(...)`        |

Drop anything that only exercises the harness defaults — every test must call at least one real method on the real instance.

### 4. Deduplicate against existing tests

Read the existing `*.integration.test.ts` for the area (if any) and remove candidates already covered. Look at the test bodies, not just titles, since one `it` might cover several rows of the matrix.

### 5. Run coverage on the file you're exercising and prioritise

```bash
yarn jest -c jest.config.integration.js <test-path> \
  --coverage \
  --collectCoverageFrom="app/controllers/perps/providers/HyperLiquidProvider.ts"
```

Coverage on the test file is always near 0% (the test exercises a different file); always point `--collectCoverageFrom` at the controller / provider you're testing.

Focus on uncovered branches in the controller. Prioritise candidates that cover the most uncovered paths. Proceed directly to writing.

---

## Write a New Test File

### File naming

```
<feature>.integration.test.ts   ← always *.integration.test.ts(x)
```

Live next to the code under test. Same folder as the unit / CV test file if one exists. Examples:

```
app/components/UI/Perps/hooks/usePerpsFlipPosition.integration.test.ts
app/controllers/perps/services/TradingService.integration.test.ts
```

### File structure

```ts
/**
 * Integration test — <one-line description of the user flow>.
 *
 * Brief description of the seam being exercised, with file:line refs into
 * the controller / provider if you're testing a specific code site.
 */

import { build<Domain>IntegrationHarness } from '<relative path>/tests/integration/harnesses/<domain>';
import { /* error codes, types */ } from '<relative path>/app/controllers/<domain>/...';

describe('<Feature> — <flow>', () => {
  describe('<happy or rejection scenario group>', () => {
    it('<does the thing or rejects on the bad input>', async () => {
      // Arrange
      const { provider, mocks } = build<Domain>IntegrationHarness();

      // Act
      const result = await provider.someAction({ /* real params */ });

      // Assert
      expect(result.success).toBe(true);
      expect(provider.state.someField).toBe(expected);
    });
  });
});
```

### Use the harness; don't bypass it

```ts
// ✅ Use the harness
const { provider, mocks, setCachedPrice } = buildPerpsIntegrationHarness();
setCachedPrice('BTC', '60000');
const result = await provider.placeOrder({ ... });

// ❌ Do not add jest.mock calls in the test file
jest.mock('../../../../controllers/perps/services/HyperLiquidClientService');

// ❌ Do not instantiate the controller directly
const provider = new HyperLiquidProvider({ /* ... */ });
```

If the harness doesn't expose what you need, **extend it** — see [`harness-extension.md`](harness-extension.md). Tests should not contain harness-shaped setup code.

### One test = one use case

Each `it` should map to exactly one row from the per-domain use-case matrix. If you find yourself writing a test that covers two rows, split it. If you find yourself writing a test that doesn't fit any row, ask whether the use case is missing from the matrix or the test belongs in a different layer (Unit / CV / E2E).

### AAA (Arrange / Act / Assert) — strict

```ts
it('rejects a market order with no currentPrice', async () => {
  // Arrange
  const { provider } = buildPerpsIntegrationHarness();

  // Act
  const result = await provider.validateOrder({
    symbol: 'BTC',
    isBuy: false,
    size: '0.2',
    orderType: 'market',
  });

  // Assert
  expect(result.isValid).toBe(false);
  expect(result.error).toBe(PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED);
});
```

Blank lines between Arrange / Act / Assert. The reader should be able to spot the three sections at a glance.

### Multi-step flows

A single `it` can cover a multi-step user journey if the journey is one logical use case:

```ts
it('opens a long, partial-closes it, then closes the rest', async () => {
  // Arrange
  const { provider } = buildPerpsIntegrationHarness();

  // Act + intermediate assertion
  await provider.placeOrder({
    symbol: 'BTC',
    isBuy: true,
    size: '1',
    orderType: 'market',
    currentPrice: 50_000,
  });
  expect(provider.state.positions.BTC?.size).toBe(1);

  await provider.closePosition({
    symbol: 'BTC',
    size: '0.4',
    orderType: 'market',
    currentPrice: 50_000,
  });
  expect(provider.state.positions.BTC?.size).toBeCloseTo(0.6);

  await provider.closePosition({
    symbol: 'BTC',
    orderType: 'market',
    currentPrice: 50_000,
  }); // full close

  // Assert (final)
  expect(provider.state.positions.BTC).toBeUndefined();
});
```

Multi-step is fine when the steps are one user journey. Multi-step is wrong when you're using it to dodge writing separate tests for separate use cases.

### Rendered component flows

Use the rendered-component harness only when the rendered interaction is part of the integration surface. The component should still reach a real method through the harness chain; do not use Shape C for pure UI variants that belong in component-view tests.

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { buildPerpsComponentHarness } from '../../../../../tests/integration/harnesses/perps-component';
import PerpsOrderView from '../Views/PerpsOrderView/PerpsOrderView';
import { PerpsOrderViewSelectorsIDs } from '../Perps.testIds';

it('places an order from the rendered order screen', async () => {
  // Arrange
  const perps = buildPerpsComponentHarness();
  try {
    perps.harness.setupTradingReady();
    perps.renderScreenWithFlow(PerpsOrderView, {
      routeName: 'PerpsOrder',
      initialParams: {
        asset: 'BTC',
        direction: 'long',
        amount: '100',
        leverage: 3,
        defaultSzDecimals: 3,
        defaultMaxLeverage: 50,
      },
    });

    const placeOrderButton = await screen.findByTestId(
      PerpsOrderViewSelectorsIDs.PLACE_ORDER_BUTTON,
    );

    // Act
    fireEvent.press(placeOrderButton);

    // Assert
    await waitFor(() => {
      expect(perps.mocks.exchangeClient.order).toHaveBeenCalledTimes(1);
    });
    expect(perps.mocks.showToast).toHaveBeenCalled();
  } finally {
    perps.teardown();
  }
});
```

Shape C tests still follow the normal rules: no `jest.mock(...)` in test files, assert on observable UI/side effects, and use `waitFor(...)` for async settlement.

### Customise mocks per test

```ts
it('handles the SDK returning a stale price', async () => {
  const { provider, mocks } = buildPerpsIntegrationHarness();
  mocks.subscription.getCachedPrice.mockReturnValueOnce('1');

  const result = await provider.validateOrder({
    symbol: 'BTC',
    isBuy: true,
    size: '0.2',
    orderType: 'market',
    currentPrice: 1, // matches the stale cached value
  });

  expect(result.isValid).toBe(true);
});
```

Use `mockReturnValueOnce` for per-test customisation so the harness defaults aren't permanently changed for the rest of the suite.

---

## Updating tests after a controller change

When the controller's public surface changes (new method, renamed method, new field on result, new error code):

1. **Run the existing tests.** Multiple tests will fail. That's the integration suite doing its job.
2. **Audit the failures.** Each failure tells you about a use case affected by the change.
3. **Update the harness if needed.** If the controller's constructor signature changed, or a new service dependency was added, update `tests/integration/harnesses/<domain>.ts` first. See [`harness-extension.md`](harness-extension.md).
4. **Update the tests.** Adjust assertions / parameters to match the new behaviour. Keep the test names and use-case mapping stable.
5. **Add tests for new use cases.** If the change introduces new public actions or new rejection paths, add tests for them.
6. **Run the self-review checklist.** See [`reference.md`](reference.md).
