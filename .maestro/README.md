# Maestro Visual Regression Testing

This directory contains Maestro flows for visual regression testing of the MetaMask Mobile app.

## Overview

Maestro is a mobile UI testing framework that supports visual regression testing through screenshot comparison. This setup captures baseline screenshots of critical app screens and compares them against new builds to detect unintended UI changes.

## Directory Structure

```
.maestro/
├── config.yaml          # Global Maestro configuration
├── baselines/           # Baseline screenshots (committed to git)
│   ├── ios/
│   └── android/
├── flows/               # Maestro test flows
│   ├── onboarding/      # Wallet creation/import flows
│   ├── wallet/          # Main wallet screens
│   ├── send/            # Send transaction flow
│   └── settings/        # Settings screens
├── scripts/
│   └── update-baselines.sh
└── README.md
```

## Prerequisites

1. **Install Maestro CLI**:

   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Verify installation**:

   ```bash
   maestro --version
   ```

3. **iOS Simulator** or **Android Emulator** running with the MetaMask app installed.

## Running Tests

### Run all visual tests

```bash
# Ensure app is built and running
yarn watch

# Run all Maestro flows
maestro test .maestro/flows/
```

### Run specific flow

```bash
# Run onboarding flows only
maestro test .maestro/flows/onboarding/

# Run a single flow
maestro test .maestro/flows/wallet/wallet-home.yaml
```

### Run with environment variables

```bash
maestro test .maestro/flows/ --env TEST_PASSWORD="your-test-password"
```

## Capturing Baselines

### Using the update script

```bash
# Update all baselines for iOS
.maestro/scripts/update-baselines.sh --ios

# Update specific flow baselines
.maestro/scripts/update-baselines.sh onboarding

# Update baselines for both platforms
.maestro/scripts/update-baselines.sh --all
```

### Manual baseline capture

```bash
# Run in record mode to capture screenshots
maestro record .maestro/flows/onboarding/create-wallet.yaml --output .maestro/baselines/
```

## Visual Regression Assertions

After capturing baselines, convert `takeScreenshot` to `assertScreenshot` in your flows:

```yaml
# Capture mode (for creating baselines)
- takeScreenshot: wallet/ios/home

# Assert mode (for regression testing)
- assertScreenshot:
    path: wallet/ios/home
    thresholdPercentage: 95 # Allow 5% variance
```

The `thresholdPercentage` parameter controls how strict the comparison is:

- `100`: Pixel-perfect match required
- `95` (default): Allow up to 5% difference
- Lower values: More lenient comparisons

## CI Integration

Visual regression tests run automatically on pull requests via GitHub Actions:

- **Workflow**: `.github/workflows/maestro-visual-regression.yml`
- **Triggers**: PRs to `main` or `develop` that modify `app/**` or `.maestro/**`
- **Artifacts**: Screenshots and diffs are uploaded as build artifacts

### Updating baselines via CI

Trigger the workflow manually with the `update_baselines` input set to `true`:

1. Go to Actions > Maestro Visual Regression
2. Click "Run workflow"
3. Check "Update baseline screenshots"
4. Run workflow

## Covered Screens

### Onboarding (~15 screens)

- Welcome screen
- Create password
- Protect wallet / backup steps
- Import wallet
- Login screen
- Onboarding success

### Wallet (~5 screens)

- Wallet home
- Account picker
- Network selector
- Wallet actions
- Profile menu

### Send (~4 screens)

- Asset selection
- Amount entry
- Recipient selection
- Confirmation (covered by existing testIDs)

### Settings (~10 screens)

- Settings main
- General settings
- Security settings
- Advanced settings
- Contacts
- Networks
- Notifications
- About MetaMask

## Troubleshooting

### "Element not found" errors

1. Ensure the app is running on the simulator/emulator
2. Verify testIDs match what's in the app
3. Increase timeout if the app is slow to load

### Screenshots not matching

1. Check device resolution matches baseline device
2. Ensure consistent app state (same wallet, network)
3. Consider using `cropOn` to exclude dynamic content

### Flaky tests

Use `optional: true` for elements that may not always be visible:

```yaml
- tapOn:
    id: 'optional-element'
    optional: true
```

## Adding New Screens

1. Create a new flow file in the appropriate `flows/` subdirectory
2. Use `takeScreenshot` to capture the screen
3. Run the flow to verify it works
4. Commit the baseline screenshots
5. Optionally convert to `assertScreenshot` for regression testing

## Best Practices

1. **Use testIDs**: Always reference elements by testID when possible
2. **Handle dynamic content**: Use `cropOn` to exclude timestamps, balances
3. **Keep flows focused**: One flow per user journey or screen
4. **Document prerequisites**: Note any required app state
5. **Use sub-flows**: Extract common steps (like login) into reusable flows

## Comparing Visual Changes Between PRs

When you need to assess the visual impact of a significant change (like a navigation migration), use the comparison workflow:

### Prerequisites

1. **ImageMagick** for diff generation:

   ```bash
   brew install imagemagick
   ```

2. **Baseline screenshots** must exist in `.maestro/baselines/ios/`

### Quick Start

```bash
# Capture screenshots with your changes
.maestro/scripts/compare-visual-regression.sh capture

# Generate diff images
.maestro/scripts/generate-diffs.sh

# View results
open .maestro/diffs/
cat .maestro/diffs/summary.md
```

### Available Commands

| Script                         | Command   | Description                              |
| ------------------------------ | --------- | ---------------------------------------- |
| `compare-visual-regression.sh` | `capture` | Capture screenshots to `after-nav/`      |
| `compare-visual-regression.sh` | `diff`    | Only generate diff images                |
| `compare-visual-regression.sh` | `full`    | Capture + generate diffs (default)       |
| `compare-visual-regression.sh` | `sync`    | Merge navigation changes + full workflow |
| `generate-diffs.sh`            | -         | Generate diff images with options        |

### Diff Output

The comparison generates:

- `*-diff.png` - Changed pixels highlighted in red
- `*-comparison.png` - Side-by-side: baseline | after | diff
- `*-report.txt` - Per-screen change metrics
- `summary.md` - Overall summary with statistics

### Directory Structure

```
.maestro/
├── baselines/ios/     # Original baselines (committed)
├── after-nav/ios/     # Screenshots after changes (gitignored)
├── diffs/ios/         # Generated diffs (gitignored)
└── scripts/
    ├── compare-visual-regression.sh
    └── generate-diffs.sh
```

### Interpreting Results

| Change % | Interpretation                                  |
| -------- | ----------------------------------------------- |
| < 1%     | Minor rendering differences, usually acceptable |
| 1-5%     | Small UI changes, review recommended            |
| > 5%     | Significant changes, detailed review required   |

### Example Workflow for PR Review

```bash
# 1. Create comparison branch from your feature PR
git checkout feat/your-feature
git checkout -b chore/visual-regression-your-feature

# 2. Merge visual regression framework
git merge origin/chore/add-maestro-visual-regression-tests --no-edit

# 3. Build and run app
yarn setup:expo && yarn watch:clean &
yarn start:ios

# 4. Run comparison
.maestro/scripts/compare-visual-regression.sh full

# 5. Review diffs and document in your PR
```

For detailed guidance, see the Cursor skill at `.cursor/skills/visual-regression-compare/SKILL.md`.

## References

- [Maestro Documentation](https://docs.maestro.dev/)
- [takeScreenshot Command](https://docs.maestro.dev/reference/commands-available/takescreenshot)
- [assertScreenshot Command](https://docs.maestro.dev/reference/commands-available/assertscreenshot)
- [Visual Testing Blog Post](https://maestro.dev/blog/visual-testing)
