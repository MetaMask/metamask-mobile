# MM Connect E2E Flakiness Debug — Uncommitted Changes

## Files Modified

### 1. `tests/appwright.config.ts`

- Added a new test project (`tanto-faz`) targeting `connection-evm.spec.js` on **Android** via **BrowserStack** (Samsung Galaxy S23 Ultra, OS 13.0).
- Uses a hardcoded BrowserStack build path (`bs://...`) pointing to a specific uploaded app binary.
- Allows overriding device/OS via `BROWSERSTACK_DEVICE` and `BROWSERSTACK_OS_VERSION` env vars.

### 2. `tests/framework/utils/MobileBrowser.js`

- Commented out the entire Chrome first-run dismissal flow inside `launchMobileBrowser()`:
  - Disabled `setupChromeDisableFre()` (the flag that suppresses Chrome's first-run experience).
  - Disabled all `try/catch` blocks that dismiss onboarding, "No thanks", ad privacy, and notification dialogs.
  - Disabled the `CHROME_UI_SETTLE_MS` wait after dismissals.
- **Purpose**: Isolate whether Chrome's onboarding/dialog dismissal logic is contributing to test flakiness on BrowserStack devices (where Chrome state may differ from local emulators).

### 3. `tests/performance/mm-connect/connection-evm.spec.js`

- Commented out `setupAdbReverse()` and `cleanupAdbReverse()` in `beforeAll` / `afterAll`.
- **Purpose**: `adb reverse` is only relevant for local emulators. On BrowserStack, port forwarding works differently, so these calls are unnecessary and could cause failures.

## Summary

All changes strip away local-emulator-specific logic (adb reverse, Chrome FRE suppression) to run the MM Connect EVM connection test cleanly on BrowserStack, helping identify whether flakiness stems from Chrome setup handling or the test flow itself.
