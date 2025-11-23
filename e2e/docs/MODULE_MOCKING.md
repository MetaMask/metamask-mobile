# E2E Module Mocking

This document explains why and how we mock native/SDK modules during E2E runs, with Sentry as the primary example.

## Context and Rationale

- In E2E, we run the app in bridgeless/debug-like conditions where some SDK integrations (e.g., Sentry tracing) are disabled or partially available.
- Production code may assume fully functional tracing spans. When Sentry is disabled, closing or annotating spans can throw, breaking flows under test (e.g., Perps connection lifecycle).
- To keep test reliability high and avoid feature-specific mixins, we alias third-party modules to E2E-friendly mocks at bundling time.

## What’s Mocked

- `@sentry/react-native`
- `@sentry/core`

These are replaced with minimal, no-op implementations that preserve the public API shape used by our app code, including tracing functions.

## Where the Mocks Live

- `e2e/module-mocking/sentry/react-native.ts`
- `e2e/module-mocking/sentry/core.ts`

Both files include safe no-ops and lightweight console logs for debugging (prefixed with `[E2E Sentry Mock]`).

## How Aliasing Works

Metro resolver is configured to alias Sentry packages to the E2E mocks when the E2E flag is set. The condition is:

- `IS_TEST === 'true'` or `METAMASK_ENVIRONMENT === 'e2e'`

This logic resides in `metro.config.js` via a custom `resolveRequest` that redirects requests for `@sentry/react-native` and `@sentry/core` to the mock files under `e2e/module-mocking/sentry/`.

## When to Use (Scope)

Use module-level aliasing sparingly. It is intended only for cross‑cutting, framework‑wide issues that affect many features or the entire E2E environment (e.g., global tracing integrations, core polyfills). If your need is feature‑specific, prefer scoped approaches instead (e.g., HTTP mocking via the mock server or controller‑level overrides).

## Extending Module Mocks

- Add new mock files under `e2e/module-mocking/<lib>/`.
- Update `metro.config.js` `resolveRequest` to redirect the target module specifier to your mock file when E2E.
- Keep APIs minimal; only implement members referenced by the app code to reduce maintenance.

## Notes

- This approach avoids per-feature mixins and centralizes E2E-specific behavior at the bundler level.
- Production builds remain unaffected; aliasing only applies when E2E flags are set.
