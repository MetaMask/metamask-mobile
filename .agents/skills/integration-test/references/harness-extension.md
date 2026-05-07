# Harness Extension

Reference: [SKILL.md](../SKILL.md) · [Writing Tests](writing-tests.md) · [Reference](reference.md)

How to add a new domain harness, or extend an existing one. **Most integration test work doesn't need this** — open the existing harness and write a test. Open this reference only when the harness pattern itself doesn't fit what you need to test.

---

## When to extend a harness vs add a one-off mock

**Extend the harness when:**

- Multiple tests will need the same setup
- A controller dependency was added, removed, or renamed
- An existing mock's default return needs to change for a class of tests
- A new helper would simplify many tests (e.g. `setupOpenPosition()`)

**Don't add a one-off mock to the test file.** If a test seems to need its own `jest.mock(...)` call, extend the harness. Tests in `*.integration.test.ts` files do not contain `jest.mock` declarations.

**Use `mockReturnValueOnce` for per-test customisation:**

```ts
const { mocks } = buildPerpsIntegrationHarness();
mocks.subscription.getCachedPrice.mockReturnValueOnce('60000');
```

This is the right tool when one test needs a different mock behaviour from the others. It doesn't pollute the harness for other tests.

---

## Harness anatomy

Every domain harness file (`tests/integration/harnesses/<domain>.ts`) has the same structure, in this order:

1. **Header comment** — the REAL/MOCKED split + USAGE example
2. **`jest.mock(...)` declarations** — for the I/O boundary services
3. **Imports** — the real production code (controller, services, types)
4. **Default option constants** — sane defaults for cached prices, asset mappings, etc.
5. **Type definitions** — the harness's return type and options type
6. **Factory function** — `build<Domain>IntegrationHarness(options) → harness`

```ts
/**
 * <Domain> integration-test harness.
 *
 * Owns the standard jest.mock(...) declarations for the <domain> I/O boundary
 * AND a build<Domain>IntegrationHarness() factory.
 *
 * REAL (runs production code paths):
 *   - <Controller / Provider class>
 *
 * MOCKED (the I/O boundary):
 *   - <ServiceA>
 *   - <ServiceB>
 *   - <ModuleSingleton>
 *   - <UtilityModule>
 *
 * USAGE:
 *
 *     import { build<Domain>IntegrationHarness }
 *       from '<relative path>/tests/integration/harnesses/<domain>';
 *
 *     const { instance } = build<Domain>IntegrationHarness();
 *     await instance.someAction(...);
 */

jest.mock('<relative path>/app/controllers/<domain>/services/ServiceA');
jest.mock('<relative path>/app/controllers/<domain>/services/ServiceB');
// ... full set of jest.mock declarations for the I/O boundary

import { ControllerClass } from '<relative path>/app/controllers/<domain>/...';
import { ServiceA } from '<relative path>/app/controllers/<domain>/services/ServiceA';
// ... real production code imports

const DEFAULT_OPTIONS = { /* sane defaults */ };

export interface <Domain>IntegrationHarness {
  instance: ControllerClass;
  mocks: { /* mocked services */ };
  // helpers like setX, withY, etc.
}

export interface <Domain>HarnessOptions {
  // overrides for the defaults
}

export function build<Domain>IntegrationHarness(
  options: <Domain>HarnessOptions = {},
): <Domain>IntegrationHarness {
  // 1. reset module-level singletons
  // 2. build the mocked services with defaults + overrides
  // 3. wire mocks to MockedClass via .mockImplementation()
  // 4. instantiate the real controller, passing mocked deps
  // 5. return { instance, mocks, helpers }
}
```

The perps harness at `tests/integration/harnesses/perps.ts` is the canonical reference. Copy its shape when adding a new domain.

---

## The REAL/MOCKED split — drawing the line

The line between REAL and MOCKED is the **I/O boundary**. Real: anything that's pure logic, state, validation, or transitions. Mocked: anything that talks to the network, the disk, the keyring, native modules, or websockets.

| Component                                        | REAL or MOCKED? | Why                                                       |
| ------------------------------------------------ | --------------- | --------------------------------------------------------- |
| Controller class                                 | REAL            | Production code; integration tests' job is to exercise it |
| Provider class (`HyperLiquidProvider`, etc.)     | REAL            | Same                                                      |
| Validation methods on the class                  | REAL            | Where seam bugs live                                      |
| State reducers / `update()` calls                | REAL            | Same                                                      |
| Selectors                                        | REAL            | Read state, derive UI props — pure                        |
| SDK client wrappers (`HyperLiquidClientService`) | MOCKED          | Network I/O                                               |
| Wallet / keyring service                         | MOCKED          | Native module I/O                                         |
| WebSocket subscription service                   | MOCKED          | Network + timing I/O                                      |
| Module-level caches that hit storage             | MOCKED          | Disk I/O                                                  |
| Stream managers / orchestrators                  | MOCKED          | UI subscription — different concern                       |
| Validation utility functions in separate files   | MOCKED          | Existing pattern in codebase; class methods stay real     |

When in doubt, ask: **does this code talk to the outside world (network, disk, keyring, native module, websocket)?** If yes, mock it. If no, leave it real.

---

## Adding a new domain harness

1. **Create** `tests/integration/harnesses/<domain>.ts`. Copy the perps harness as the template.

2. **Identify the I/O boundary** for the domain. Read the controller's constructor and method bodies. List every dependency that does I/O.

3. **Write the `jest.mock(...)` block** at the top — one entry per I/O dependency. For services that have a complex API, use the pattern from perps where the mock is replaced with `.mockImplementation(() => mockedService)` at runtime in the factory. For utility modules, use a factory `() => ({ ... })` to provide the mock shape inline.

4. **Define the harness's return type** — what the test will use:
   - `instance` — the real controller / provider
   - `mocks` — a record of the mocked services for per-test customisation
   - Helpers like `setCachedPrice`, `setupOpenPosition`, `setupTradingReady` — anything that simplifies common test setup

5. **Implement the factory.** Inside:
   - Reset any module-level singleton state (caches, in-flight markers, etc.)
   - Build the mocked services with sane defaults + caller overrides
   - Wire `MockedClass.mockImplementation(() => instance)` so `new ServiceClass()` calls inside the controller return your mock
   - Construct the real controller / provider with the mocked services injected (or via the messenger pattern if that's what the controller uses)
   - Return `{ instance, mocks, ...helpers }`

6. **Write the header comment.** REAL/MOCKED split + a USAGE block showing one example. Future readers (including your future self) need to understand the seam at a glance.

7. **Update `tests/integration/AGENTS.md`.** Add a section under "Per-domain harnesses" listing the domain, what's real, what's mocked, the factory signature, and (optionally) a link to a per-domain use-case file if one exists.

8. **Smoke test.** Write one happy-path integration test for the simplest action on the controller. Verify it runs and the assertion passes. If setup is painful at this stage, the harness needs more helpers — add them now, before writing more tests.

---

## Extending an existing harness

Smaller surface; same discipline. Cases:

### A new mock service has been added to the controller

The controller now depends on `NewService`. To extend the harness:

1. Add `jest.mock('<path>/NewService');` to the top of the harness file.
2. Import `NewService` near the other real-code imports.
3. Add a typed mocked instance to the factory: `const newService = { ... } as unknown as jest.Mocked<NewService>;` with sane defaults for every method the controller calls.
4. Wire it: `(NewService as jest.MockedClass<typeof NewService>).mockImplementation(() => newService);`
5. Add it to the `mocks` field of the return value.
6. Update the REAL/MOCKED header comment.

### A new helper would simplify many tests

E.g. `setupOpenPosition({ symbol, side, size })` to put the harness into a state where a position is already open. To add it:

1. Build the helper as a function inside the factory's closure, so it has access to `instance` and `mocks`.
2. Document it on the harness's return type interface.
3. Reference it in `tests/integration/AGENTS.md` under the domain's section.

```ts
const setupOpenPosition = async (params: {
  symbol: string;
  side: 'long' | 'short';
  size: number;
}) => {
  await instance.placeOrder({
    symbol: params.symbol,
    isBuy: params.side === 'long',
    size: params.size.toString(),
    orderType: 'market',
    currentPrice: 50_000,
  });
};

return { instance, mocks, setCachedPrice, setupOpenPosition };
```

### An existing default needs to change

E.g. the cached price for BTC was `'50000'`; we want it to vary per test.

1. **Don't** change the default itself — that breaks every existing test.
2. **Do** add an option: `cachedPrices?: Record<string, string>` (if not already present), with the existing value as the default.
3. Update the helper / factory to merge caller-provided prices with defaults.
4. Tests that need the new behaviour pass the option; existing tests are unchanged.

---

## What NOT to put in a harness

- **Test-specific scenarios.** A helper called `setupReversePositionThatFailsValidation` is too specific. Build small composable helpers (`setupOpenPosition`, `setCachedPrice`) and let tests compose them.
- **Assertions.** The harness builds the world; the test asserts. If the harness is asserting, the test boundary is wrong.
- **Hardcoded test data that's only used by one test.** Inline that data in the test.
- **Non-mocked services that aren't part of the I/O boundary.** Pure-logic services should run real. If a "service" is being mocked, ask whether it actually does I/O.

---

## When to split a harness

Split a single-domain harness into multiple files when:

- One file exceeds ~250 lines AND it covers genuinely separate concerns (e.g. trading vs subscriptions vs deposits)
- Multiple test areas need very different default configurations
- Two parts of the controller have non-overlapping mocked dependencies

Otherwise, keep the harness in one file. Splitting prematurely makes the test author hunt for the right harness.
