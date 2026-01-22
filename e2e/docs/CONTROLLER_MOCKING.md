# E2E Controller Mocking

This document explains when and how to mock controller logic during E2E tests. This is not about Sentry; it focuses on replacing provider SDK interactions when needed, with the HyperLiquid provider as the concrete example.

## Context and Rationale

- Some features depend on external provider SDKs and live data streams (e.g., HyperLiquid market data via WebSocket). In E2E we need deterministic, reliable tests that are not affected by third-party uptime, timing, or data variability.
- In these cases, we may replace controller interactions with the provider SDK so flows can proceed with stable, test-controlled data.
- If your calls are plain HTTP/HTTPS and can be intercepted by our E2E mock server, prefer HTTP-level mocking instead (it’s simpler, more generic, and easier to maintain).

## Perps + HyperLiquid Controller Mixin (Specific Case)

- File: `tests/controller-mocking/mock-config/perps-controller-mixin.ts`
- Purpose: Replace HyperLiquid provider SDK touchpoints for E2E with safe, deterministic alternatives so the Perps connection lifecycle (initialization, subscriptions, reconnection) can be exercised without relying on the live SDK backend.

Key behaviors:

- Intercepts Perps controller methods that would call into the HyperLiquid SDK and redirects them to E2E-provided mocks.
- Keeps the rest of the business logic intact while ensuring stable inputs/outputs for tests.

Scope note:

- This mixin is a solution for this particular provider and feature. Do not treat it as a general pattern for all network or SDK interactions.

## Prefer HTTP Mocking When Possible

- If your feature communicates over HTTP, use the E2E mock server (fixtures + proxy) to stub responses:
  - Faster to implement and review
  - Centralized and reusable across tests
  - Avoids coupling tests to controller internals

Only consider controller-level mocking when:

- The dependency is an SDK with complex transport (e.g., WebSockets) that isn’t easily intercepted by our mock server, or
- You need to drive very specific edge cases not feasible at the network layer.

## How to Apply Controller Mocks

1. Implement a feature-scoped mixin/override under `tests/controller-mocking/mock-config/`.
2. Use your E2E bridge/initializer to inject the mixin into the running app for tests that require it.
3. Keep overrides minimal and focused on stabilizing provider interactions. Avoid changing unrelated business logic.

## Best Practices

- Keep mocks deterministic and fast. Avoid timers and external dependencies.
- Document each override and its purpose.
- Align with the Page Object Model in specs; controller mocking should be configured via fixtures/bridge, not from the test body.
- Prefer HTTP/network mocking where feasible; use controller mocking only when necessary.

## Notes

- This document is specifically about provider SDK replacement (e.g., HyperLiquid) for E2E stability. For third‑party library swaps at the module level, see `MODULE_MOCKING.md`.
