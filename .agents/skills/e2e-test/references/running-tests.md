# Running & Debugging E2E Tests — Reference

## Step 1: Verify the Build Exists

**Always check before running.** The binary path comes from `.detoxrc.js`:

```bash
# Check default iOS debug build path
ls ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app 2>/dev/null \
  && echo "✅ Build found — ready to run" \
  || echo "❌ Build missing"

# If PREBUILT_IOS_APP_PATH is set (CI pre-built binary), check that instead
[ -n "$PREBUILT_IOS_APP_PATH" ] && \
  ls "$PREBUILT_IOS_APP_PATH" 2>/dev/null \
  && echo "✅ Pre-built binary found" \
  || echo "❌ PREBUILT_IOS_APP_PATH set but binary not found at: $PREBUILT_IOS_APP_PATH"
```

**If the build is missing**, do **not** run the build yourself. Warn the user that a debug build is required (~20-30 min for iOS) and show them the command so they can run it themselves:

```bash
# iOS debug build (simulator, no device needed)
yarn test:e2e:ios:debug:build

# Android debug build (requires emulator)
yarn test:e2e:android:debug:build
```

> Prefer **iOS** for local runs: simulator builds need no physical device and tests execute with zero manual interaction.

## Step 2: Run a Specific Spec

```bash
# iOS — run one spec file (preferred for local runs)
IS_TEST='true' NODE_OPTIONS='--experimental-vm-modules' \
  detox test -c ios.sim.main \
  --testPathPattern="tests/regression/predict/predict-buy-flow.spec.ts"

# iOS — run a specific test by name
IS_TEST='true' NODE_OPTIONS='--experimental-vm-modules' \
  detox test -c ios.sim.main \
  --testPathPattern="tests/regression/predict/predict-buy-flow.spec.ts" \
  --testNamePattern="opens market details from market list"

# Android — run one spec file (requires running emulator)
IS_TEST='true' NODE_OPTIONS='--experimental-vm-modules' \
  detox test -c android.emu.main \
  --testPathPattern="tests/regression/predict/predict-buy-flow.spec.ts"
```

## Run All Tests for a Feature

```bash
IS_TEST='true' NODE_OPTIONS='--experimental-vm-modules' \
  detox test -c ios.sim.main \
  --testPathPattern="tests/regression/predict/"
```

## Lint & Type Check (Run Before Every Test Execution)

```bash
# Lint a specific file
yarn lint tests/regression/predict/predict-buy-flow.spec.ts --fix
yarn lint tests/page-objects/Predict/PredictMarketList.ts --fix

# Lint all new files together
yarn lint tests/regression/predict/ tests/page-objects/Predict/ --fix

# TypeScript check (whole project)
yarn lint:tsc
```

## Common Failures & Fixes

| Failure                       | Cause                                     | Fix                                                                   |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `Error: element not found`    | Wrong testID string, element not rendered | Check selector constant, verify `testID` in component                 |
| `Error: element not enabled`  | Button disabled or loading state          | Add `checkEnabled: false` to the `Gestures.tap` call                  |
| `Timeout waiting for element` | Element renders but too slowly            | Add logger; check feature flag mock; increase `timeout` in Assertions |
| `Animation/stability error`   | UI animating when tap is attempted        | Add `checkStability: true` to `Gestures.tap`                          |
| `Unmocked API request`        | Network call not intercepted              | Add the URL to `testSpecificMock`                                     |
| `Feature flag not enabled`    | Feature hidden by flag                    | Add `setupRemoteFeatureFlagsMock` in `testSpecificMock`               |
| `loginToApp timeout`          | Onboarding modal or slow load             | Ensure `restartDevice: true` in `withFixtures`                        |

## Retry for Flaky Interactions

Use `Utilities.executeWithRetry` for inherently unstable taps (carousels, animated modals):

```typescript
import { Utilities } from '../../framework';

async tapButtonWithRetry(): Promise<void> {
  await Utilities.executeWithRetry(
    async () => {
      await Gestures.tap(this.button, { timeout: 2000, description: 'tap button' });
      await Assertions.expectElementToBeVisible(this.nextScreen, {
        timeout: 2000,
        description: 'next screen visible',
      });
    },
    {
      timeout: 30000,
      description: 'tap button and verify navigation',
    },
  );
}
```

## Debugging Tips

1. Add `logger.info(...)` calls in the spec to trace execution progress
2. Check `tests/artifacts/` for screenshots and device logs after a run
3. If the simulator is in an unexpected state: `detox reset-lock-file` then rebuild
4. For animation issues: `await device.disableSynchronization()` before the problematic interaction, `await device.enableSynchronization()` after

## Iteration Loop

```
Fix code → yarn lint --fix → yarn lint:tsc → detox test → read failure → fix → repeat
```

Never skip the lint step after making changes. TypeScript errors caught early save debugging time.
