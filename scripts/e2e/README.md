# AI E2E Test Selector - Local Script Usage

## Overview

The AI E2E test selector is a command-line tool that analyzes your code changes and recommends which E2E smoke tests should be run. It uses Claude AI to intelligently select test tags based on the files you've modified.

## Quick Start

```bash
# Basic analysis of your current branch
yarn ai-e2e

# Get detailed reasoning from the AI
yarn ai-e2e --verbose

# Get JSON output (useful for scripting)
yarn ai-e2e --output json
```

## Installation

The script requires the following dependencies (installed automatically with `yarn install`):
- `@anthropic-ai/sdk` - For Claude AI integration
- `esbuild-register` - For TypeScript execution

## Configuration

### API Key Setup

The script requires a Claude API key. Set it as an environment variable:

```bash
export E2E_CLAUDE_API_KEY="your-api-key-here"
```

Or add it to your `.env` file:

```bash
E2E_CLAUDE_API_KEY=your-api-key-here
```

## Command-Line Options

### Basic Options

```bash
-b, --base-branch <branch>
```
Specify the base branch to compare against (default: `origin/main`)

**Example:**
```bash
yarn ai-e2e --base-branch origin/develop
```

---

```bash
-v, --verbose
```
Show detailed AI reasoning and analysis

**Example:**
```bash
yarn ai-e2e --verbose
```

---

```bash
-d, --dry-run
```
Show what commands would run without executing them

**Example:**
```bash
yarn ai-e2e --dry-run
```

---

```bash
-h, --help
```
Display help information

**Example:**
```bash
yarn ai-e2e --help
```

### Output Formats

```bash
-o, --output <format>
```
Control the output format. Available formats:
- `default` - Human-readable summary (default)
- `json` - Complete JSON output with all analysis data
- `tags` - Simple list of selected tags
- `matrix` - GitHub Actions matrix format

**Examples:**
```bash
# JSON format for scripting
yarn ai-e2e --output json

# Just the tags
yarn ai-e2e --output tags

# Matrix format for CI integration
yarn ai-e2e --output matrix
```

### Advanced Options

```bash
--include-main-changes
```
Include recent changes from the main branch in the analysis. This provides broader context but may select more tests.

**Example:**
```bash
yarn ai-e2e --include-main-changes
```

---

```bash
--changed-files <files>
```
Provide a pre-computed list of changed files instead of using git diff. Useful for CI integration.

**Example:**
```bash
yarn ai-e2e --changed-files "app/file1.ts app/file2.ts app/file3.tsx"
```

---

```bash
--show-tags
```
Display all available test tags and their usage in the CI pipeline

**Example:**
```bash
yarn ai-e2e --show-tags
```

## Output Formats Explained

### Default Output

Human-readable summary with selected tags, risk level, and reasoning.

```bash
$ yarn ai-e2e

🎯 AI E2E Test Selection Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Analysis Summary
  Risk Level: medium
  Selected Tags: SmokeCore, SmokeAssets (2 tags)
  Confidence: 85%

🤖 AI Reasoning:
  The changes affect core wallet functionality and asset display components,
  requiring testing of account operations and asset management flows.

📋 Test File Breakdown:
  - SmokeCore: 15 files → 2 splits
  - SmokeAssets: 8 files → 1 split

✨ Total: 3 CI jobs would be created
```

### JSON Output

Complete structured output with all analysis data.

```bash
$ yarn ai-e2e --output json

{
  "selectedTags": ["SmokeCore", "SmokeAssets"],
  "riskLevel": "medium",
  "confidence": 85,
  "reasoning": "The changes affect core wallet functionality...",
  "testFileBreakdown": [
    {
      "tag": "SmokeCore",
      "fileCount": 15,
      "recommendedSplits": 2
    },
    {
      "tag": "SmokeAssets",
      "fileCount": 8,
      "recommendedSplits": 1
    }
  ]
}
```

### Tags Output

Simple list of selected tags (one per line).

```bash
$ yarn ai-e2e --output tags

SmokeCore
SmokeAssets
```

### Matrix Output

GitHub Actions matrix format for CI integration.

```bash
$ yarn ai-e2e --output matrix

[
  {
    "tag": "SmokeCore",
    "fileCount": 15,
    "split": 1,
    "totalSplits": 2
  },
  {
    "tag": "SmokeCore",
    "fileCount": 15,
    "split": 2,
    "totalSplits": 2
  },
  {
    "tag": "SmokeAssets",
    "fileCount": 8,
    "split": 1,
    "totalSplits": 1
  }
]
```

## Available Test Tags

The script can recommend the following smoke test tags:

| Tag | Description |
|-----|-------------|
| `SmokeAccounts` | Account management and wallet operations |
| `SmokeAssets` | Asset display and management |
| `SmokeCard` | Card/payment features |
| `SmokeConfirmations` | Transaction confirmation flows |
| `SmokeConfirmationsRedesigned` | Updated confirmation UI flows |
| `SmokeCore` | Core wallet functionality |
| `SmokeIdentity` | Identity and authentication features |
| `SmokeNetworkAbstractions` | Network abstraction layer |
| `SmokeNetworkExpansion` | Network expansion features |
| `SmokeNotifications` | Notification features |
| `SmokeStake` | Staking functionality |
| `SmokeSwaps` | Swap features |
| `SmokeTrade` | Trading and swap functionality |
| `SmokeWalletPlatform` | Core wallet platform features |
| `SmokeWalletUX` | Wallet UX features |

Use `yarn ai-e2e --show-tags` to see which tags are actively used in the CI pipeline.

## Common Use Cases

### Preview Test Selection Before Pushing

Check what tests would be recommended for your changes:

```bash
yarn ai-e2e --verbose
```

### Compare Against Different Base Branch

Useful when working on a feature branch:

```bash
yarn ai-e2e --base-branch origin/develop --verbose
```

### Get Machine-Readable Output

For scripting or integration with other tools:

```bash
yarn ai-e2e --output json | jq '.selectedTags'
```

### Check Test File Counts

See how many test files exist for each tag:

```bash
yarn ai-e2e --output json | jq '.testFileBreakdown'
```

### Verify Tag Availability

Check which tags are available and actively used:

```bash
yarn ai-e2e --show-tags
```

### Test with Specific Files

Useful for testing the script behavior:

```bash
yarn ai-e2e --changed-files "app/core/Engine.ts app/store/index.js" --verbose
```

## Understanding the Analysis

### Risk Levels

- **Low**: Minor UI changes, documentation updates, styling changes
- **Medium**: Feature modifications, component updates, isolated changes
- **High**: Core infrastructure changes, dependency updates, configuration changes

### Confidence Scores

The AI provides a confidence score (0-100%) indicating how certain it is about the tag selection:
- **90-100%**: Very confident (clear file path matches)
- **70-89%**: Confident (good context and patterns)
- **50-69%**: Moderate confidence (some ambiguity)
- **Below 50%**: Low confidence (unclear impact)

### Test Splitting

The script automatically calculates optimal test splitting for CI parallelization:
- Aims for 3-4 test files per split
- Considers the total number of test files for each tag
- Generates a matrix ready for GitHub Actions

## Troubleshooting

### "API key not found"

Make sure you've set the `E2E_CLAUDE_API_KEY` environment variable:

```bash
export E2E_CLAUDE_API_KEY="your-api-key-here"
```

### "No changes detected"

The script compares your current branch against the base branch. If you're on the base branch or haven't made changes yet:

```bash
# Make sure you're on a feature branch
git checkout -b my-feature-branch

# Or specify a different base branch
yarn ai-e2e --base-branch origin/develop
```

### "No tags selected"

This is expected for low-risk changes like:
- Documentation updates (`*.md` files)
- Image changes (`*.png`, `*.svg` files)
- Config files that don't affect runtime code

### TypeScript compilation errors

The script uses `esbuild-register` for TypeScript execution. If you encounter errors:

```bash
# Ensure dependencies are installed
yarn install

# Try cleaning and reinstalling
yarn clean && yarn install
```

## Integration with CI

This script is automatically integrated into the main CI pipeline via the reusable action at `.github/actions/ai-e2e-analysis/`. The action:

1. Reuses changed files from the `needs-e2e-build` job
2. Runs the AI analysis
3. Posts results as a PR comment
4. Outputs a test matrix for future E2E integration

For more details on CI integration, see `/docs/ai-e2e-testing.md`.

## Script Location

- **Main Script**: `scripts/e2e/ai-e2e-tags-selector.ts`
- **Package Command**: Defined in `package.json` as `ai-e2e`
- **CI Helper**: `.github/scripts/ai-e2e-analysis.mjs`

## Examples

### Basic workflow

```bash
# 1. Make your changes
git checkout -b my-feature

# 2. Check what tests would be recommended
yarn ai-e2e --verbose

# 3. Review the AI reasoning and selected tags

# 4. Push your changes
git push origin my-feature

# 5. The CI will automatically run the analysis and post results to your PR
```

### Advanced analysis

```bash
# Get detailed JSON output with all analysis data
yarn ai-e2e --output json > analysis.json

# Extract just the tags
jq -r '.selectedTags[]' analysis.json

# Extract the test matrix
jq '.testFileBreakdown' analysis.json

# Count total recommended CI jobs
jq '[.testFileBreakdown[].recommendedSplits] | add' analysis.json
```

### Testing different scenarios

```bash
# Test against main branch with verbose output
yarn ai-e2e --base-branch origin/main --verbose

# Test with broader context included
yarn ai-e2e --include-main-changes --verbose

# Dry run to see what commands would execute
yarn ai-e2e --dry-run

# Show all available tags
yarn ai-e2e --show-tags
```

## Tips

1. **Run locally first**: Always check `yarn ai-e2e --verbose` before pushing to understand what tests might be recommended
2. **Check risk level**: High-risk changes will typically select more test tags
3. **Review reasoning**: The AI explains why it selected each tag - use this to validate the selection
4. **Use appropriate base branch**: Make sure you're comparing against the right branch (usually `origin/main`)
5. **Keep API key secure**: Never commit your API key to the repository

## Getting Help

```bash
# Show help and all available options
yarn ai-e2e --help

# Check available tags and their CI usage
yarn ai-e2e --show-tags
```

For more information about the overall AI E2E testing system, see `/docs/ai-e2e-testing.md`.