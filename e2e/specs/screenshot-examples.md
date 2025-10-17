# Running Screenshot Examples Tests

## Overview

The screenshot examples test suite demonstrates various patterns for capturing screenshots during navigation in E2E tests. This suite is tagged with `ScreenshotExamples:` and can be run independently.

## Quick Start

### Run Locally

To run only the screenshot examples tests locally:

```bash
# iOS
export TEST_SUITE_TAG="ScreenshotExamples:"
yarn test:e2e:ios --testNamePattern="ScreenshotExamples:"

# Android
export TEST_SUITE_TAG="ScreenshotExamples:"
yarn test:e2e:android --testNamePattern="ScreenshotExamples:"
```

### Run Specific Example

To run a specific example test:

```bash
# Run only Example 1
yarn test:e2e:ios --testNamePattern="Example 1: Manual screenshot capture"

# Run only Example 3
yarn test:e2e:ios --testNamePattern="Example 3: Capture entire navigation flow"
```

### View Screenshots

After running the tests, screenshots will be available in:

- **iOS**: `e2e/artifacts/ios.sim.debug.MetaMask/`
- **Android**: `e2e/artifacts/android.emu.debug.MetaMask/`

## CI/CD Workflow

To run this test suite in the GitHub Actions workflow, use the `run-e2e-workflow.yml` with:

```yaml
with:
  test-suite-name: 'screenshot-examples'
  platform: 'ios' # or 'android'
  test_suite_tag: 'ScreenshotExamples:'
  test-timeout-minutes: 30
```

### Manual Workflow Trigger

You can also trigger the workflow manually via GitHub UI:

1. Go to **Actions** tab
2. Select **Run E2E** workflow
3. Click **Run workflow**
4. Fill in:
   - **test-suite-name**: `screenshot-examples`
   - **platform**: `ios` or `android`
   - **test_suite_tag**: `ScreenshotExamples:`
   - **test-timeout-minutes**: `30`

### Example Workflow Call

```yaml
jobs:
  screenshot-examples:
    uses: ./.github/workflows/run-e2e-workflow.yml
    with:
      test-suite-name: screenshot-examples
      platform: ios
      test_suite_tag: 'ScreenshotExamples:'
      test-timeout-minutes: 30
      split_number: 1
      total_splits: 1
```

## Test Suite Contents

The screenshot examples suite includes 8 different patterns:

1. **Example 1**: Manual Screenshots at Key Points
2. **Example 2**: Automatic Screenshots on Navigation
3. **Example 3**: Multi-Step Navigation Flow
4. **Example 4**: Reusable Navigation Functions
5. **Example 5**: Conditional Screenshot Capture
6. **Example 6**: Screenshot with Error Handling
7. **Example 7**: Complex Navigation with Multiple Screenshots
8. **Example 8**: Using executeWithScreenshot for Any Operation

## Expected Behavior

When running this test suite:

✅ Tests demonstrate screenshot capture patterns  
✅ Screenshots are saved with timestamped names  
✅ Both successful and failed operations capture screenshots  
✅ All tests should pass and generate visual artifacts

## Debugging

If tests fail:

1. Check the screenshot artifacts directory
2. Review the test logs for error messages
3. Verify the app is properly launched on the simulator/emulator
4. Ensure Detox is configured correctly

## Test Tag

This test suite uses the tag: **`ScreenshotExamples:`**

The tag is defined in `e2e/tags.js`:

```javascript
screenshotExamples: 'ScreenshotExamples:',
```

And applied to the test suite via:

```javascript
describe(ScreenshotExamples('Screenshot Examples'), () => {
  // tests...
});
```

## Related Documentation

- [Screenshot Quick Start Guide](../docs/SCREENSHOTS_QUICKSTART.md)
- [Full Screenshot Documentation](../docs/screenshots-navigation.md)
- [Implementation Summary](../docs/SCREENSHOT_IMPLEMENTATION_SUMMARY.md)
