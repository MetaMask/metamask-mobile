# Smart E2E Test Selection

AI-powered E2E test selection that analyzes code changes and intelligently chooses which tests to run.

## Local Usage

```bash
# Basic analysis (PR changes only)
npm run smart-e2e

# Include main branch changes
npm run smart-e2e -- --include-main-changes

# Dry run to see what would be selected
npm run smart-e2e -- --dry-run --verbose

# JSON output for scripting
npm run smart-e2e -- --output json
```

## CI Usage

### PR Triggers
Add labels to your PR to trigger smart E2E testing:

- `smart-e2e-android` - Run Android tests only
- `smart-e2e-ios` - Run iOS tests only
- `smart-e2e` - Run both iOS and Android tests

### Manual Triggers
Use GitHub Actions "Run workflow" with options:
- **Enable iOS**: Run iOS builds/tests (default: false)
- **Enable Android**: Run Android builds/tests (default: true)
- **Include main changes**: Broader analysis scope (default: false)

## Environment Setup

```bash
# Required for AI analysis
export E2E_CLAUDE_API_KEY=your_claude_api_key
```

## How It Works

1. **Analyzes** changed files in your branch
2. **Uses AI** to determine risk level and affected areas
3. **Selects** appropriate smoke test tags (SmokeCore, SmokeTrade, etc.)
4. **Calculates** optimal test splits for parallel execution
5. **Runs** only relevant tests on selected platforms
