# Screenshot Examples Test Suite - Setup Complete ✅

## What Was Configured

The screenshot examples test suite is now fully configured to run independently in your E2E workflow.

## Files Modified/Created

### Modified:

1. **`e2e/tags.js`**

   - Added `screenshotExamples: 'ScreenshotExamples:'` tag
   - Exported `ScreenshotExamples` function

2. **`e2e/specs/screenshot-examples.spec.ts`** (moved from `e2e/docs/`)
   - Added `ScreenshotExamples` tag to test suite
   - Now runs with filtered execution

### Created:

3. **`.github/workflows/run-screenshot-examples.yml`**

   - Dedicated workflow for running screenshot examples
   - Can be triggered manually from GitHub Actions UI

4. **`e2e/scripts/run-screenshot-examples.sh`**

   - Bash script for running tests locally
   - Handles cleanup and artifact location display

5. **`e2e/specs/screenshot-examples.md`**
   - Documentation for running the test suite
   - Contains workflow configuration examples

## How to Run

### Option 1: GitHub Actions (CI/CD)

#### Via GitHub UI:

1. Go to **Actions** tab in GitHub
2. Select **Screenshot Examples E2E Tests** workflow
3. Click **Run workflow**
4. Choose platform (`ios` or `android`)
5. Click **Run workflow** button

#### Via Another Workflow:

```yaml
jobs:
  test-screenshots:
    uses: ./.github/workflows/run-screenshot-examples.yml
    with:
      platform: ios
    secrets: inherit
```

### Option 2: Local Script

```bash
# iOS
./e2e/scripts/run-screenshot-examples.sh ios

# Android
./e2e/scripts/run-screenshot-examples.sh android
```

### Option 3: Direct Jest Command

```bash
# iOS
export TEST_SUITE_TAG="ScreenshotExamples:"
yarn test:e2e:ios --testNamePattern="ScreenshotExamples:"

# Android
export TEST_SUITE_TAG="ScreenshotExamples:"
yarn test:e2e:android --testNamePattern="ScreenshotExamples:"
```

### Option 4: Run Specific Example

```bash
# Run only Example 1
yarn test:e2e:ios --testNamePattern="Example 1: Manual screenshot capture"

# Run only Example 3
yarn test:e2e:ios --testNamePattern="Example 3: Capture entire navigation flow"
```

## Workflow Integration

### Using the Dedicated Workflow

The dedicated workflow `.github/workflows/run-screenshot-examples.yml` is configured to:

- ✅ Run only screenshot example tests
- ✅ Support both iOS and Android
- ✅ Be manually triggered via GitHub Actions UI
- ✅ Use the main E2E workflow infrastructure

### Calling from Another Workflow

You can integrate it into your existing workflows:

```yaml
name: My PR Tests
on: pull_request

jobs:
  screenshot-examples:
    name: Run Screenshot Examples
    uses: ./.github/workflows/run-screenshot-examples.yml
    with:
      platform: ios
    secrets: inherit
```

### Using the Base Workflow Directly

You can also call the base `run-e2e-workflow.yml` directly:

```yaml
jobs:
  my-screenshot-tests:
    uses: ./.github/workflows/run-e2e-workflow.yml
    with:
      test-suite-name: screenshot-examples
      platform: ios
      test_suite_tag: 'ScreenshotExamples:'
      test-timeout-minutes: 30
      split_number: 1
      total_splits: 1
    secrets: inherit
```

## Test Suite Structure

### Test File Location

```
e2e/specs/screenshot-examples.spec.ts
```

### Tag Definition

```javascript
// In e2e/tags.js
screenshotExamples: 'ScreenshotExamples:';

// Usage in test file
import { ScreenshotExamples } from '../tags';

describe(ScreenshotExamples('Screenshot Examples'), () => {
  // 8 example tests demonstrating screenshot capture patterns
});
```

### Examples Included

1. ✅ Manual Screenshots at Key Points
2. ✅ Automatic Screenshots on Navigation
3. ✅ Multi-Step Navigation Flow
4. ✅ Reusable Navigation Functions
5. ✅ Conditional Screenshot Capture
6. ✅ Screenshot with Error Handling
7. ✅ Complex Navigation with Multiple Screenshots
8. ✅ Using executeWithScreenshot for Any Operation

## Screenshot Artifacts

After running tests, screenshots will be saved to:

**iOS:**

```
e2e/artifacts/ios.sim.debug.MetaMask/
```

**Android:**

```
e2e/artifacts/android.emu.debug.MetaMask/
```

### Screenshot Naming Pattern

```
[prefix]_[timestamp]_[action-name]-[suffix].png
```

Examples:

- `navigation_2024-10-17T10-30-45-123Z_navigate-to-browser-after.png`
- `settings-flow_2024-10-17T10-30-45-123Z_step-1-open-menu-after.png`
- `navigation_2024-10-17T10-30-45-123Z_navigate-to-settings-failed.png`

## Verifying the Setup

### Test Locally:

```bash
# Quick test on iOS
./e2e/scripts/run-screenshot-examples.sh ios

# Check that screenshots are generated
ls -la e2e/artifacts/ios.sim.debug.MetaMask/
```

### Test in CI:

1. Push changes to your branch
2. Go to GitHub Actions
3. Run **Screenshot Examples E2E Tests** workflow
4. Download artifacts after completion
5. Verify screenshots are present

## Environment Variables

The test suite respects the following environment variables:

```bash
# Filter tests by tag (set automatically by script)
export TEST_SUITE_TAG="ScreenshotExamples:"

# Optional: Enable/disable screenshots (for conditional capture)
export E2E_SCREENSHOTS="true"
```

## Troubleshooting

### Tests Not Running

**Issue**: No tests found or wrong tests running

**Solution**: Ensure the tag is correctly set:

```bash
export TEST_SUITE_TAG="ScreenshotExamples:"
# Note the colon at the end!
```

### Screenshots Not Generated

**Issue**: Tests pass but no screenshots in artifacts

**Solution**: Check that:

1. Detox artifacts configuration is correct in `.detoxrc.json`
2. The app launches successfully on simulator/emulator
3. Tests are actually calling screenshot capture functions

### Workflow Not Appearing

**Issue**: New workflow doesn't show up in GitHub Actions

**Solution**:

1. Ensure the workflow file is in `.github/workflows/`
2. Push the file to GitHub
3. Refresh the Actions tab

## Next Steps

1. ✅ **Test Locally**: Run `./e2e/scripts/run-screenshot-examples.sh ios`
2. ✅ **Test in CI**: Trigger the workflow manually in GitHub Actions
3. ✅ **Review Screenshots**: Check the artifacts directory
4. ✅ **Copy Patterns**: Use examples in your own tests

## Related Documentation

- 📖 [Quick Start Guide](../docs/SCREENSHOTS_QUICKSTART.md)
- 📚 [Full Documentation](../docs/screenshots-navigation.md)
- 📋 [Implementation Summary](../docs/SCREENSHOT_IMPLEMENTATION_SUMMARY.md)
- 📝 [Running Instructions](./screenshot-examples.md)

## Summary

You now have:

- ✅ A tagged test suite (`ScreenshotExamples:`)
- ✅ Dedicated GitHub Actions workflow
- ✅ Local execution script
- ✅ Complete documentation
- ✅ 8 working examples demonstrating screenshot patterns

The test suite can now be run independently via:

- GitHub Actions UI (manual trigger)
- Workflow calls from other workflows
- Local script execution
- Direct Jest commands

**Ready to use!** 🚀
