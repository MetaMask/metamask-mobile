# Running Tests, Self-Review, and Diagnosing Failures

Use this reference when you need to **run** integration tests, **self-review** after tests pass, or **diagnose and fix** failures. Also covers assertion patterns and What NOT to Do.

Reference: [SKILL.md](../SKILL.md) · [Writing Tests](writing-tests.md) · [Harness Extension](harness-extension.md)

---

## Table of contents

- [Run the Tests](#run-the-tests)
- [Self-Review Checklist](#self-review-checklist)
- [Diagnosing Failures](#diagnosing-failures)
- [Assertion Patterns](#assertion-patterns)
- [Module-Level Singleton State](#module-level-singleton-state)
- [What NOT to Do](#what-not-to-do)
- [Quick Reference](#quick-reference)

---

## Run the Tests

**Always use `jest.config.integration.js`** — the default Jest config picks up integration tests but doesn't apply integration-suite settings (single worker, longer timeout, force exit).

```bash
# Run a single file
yarn jest -c jest.config.integration.js \
  app/components/UI/Perps/hooks/usePerpsFlipPosition.integration.test.ts \
  --runInBand --silent --coverage=false

# Run a specific test by name
yarn jest -c jest.config.integration.js <file> -t "rejects a market order" --runInBand --silent --coverage=false

# Watch mode
yarn jest -c jest.config.integration.js <file> --watch

# Coverage on the controller / provider you're exercising (NOT on the test file)
yarn jest -c jest.config.integration.js <test-path> \
  --coverage \
  --collectCoverageFrom="app/controllers/perps/providers/HyperLiquidProvider.ts"

# All integration tests
yarn jest -c jest.config.integration.js
```

**Why `--collectCoverageFrom` is needed for coverage:** Integration tests don't import the file they test in the way unit tests do — they instantiate it via the harness. Coverage on the test file itself is always near 0%; point coverage at the controller / provider / service whose lines you want to measure.

---

## Self-Review Checklist

Before declaring the task done, go through this checklist for every test written or modified. If any item fails, fix it and re-run.

| #   | Check                                                                                                                                                      | What to do if it fails                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | **No `jest.mock` in the test file** — only the harness owns mocks                                                                                          | Move the mock into the harness; use `mockReturnValueOnce` for per-test override |
| 2   | **Every test calls a real method on the harness's instance** — no harness-only tests                                                                       | Add a real action call; if there's nothing meaningful to call, delete the test  |
| 3   | **Assertions on observable outcomes** — return value, post-call state, selector output. Mock-call assertions only when verifying a side effect             | Replace internal-state assertions with public-API assertions                    |
| 4   | **No fake timers** — no `jest.useFakeTimers()`, `jest.advanceTimersByTime()`, or `jest.useRealTimers()`                                                    | Use `await` and `waitFor` for async settlement                                  |
| 5   | **No snapshots** — no `toMatchSnapshot()` or `toMatchInlineSnapshot()`                                                                                     | Replace with explicit value assertions                                          |
| 6   | **Each test maps to a use case** — every `it` traces back to a row in the per-domain use-case file (or to a clear public-method + scenario)                | Either add the missing use case to the matrix, or delete / rescope the test     |
| 7   | **AAA formatting** — blank lines between Arrange, Act, Assert in every test                                                                                | Add the blank line separators                                                   |
| 8   | **Module-level singletons reset by the harness, not by the test** — no per-test `mockedSingleton.method.mockReset()` for known singletons                  | Add the reset to the harness's factory; the harness owns lifecycle              |
| 9   | **Customisation uses `mockReturnValueOnce`, not `mockReturnValue`** — for per-test mock variations                                                         | Switch to `Once` so the next test sees the harness defaults                     |
| 10  | **Test file imports are minimal** — harness import + types + assertion helpers only. No imports of real production services that the harness already wires | Remove the redundant imports                                                    |

---

## Diagnosing Failures

### Identify the error type first

| Error pattern                                              | Likely cause                                               | Fix                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Cannot find module '<service>'` or `is not a constructor` | The harness's `jest.mock` declarations missed a dependency | Add the missing `jest.mock` to the harness file, or check the relative path       |
| `<Method> is not a function`                               | Mocked service is missing a method the controller calls    | Add the missing method (with a sane default return) to the harness's mock builder |
| `priceForValidation is undefined` (or similar)             | Real validation logic running against incomplete params    | Pass the missing param to the action under test, or fix the production code       |
| `Cannot read properties of undefined`                      | Controller reading state set up by a different test (leak) | Add the missing reset to the harness's factory; check module-level singletons     |
| Test passes alone, fails in the suite                      | Module-level singleton state leaking between tests         | See [Module-Level Singleton State](#module-level-singleton-state)                 |
| Test passes in isolation, fails with `--coverage`          | Coverage instrumentation interacting with native modules   | Run without coverage; coverage already isn't useful on the test file              |
| `forceExit` warning or hanging tests                       | An async subscription / timer wasn't torn down             | Ensure the harness exposes a teardown helper, or wrap state in `try / finally`    |
| `expect(jest.fn()).toHaveBeenCalledWith(...)` mismatch     | Production code call signature changed                     | Update the assertion; if production-only change, fix the production code          |
| Many tests fail after a controller change                  | Controller refactor affected the seam many tests assert on | This is integration tests doing their job. Update the harness, then update tests  |

### Inspect the harness state

```ts
// Add temporarily inside a failing test
const { provider, mocks } = buildPerpsIntegrationHarness();
console.log('initial state:', JSON.stringify(provider.state, null, 2));
console.log(
  'cached prices via mock:',
  mocks.subscription.getCachedPrice('BTC'),
);
```

### Inspect what the controller called on the mocks

```ts
const { provider, mocks } = buildPerpsIntegrationHarness();
await provider.placeOrder({
  /* ... */
});
console.log('client.someMethod calls:', mocks.client.someMethod.mock.calls);
```

### Check that the real production code path actually ran

If a test passes too easily, you may have stubbed something the harness shouldn't have. Add a temporary `console.log` inside the controller method you expect to run; if it doesn't print, the harness is short-circuiting too aggressively. Check the harness's factory and the `jest.mock` factories.

---

## Assertion Patterns

```ts
// Return-value happy path
const result = await provider.placeOrder({
  /* ... */
});
expect(result.success).toBe(true);

// Return-value rejection
const result = await provider.validateOrder({
  /* ... */
});
expect(result.isValid).toBe(false);
expect(result.error).toBe(PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED);

// Throwing rejection
await expect(
  provider.flipPosition({ symbol: 'BTC', size: 2, orderType: 'market' }),
).rejects.toThrow(/ORDER_PRICE_REQUIRED/);

// Post-call state
await provider.placeOrder({
  /* ... */
});
expect(provider.state.positions.BTC).toMatchObject({
  side: 'long',
  size: 1,
});

// Selector over state
import { selectPosition } from 'app/controllers/perps/selectors';
expect(selectPosition(provider.state, 'BTC')?.size).toBe(1);

// Side-effect on mocked SDK (only when verifying the call IS the point)
await provider.placeOrder({
  /* ... */
});
expect(mocks.client.someExchangeCall).toHaveBeenCalledWith(
  expect.objectContaining({ asset: 0, isBuy: true }),
);

// Multi-step flow assertion
await provider.placeOrder({
  /* open */
});
await provider.closePosition({
  /* close */
});
expect(provider.state.positions.BTC).toBeUndefined();
```

---

## Module-Level Singleton State

Many controllers depend on module-level singletons that survive between tests within a file (jest doesn't reset module state per test by default). Common examples in perps: `TradingReadinessCache`, stream managers, in-flight markers.

The harness handles this for known singletons — its factory resets their state on every call. **Always call the harness in `beforeEach` or at the top of each `it`**, never construct it once at the `describe` level.

```ts
// ✅ Build the harness inside each it (or in beforeEach)
describe('flow', () => {
  it('does A', async () => {
    const { provider } = buildPerpsIntegrationHarness();
    await provider.actionA();
  });

  it('does B', async () => {
    const { provider } = buildPerpsIntegrationHarness();
    await provider.actionB();
  });
});

// ❌ Build once and reuse — singleton state from test 1 leaks into test 2
describe('flow', () => {
  const { provider } = buildPerpsIntegrationHarness();

  it('does A', async () => {
    await provider.actionA();
  });
  it('does B', async () => {
    await provider.actionB();
  }); // may see leftover state from A
});
```

If you discover a new singleton not handled by the harness — symptom: tests pass alone but fail in the suite — add the reset to the harness's factory. See [`harness-extension.md`](harness-extension.md).

---

## What NOT to Do

```ts
// ❌ jest.mock in the test file — blocked, owns belong to the harness
jest.mock('../../../../controllers/perps/services/HyperLiquidClientService');

// ❌ Instantiate the controller directly
const provider = new HyperLiquidProvider({
  /* ... */
});

// ❌ Harness-only test — no real method called
it('builds the harness', () => {
  const { provider } = buildPerpsIntegrationHarness();
  expect(provider).toBeDefined();
});

// ❌ Snapshot assertion
const result = await provider.someAction();
expect(result).toMatchSnapshot();

// ❌ Fake timers
jest.useFakeTimers();
await provider.someAsyncAction();
jest.advanceTimersByTime(5000);

// ❌ mockReturnValue (without `Once`) for per-test customisation — leaks to other tests
mocks.subscription.getCachedPrice.mockReturnValue('60000');

// ✅ Per-test customisation
mocks.subscription.getCachedPrice.mockReturnValueOnce('60000');

// ❌ Mocking selectors or pure helpers
jest.mock('../../../../controllers/perps/selectors', () => ({
  selectPosition: jest.fn(),
}));

// ✅ Real selectors over real state
import { selectPosition } from '../../../../controllers/perps/selectors';
expect(selectPosition(provider.state, 'BTC')?.size).toBe(1);

// ❌ Reaching into controller internals
(provider as any).#privateField = 'test value';

// ✅ Drive state through real actions
await provider.someAction(/* params that produce the desired state */);

// ❌ Asserting on internal state shape (private fields)
expect((provider as any).#cachedThing).toBe('value');

// ✅ Assert on public API
expect(provider.state.publicField).toBe('value');
```

---

## Quick Reference

```bash
# Run a single integration test
yarn jest -c jest.config.integration.js <path> --runInBand --silent --coverage=false

# Run all integration tests
yarn jest -c jest.config.integration.js

# Coverage on the controller / provider exercised
yarn jest -c jest.config.integration.js <test-path> \
  --coverage --collectCoverageFrom="<production-path>"

# Lint check
yarn eslint <path/to/test.ts>
```

**Key locations:**

| What                                           | Where                                                       |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Framework rules + per-domain harness inventory | `tests/integration/AGENTS.md`                               |
| Strategy + comparison tables + rollout plan    | `tests/integration/STRATEGY.md`                             |
| Coverage targets + bug-tracking mechanisms     | `tests/integration/coverage-and-tracking.md`                |
| Per-domain use case → layer matrix             | `tests/integration/perps-use-cases.md` (others as added)    |
| Per-domain harnesses                           | `tests/integration/harnesses/<domain>.ts`                   |
| Jest config                                    | `jest.config.integration.js`                                |
| Skill + rules                                  | `.agents/skills/integration-test/` (SKILL.md + references/) |
