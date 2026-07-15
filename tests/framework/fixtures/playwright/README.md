# Playwright performance fixtures

Custom Playwright `test.extend` fixtures for performance tests (Appium / BrowserStack / local emulator). App state fixtures (`FixtureBuilder`, `FixtureHelper`) live in the parent `fixtures/` folder.

## File structure

```
tests/framework/fixtures/playwright/
├── index.ts                         # Composes fixtures; export `test` from here
├── types.ts                         # CurrentDeviceDetails, TestLevelFixtures
├── currentDeviceDetails.fixture.ts
├── deviceProvider.fixture.ts
├── driver.fixture.ts
└── performanceTracker.fixture.ts
```

## Usage

```typescript
import { test } from '../../framework/fixtures/playwright';
import type { CurrentDeviceDetails } from '../../framework/fixtures/playwright';
```

## Adding a fixture

1. Add the key to `TestLevelFixtures` in `types.ts`.
2. Create `<name>.fixture.ts` exporting `{ [name]: async (...) => {} }`.
3. Spread it into `base.extend` in `index.ts`.

Provider implementations belong in `tests/framework/services/providers/`.

## Debugging logs

Playwright framework code uses `createPlaywrightLogger()` from `tests/framework/playwrightLogger.ts`. Log level defaults to **INFO**; set `E2E_LOG_LEVEL=debug` for verbose traces (element finds, taps, context switches).

| Module                     | INFO (default)                 | DEBUG (`E2E_LOG_LEVEL=debug`)    |
| -------------------------- | ------------------------------ | -------------------------------- |
| `currentDeviceDetails`     | Resolved device summary        | ADB serial resolution            |
| `deviceProvider`           | Provider create/teardown       | —                                |
| `driver`                   | Session start/teardown         | —                                |
| `performanceTracker`       | Metrics, quality gates, Sentry | Timer counts, session ID lookup  |
| `PlaywrightMatchers`       | —                              | Element lookup strategy + target |
| `PlaywrightGestures`       | —                              | Tap, type, swipe, app lifecycle  |
| `PlaywrightContextHelpers` | —                              | Native/webview context switches  |

For WebDriver HTTP command detail, set `WDIO_LOG_LEVEL=debug` when running tests.
