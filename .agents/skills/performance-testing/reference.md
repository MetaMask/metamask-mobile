# E2E Performance Test — Full Reference Guide

**Goal**: Create Playwright-based E2E performance tests that measure real user flows on real devices with `TimerHelper` and `PerformanceTracker` — no mocking, no shortcuts.

## Core Principles

1. **Real Device, Real App, Real Network**: Tests run on BrowserStack devices (or local emulators) against actual app builds — zero mocking
2. **User-Centric Timers**: Every `TimerHelper` description reads from the user's perspective: _"Time since the user clicks X until Y is visible"_
3. **Platform-Specific Thresholds**: Every timer defines `{ ios: <ms>, android: <ms> }` thresholds that trigger quality gate validation
4. **One Timer Per Measurable Step**: Break flows into discrete, meaningful timing segments — never lump multiple transitions into one timer
5. **Page Object Pattern**: All UI interactions go through page objects from `tests/page-objects/`, never raw selectors
6. **Performance Tags + Team Ownership**: Every test uses area tags from `tags.performance.js` and a team tag for Sentry routing

## Step 0: Determine Test Location (MANDATORY)

Before writing anything, determine where the test file goes:

| Starting condition                                          | Folder                                       | Project                                     | App build       |
| ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------- | --------------- |
| User already has a wallet (login screen)                    | `tests/performance/login/`                   | `browserstack-android` / `browserstack-ios` | Standard build  |
| Fresh install (onboarding flow)                             | `tests/performance/onboarding/`              | `android-onboarding` / `ios-onboarding`     | **Clean** build |
| Dapp connection / external server needed                    | `tests/performance/mm-connect/`              | `mm-connect-*` projects                     | Standard build  |
| Sub-flows within login (e.g., launch times)                 | `tests/performance/login/launch-times/`      | Same as login                               | Standard build  |
| Sub-flows within onboarding (e.g., cold start after import) | `tests/performance/onboarding/launch-times/` | Same as onboarding                          | Clean build     |
| Predict market flows                                        | `tests/performance/login/predict/`           | Same as login                               | Standard build  |

**Key difference**: Onboarding projects use `BROWSERSTACK_*_CLEAN_APP_URL` (no pre-seeded wallet), while login projects use `BROWSERSTACK_*_APP_URL` (wallet already imported).

## Workflow

### Step 1: Understand the User Flow

Before writing code:

1. Identify the exact user journey to measure (e.g., "open swap screen and get a quote")
2. Break it into discrete steps, each becoming a `TimerHelper`
3. Identify which page objects are needed for each step
4. Determine if the flow starts from login or onboarding
5. Choose the appropriate performance tag(s) from `tests/tags.performance.js`
6. Identify the owning team for the `{ tag: '@team-name' }` annotation

### Step 2: Create the Test File

**File naming**: `<descriptive-name>.spec.ts` inside the appropriate folder.

**Login-based test template** (`tests/performance/login/<name>.spec.ts`):

```typescript
import { test as perfTest } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import WalletView from '../../page-objects/wallet/WalletView';
import SomeOtherView from '../../page-objects/wallet/SomeOtherView';
import {
  PerformanceLogin,
  // Add relevant area tags
} from '../../tags.performance.js';

perfTest.describe(`${PerformanceLogin}`, () => {
  perfTest(
    'Descriptive test name matching the scenario',
    { tag: '@owning-team-name' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // 1. Login
      await loginToAppPlaywright();

      // 2. Define timers with user-centric descriptions and platform thresholds
      //    Third arg is currentDeviceDetails.platform — NOT device
      const timer1 = new TimerHelper(
        'Time since the user clicks on X until Y is visible',
        { ios: 2000, android: 3000 },
        currentDeviceDetails.platform,
      );

      // 3. Perform action OUTSIDE measure, assertion INSIDE measure
      await WalletView.tapSomeButton(); // action (not timed)
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(SomeOtherView.container),
        );
      });

      // 4. Add all timers to the tracker
      //    DO NOT call performanceTracker.attachToTest() — the fixture handles it automatically
      performanceTracker.addTimers(timer1);
    },
  );
});
```

**Onboarding-based test template** (`tests/performance/onboarding/<name>.spec.ts`):

```typescript
import { test } from '../../framework/fixture';
import TimerHelper from '../../framework/TimerHelper';
import { asPlaywrightElement, PlaywrightAssertions } from '../../framework';
import { dismisspredictionsModalPlaywright } from '../../flows/wallet.flow';
import { fetchProductionFeatureFlags } from '../feature-flag-helper';
import OnboardingView from '../../page-objects/Onboarding/OnboardingView';
import OnboardingSheet from '../../page-objects/Onboarding/OnboardingSheet';
import ImportWalletView from '../../page-objects/Onboarding/ImportWalletView';
import CreatePasswordView from '../../page-objects/Onboarding/CreatePasswordView';
import MetaMetricsOptInView from '../../page-objects/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../page-objects/Onboarding/OnboardingSuccessView';
import WalletView from '../../page-objects/wallet/WalletView';
import { PerformanceOnboarding } from '../../tags.performance.js';

test.describe(PerformanceOnboarding, () => {
  test.setTimeout(240000); // Onboarding flows are longer — extend timeout

  test(
    'Descriptive test name matching the scenario',
    { tag: '@owning-team-name' },
    async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => {
      // 1. Define all timers upfront
      const timer1 = new TimerHelper(
        'Time since the user clicks on "Have existing wallet" until sheet is visible',
        { ios: 1000, android: 1800 },
        currentDeviceDetails.platform,
      );
      // ... more timers for each step

      // 2. Execute onboarding flow with measurements
      await OnboardingView.tapHaveAnExistingWallet();
      await timer1.measure(async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(OnboardingSheet.importSeedButton),
        );
      });

      // ... continue flow

      // 3. Add all timers and attach
      performanceTracker.addTimers(timer1 /* , timer2, timer3, ... */);
    },
  );
});
```

### Step 3: Write Timers

#### CRITICAL RULE: Actions OUTSIDE measure, Assertions INSIDE measure

The `measure()` callback must contain **only assertions/wait conditions** — never user actions like taps, types, or swipes. The user action that triggers the transition goes **before** the `measure()` call. This ensures we measure purely the app's response time, not the interaction itself.

```typescript
// ✅ CORRECT — tap OUTSIDE measure, assertion INSIDE measure
await WalletView.tapSwapButton();
await timer.measure(() =>
  PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(BridgeView.container),
  ),
);

// ✅ CORRECT — multiple assertions inside measure are fine
await WalletView.tapOnToken('USDC');
await timer.measure(async () => {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(TokenOverview.container),
  );
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(TokenOverview.sendButton),
  );
  await PlaywrightAssertions.expectElementToBeVisibleWithSettle(
    asPlaywrightElement(TokenOverview.todaysChange),
    { timeout: 10000, settleMs: 500 },
  );
});

// ❌ WRONG — action inside measure pollutes the timing
await timer.measure(async () => {
  await WalletView.tapSwapButton(); // ❌ action inside measure
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(BridgeView.container),
  );
});
```

#### 3a: Using `timer.measure()` (preferred — simple flows)

When the action that starts the timer and the wait condition are in sequence:

```typescript
const timer = new TimerHelper(
  'Time since the user clicks on the "Swap" button until the swap page is loaded',
  { ios: 2000, android: 2500 },
  currentDeviceDetails.platform,
);

// Action BEFORE measure
await WalletView.tapSwapButton();
// Only assertions INSIDE measure
await timer.measure(() =>
  PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(BridgeView.container),
  ),
);
```

#### 3b: Using manual `start()` / `stop()` (cross-context flows — dapp tests)

When timing spans native ↔ web context switches, use `start()`/`stop()` with `PlaywrightContextHelpers`. The same rule applies: `start()` goes right after the triggering action, and `stop()` goes after the assertion that confirms the result.

```typescript
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';

const connectTimer = new TimerHelper(
  'Time from tapping Connect to dapp confirming connected state',
  { ios: 20000, android: 30000 },
  currentDeviceDetails.platform,
);

// Switch to web context, action then start — tap triggers the flow, then start timing
await PlaywrightContextHelpers.switchToWebViewContext(DAPP_URL);
await BrowserPlaygroundDapp.tapConnectLegacy(); // action
connectTimer.start(); // start AFTER the action

// Switch to native context — these are intermediate steps, not measured
await PlaywrightContextHelpers.switchToNativeContext();
await DappConnectionModal.tapConnectButton();

// Switch back to web, stop after assertion
await PlaywrightContextHelpers.switchToWebViewContext(DAPP_URL);
await BrowserPlaygroundDapp.assertConnected(true); // assertion
connectTimer.stop(); // stop AFTER assertion
```

#### 3c: Multi-timer flows

For complex scenarios, define all timers upfront. Each step follows the same pattern: action first, then `measure()` with only assertions.

```typescript
const timer1 = new TimerHelper(
  'Time since the user clicks on "Create wallet" until sign-up screen is visible',
  { ios: 1000, android: 1800 },
  currentDeviceDetails.platform,
);
const timer2 = new TimerHelper(
  'Time since the user clicks "Import SRP" until SRP field is displayed',
  { ios: 1000, android: 1500 },
  currentDeviceDetails.platform,
);
const timer3 = new TimerHelper(
  'Time since the user clicks "Continue" until password fields are visible',
  { ios: 2500, android: 1800 },
  currentDeviceDetails.platform,
);

// Step 1: action OUTSIDE, assertion INSIDE
await OnboardingView.tapCreateWallet();
await timer1.measure(async () => {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(OnboardingSheet.importSeedButton),
  );
});

// Step 2: action OUTSIDE, assertion INSIDE
await OnboardingSheet.tapImportSeedButton();
await timer2.measure(async () => {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(ImportWalletView.title),
  );
});

// Step 3: action OUTSIDE, assertion INSIDE
await ImportWalletView.tapContinueButton();
await timer3.measure(async () => {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(CreatePasswordView.container),
  );
});

performanceTracker.addTimers(timer1, timer2, timer3);
```

### Step 4: Page Objects

Page objects in `tests/page-objects/` are static classes — no device assignment needed. Just import and use:

```typescript
import WalletView from '../../page-objects/wallet/WalletView';
import TokenOverview from '../../page-objects/wallet/TokenOverview';
import LoginView from '../../page-objects/wallet/LoginView';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';

// ✅ CORRECT — just use the static methods directly
await WalletView.tapOnToken('USDC');
await PlaywrightAssertions.expectElementToBeVisible(
  asPlaywrightElement(TokenOverview.container),
);
```

Dapp tests have their own page objects under `tests/page-objects/MMConnect/`:

```typescript
import BrowserPlaygroundDapp from '../../page-objects/MMConnect/BrowserPlaygroundDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import SwitchChainModal from '../../page-objects/MMConnect/SwitchChainModal';
```

### Step 5: Register Timers and Attach Results

At the end of every test, add timers to the tracker. **Do NOT call `attachToTest` manually** — the fixture teardown calls it automatically.

```typescript
// Add all timers to the tracker
performanceTracker.addTimers(timer1, timer2, timer3);
// OR for a single timer:
performanceTracker.addTimer(timer1);

// ❌ DO NOT CALL — the fixture handles this automatically
// await performanceTracker.attachToTest(testInfo);
```

The performance fixture automatically:

- Validates quality gates if any timer has thresholds
- Publishes metrics to Sentry
- Stores session data for video URL retrieval
- Skips retries on quality gate failures (threshold exceeded ≠ flaky test)

## Performance Tags

Import from `tests/tags.performance.js`:

```javascript
import {
  PerformanceLogin, // Login/unlock flows
  PerformanceOnboarding, // Fresh wallet setup
  PerformanceSwaps, // Swap/bridge flows
  PerformanceLaunch, // Cold/warm start times
  PerformanceAssetLoading, // Token/NFT loading
  PerformanceAccountList, // Account list rendering
  PerformancePredict, // Prediction markets
  PerformancePreps, // Perpetuals trading
} from '../../tags.performance.js';
```

Combine multiple tags in `test.describe()`:

```typescript
perfTest.describe(`${PerformanceLogin} ${PerformanceLaunch}`, () => { ... });
perfTest.describe(`${PerformanceLogin} ${PerformanceAssetLoading}`, () => { ... });
```

## Team Tags

Every test MUST include a team tag for ownership and Sentry routing:

```typescript
perfTest('Test name', { tag: '@team-name' }, async ({ currentDeviceDetails, driver, performanceTracker }, testInfo) => { ... });
```

Known team tags:

- `@assets-dev-team` — Token lists, balances, NFTs
- `@swap-bridge-dev-team` — Swap and bridge flows
- `@metamask-mobile-platform` — Platform, launch times
- `@metamask-onboarding-team` — Onboarding, wallet creation
- `@accounts-team` — Account management
- `@team-predict` — Prediction markets
- `@mm-perps-engineering-team` — Perpetuals trading

## Threshold Guidelines

Thresholds are in milliseconds. The `TimerHelper` adds a 10% margin automatically.

| Action type                      | iOS range     | Android range  |
| -------------------------------- | ------------- | -------------- |
| Simple screen transition         | 500–1500 ms   | 600–1800 ms    |
| Data loading (API + render)      | 1500–5000 ms  | 2000–7000 ms   |
| Heavy computation (50+ accounts) | 5000–90000 ms | 5000–90000 ms  |
| Dapp connection (cross-context)  | 8000–20000 ms | 12000–30000 ms |
| Quote/swap execution             | 7000–9000 ms  | 7000–9000 ms   |
| Cold start to screen             | 2000–3500 ms  | 2000–3500 ms   |

When unsure, start generous and tighten after collecting baseline data.

## Common Helpers

### Login flow

```typescript
import { loginToAppPlaywright } from '../../flows/wallet.flow';
await loginToAppPlaywright(); // Types password, taps unlock, waits — no args needed
// Optional: specify scenario type for different wallets
await loginToAppPlaywright({ scenarioType: 'login' });
```

### Account selection by device

```typescript
import { selectAccountByDevice } from '../../flows/wallet.flow';
await selectAccountByDevice(currentDeviceDetails.deviceName);
// Selects the account mapped in tests/performance/device-matrix.json
```

### Onboarding flow

```typescript
import { onboardingFlowImportSRPPlaywright } from '../../flows/wallet.flow';
await onboardingFlowImportSRPPlaywright(process.env.TEST_SRP_1);
```

### Dismiss modals

```typescript
import { dismisspredictionsModalPlaywright } from '../../flows/wallet.flow';
await dismisspredictionsModalPlaywright();
```

### App lifecycle (cold start tests)

```typescript
import { PlaywrightGestures } from '../../framework';
await PlaywrightGestures.terminateApp(currentDeviceDetails);
await PlaywrightGestures.activateApp(currentDeviceDetails);
```

### Dapp tests (native ↔ web context switching)

```typescript
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import { DappServer, DappVariants, TestDapps } from '../../framework';

// Switch between contexts
await PlaywrightContextHelpers.switchToNativeContext();
await PlaywrightContextHelpers.switchToWebViewContext(DAPP_URL);

// Start a local dapp server
const playgroundServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
  dappVariant: DappVariants.BROWSER_PLAYGROUND,
});

perfTest.beforeAll(async () => {
  playgroundServer.setServerPort(DAPP_PORT);
  await playgroundServer.start();
});

perfTest.afterAll(async () => {
  await playgroundServer.stop();
});
```

### Production feature flags

```typescript
import { fetchProductionFeatureFlags } from '../feature-flag-helper';
const flags = await fetchProductionFeatureFlags();
// Use flags to conditionally skip tests based on feature availability
```

## ❌ FORBIDDEN Patterns

```typescript
// NEVER in E2E performance tests:
jest.mock(...)                          // No mocking — real device, real app
require(...)                            // Use ES6 imports only
import { test } from '@playwright/test' // ALWAYS import from framework/fixture (not directly)
as any                                  // Use proper types
// Hardcoded passwords                  // Use getPasswordForScenario()
// Raw selectors                        // Use page objects from tests/page-objects/
// PageObj.device = device              // Page objects are static — no device assignment needed
// Timer without threshold              // Always provide { ios: X, android: Y }
// Timer without team tag               // Always include { tag: '@team-name' }
new TimerHelper('...', {...}, device)   // Third arg is currentDeviceDetails.platform, not device
await performanceTracker.attachToTest() // DO NOT call manually — fixture auto-handles teardown
// Actions inside measure()             // ONLY assertions/waits go inside measure
```

## Checklist Before Submitting

- [ ] Test file is `.spec.ts` (TypeScript) and in the correct folder (`login/`, `onboarding/`, `mm-connect/`, etc.)
- [ ] Imports `test` from `../../framework/fixture` (NOT from `@playwright/test` directly)
- [ ] Fixture destructures `{ currentDeviceDetails, driver, performanceTracker }` (not `device`)
- [ ] `TimerHelper` third argument is `currentDeviceDetails.platform` (not `device`)
- [ ] Each measurable step has its own `TimerHelper` with platform-specific thresholds
- [ ] Timer descriptions are user-centric: _"Time since the user clicks X until Y is visible"_
- [ ] `test.describe()` uses performance area tag(s) from `tags.performance.js`
- [ ] Test has `{ tag: '@team-name' }` for ownership
- [ ] All timers are added via `performanceTracker.addTimers()` or `performanceTracker.addTimer()`
- [ ] **`performanceTracker.attachToTest()` is NOT called** — the fixture handles it automatically
- [ ] `test.setTimeout()` is set for long flows (onboarding: 240000ms+)
- [ ] Actions (taps, types, swipes) are OUTSIDE `measure()` — only assertions/waits inside
- [ ] No mocking of any kind
- [ ] No hardcoded passwords (use `getPasswordForScenario()`)
- [ ] Test name is descriptive and matches the scenario being measured
- [ ] Page objects from `tests/page-objects/` used — no `.device = device` assignment

## Quick Commands

```bash
# Run a single performance test locally (Android emulator)
yarn playwright test --project android --grep "Test name pattern"

# Run all login performance tests on BrowserStack
yarn playwright test --project browserstack-android

# Run all onboarding tests on BrowserStack
yarn playwright test --project android-onboarding

# Run with specific tag filter
yarn playwright test --grep "@PerformanceLogin"
yarn playwright test --grep "@PerformanceSwaps|@PerformanceOnboarding"

# View test reports
open tests/reporters/reports
```

## References

- Performance fixture: `tests/framework/fixture/index.ts`
- TimerHelper: `tests/framework/TimerHelper.ts`
- Performance tags: `tests/tags.performance.js`
- Flow utilities: `tests/flows/wallet.flow.ts`
- Feature flag helper: `tests/performance/feature-flag-helper.ts`
- Device matrix: `tests/performance/device-matrix.json`
- Context switching (dapp tests): `tests/framework/PlaywrightContextHelpers.ts`
- Quality gates: `tests/framework/quality-gates/`
- Page objects: `tests/page-objects/`
- Dapp page objects: `tests/page-objects/MMConnect/`
- Config: `tests/playwright.config.ts`
- Example login test: `tests/performance/login/asset-view.spec.ts`
- Example onboarding test: `tests/performance/onboarding/import-wallet.spec.ts`
- Example cold start test: `tests/performance/login/launch-times/cold-start-to-login.spec.ts`
- Example predict test: `tests/performance/login/predict/predict-available-balance.spec.ts`
- Example dapp test: `tests/performance/mm-connect/connection-evm.spec.ts`
