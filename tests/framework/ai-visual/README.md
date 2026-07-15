# AI Visual Regression Testing

Uses Claude's vision capabilities to compare UI screenshots against baselines and detect regressions in MetaMask Mobile.

## How It Works

1. Test navigates to a screen (e.g. swap confirmation)
2. `aiVisualTest()` captures a screenshot via Appium
3. Loads the baseline image from `tests/visual-regression/baselines/{platform}/`
4. Sends both images to Claude with a structured prompt
5. Claude analyzes layout, elements, text, and styling differences
6. Returns pass/fail with a list of regressions (ignoring dynamic values like gas fees)
7. Results attach to the Playwright HTML report + append to `visual-regression-summary.json`

## Setup

### Environment Variables

Add to `.e2e.env`:

```bash
# Required — Claude API key
ANTHROPIC_API_KEY=sk-ant-...

# Required — must be explicitly enabled
AI_VISUAL_TESTING_ENABLED=true
```

### Capturing Baselines

Before running visual regression checks, you need baseline screenshots to compare against.

```bash
# Capture baselines on a local Android emulator
yarn capture-visual-baselines:android

# Capture baselines on a local iOS simulator
yarn capture-visual-baselines:ios
```

Baselines are saved to `tests/visual-regression/baselines/{ios|android}/` and should be committed to git.

To re-capture baselines after intentional UI changes, run the same commands again — existing baselines are overwritten.

## Usage in Tests

```typescript
import { aiVisualTest, createTestConfig } from '../../framework/ai-visual';

test('Swap flow', async ({ currentDeviceDetails, driver }, testInfo) => {
  // ... navigate to the screen you want to check ...

  await aiVisualTest(
    driver,
    'Swap-Confirmation-ETH-USDC.png',
    currentDeviceDetails.platform,
    createTestConfig.swapReview({ stabilityWait: 3000 }),
    testInfo,
  );
});
```

### Parameters

| Parameter        | Type               | Description                                                               |
| ---------------- | ------------------ | ------------------------------------------------------------------------- |
| `driver`         | `Browser`          | WebdriverIO driver instance from the test fixture                         |
| `screenshotName` | `string`           | Filename for the screenshot (e.g. `Send-Confirmation.png`)                |
| `platform`       | `string`           | `'ios'` or `'android'` — from `currentDeviceDetails.platform`             |
| `config`         | `VisualTestConfig` | Screen-specific config (elements to verify, prompt rules, stability wait) |
| `testInfo`       | `TestInfo`         | Playwright test info — enables attaching artifacts to the HTML report     |

### Predefined Configs

```typescript
createTestConfig.walletHome();
createTestConfig.sendConfirmation();
createTestConfig.tokenOverview();
createTestConfig.swapReview();
createTestConfig.onboardingWelcome();
createTestConfig.login();
createTestConfig.signatureRequest();
createTestConfig.networkSelector();
```

Each config can be customized with overrides:

```typescript
createTestConfig.sendConfirmation({
  stabilityWait: 5000,
  mode: 'single', // 'baseline' (default) or 'single' (no baseline comparison)
});
```

## Directory Structure

```
tests/
├── visual-regression/
│   └── baselines/          # Committed to git — reference screenshots
│       ├── ios/
│       └── android/
│
test-results/
└── visual-regression/      # Gitignored (test-results/ is in .gitignore)
    ├── current/            # Screenshots from the current test run
    ├── diffs/              # Side-by-side comparison images
    └── results/            # visual-regression-summary.json
│
tests/
└── framework/ai-visual/
    ├── index.ts            # aiVisualTest() — main entry point
    ├── prompt.ts           # Three-layer prompt system (System → Domain → Test)
    ├── configs.ts          # Predefined screen configs
    ├── image-utils.ts      # Screenshot saving and side-by-side diff generation
    └── providers/
        ├── types.ts        # AIProvider interface and result types
        ├── claude.ts       # Claude (Anthropic) provider
        └── index.ts        # Provider factory
```

## Reporting

Results surface in two places:

**Playwright HTML Report** — each visual check attaches four artifacts to the test:

- `visual-current` — the screenshot from this test run
- `visual-baseline` — the expected baseline
- `visual-diff` — side-by-side comparison (requires `sharp`)
- `visual-ai-analysis` — Claude's full analysis text

**Summary JSON** — `tests/visual-regression/results/visual-regression-summary.json` accumulates results across all tests in a run. Useful for CI notifications and aggregate reporting.

## Prompt Architecture

The AI prompt is built from three layers:

| Layer      | Scope                                        | Example                                                                       |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| **System** | Generic regression rules and response format | "Classify each difference as REGRESSION or ACCEPTABLE VARIATION"              |
| **Domain** | MetaMask Mobile product context              | "Gas fees are dynamic, status bar differences are acceptable"                 |
| **Test**   | Per-screen elements and rules                | "Verify: token icon, amount, confirm button. Token name must match baseline." |

This layered design lets you customize prompts at the right level without duplicating rules across tests.

## Adding a New Screen Config

1. Add a new entry to `PREDEFINED` in `configs.ts`
2. Add a factory function to `createTestConfig`
3. Use it in your test via `createTestConfig.yourNewScreen()`

## Dependencies

- `@anthropic-ai/sdk` — Claude API client
- `sharp` (optional) — side-by-side diff image generation. If not installed, diffs are skipped gracefully.
