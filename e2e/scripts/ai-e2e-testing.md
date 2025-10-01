# AI E2E Testing System

## Overview

The AI E2E Testing system is an intelligent test selection mechanism that analyzes code changes in pull requests and automatically recommends which End-to-End (E2E) smoke tests should be executed. The system runs in **analysis-only mode** by default, providing test recommendations as PR comments without triggering actual test execution.

## System Architecture

### Core Components

1. **AI Analysis Script** (`e2e/scripts/ai-e2e-tags-selector.ts`)

   - Analyzes git diffs and changed files
   - Uses Claude AI to intelligently select appropriate test tags
   - Provides risk assessment and confidence scoring
   - Calculates optimal test splitting for CI parallelization

2. **Reusable Action** (`.github/actions/ai-e2e-analysis/`)

   - Self-contained composite action for AI analysis
   - Handles PR commenting automatically
   - Reuses changed files from `needs-e2e-build` workflow
   - Outputs test matrix for future E2E test integration

3. **Main CI Integration** (`.github/workflows/ci.yml`)

   - Runs AI analysis on every pull request
   - Posts analysis results as PR comments
   - Continues on error to avoid blocking CI pipeline
   - Provides test recommendations without triggering tests

4. **Analysis Helper Script** (`.github/scripts/ai-e2e-analysis.mjs`)

   - Orchestrates AI analysis execution
   - Handles changed files input (pre-computed or git-based)
   - Generates GitHub Actions outputs
   - Creates step summaries and PR comments

5. **Package Script** (`yarn ai-e2e`)
   - Provides local development access to the AI analysis
   - Supports multiple output formats and configuration options

## How It Works

### 1. Automatic Analysis on Every PR

The system runs automatically on every pull request:

1. **File Detection**: The `needs-e2e-build` job detects changed files
2. **AI Analysis**: The `ai-e2e-analysis` job analyzes changes using Claude AI
3. **PR Comment**: Results are posted as a comment on the PR
4. **Test Matrix**: A test matrix is generated (available for future use)

### 2. Analysis Process

1. **File Analysis**: Examines changed files from `needs-e2e-build` output
2. **AI Assessment**: Uses Claude AI to analyze changes and recommend test tags based on:
   - File paths and change patterns
   - Risk assessment (dependency changes, core modifications)
   - Historical testing patterns
3. **Test Planning**: Counts actual test files and calculates optimal CI job splitting
4. **PR Feedback**: Posts analysis results with risk level, selected tags, and confidence score

### 3. Current Mode: Analysis-Only

**The system currently runs in analysis-only mode:**

- ✅ Analyzes all pull requests automatically
- ✅ Posts recommendations as PR comments
- ✅ Generates test matrix (available as output)
- ❌ Does NOT trigger actual E2E test execution
- ❌ Does NOT build apps or run tests

**Future Integration:** The test matrix output can be used to trigger actual E2E tests when needed.

## Available Test Tags

The system recommends from predefined smoke test tags that are actively used in CI pipelines:

- `SmokeAccounts` - Account management and wallet operations
- `SmokeAssets` - Asset display and management
- `SmokeCard` - Card/payment features
- `SmokeConfirmations` - Transaction confirmation flows
- `SmokeConfirmationsRedesigned` - Updated confirmation UI flows
- `SmokeCore` - Core wallet functionality
- `SmokeIdentity` - Identity and authentication features
- `SmokeNetworkAbstractions` - Network abstraction layer
- `SmokeNetworkExpansion` - Network expansion features
- `SmokeNotifications` - Notification features
- `SmokeStake` - Staking functionality
- `SmokeSwaps` - Swap features
- `SmokeTrade` - Trading and swap functionality
- `SmokeWalletPlatform` - Core wallet platform features
- `SmokeWalletUX` - Wallet UX features

## Tag Selection Logic

### File Path Mapping

The AI uses these guidelines to select appropriate tags:

- **Dependencies** (`yarn.lock`, `package.json`) → Multiple tags based on scope (high risk)
- **Core Infrastructure** (`app/core/`, `app/store/`) → `SmokeWalletPlatform`, `SmokeCore`
- **Confirmations** (`app/components/Views/confirmations/`) → `SmokeConfirmations*`
- **Accounts** (`app/components/*Account*`) → `SmokeAccounts`
- **Trading/Swaps** (`app/components/*Swap*`, `app/components/*Trade*`) → `SmokeTrade`, `SmokeSwaps`
- **Identity** (`app/components/*Identity*`) → `SmokeIdentity`
- **Networks** (`app/util/networks/`) → `SmokeNetworkAbstractions`, `SmokeNetworkExpansion`
- **Assets** (`app/components/*Asset*`) → `SmokeAssets`
- **Configuration/E2E** → Multiple tags (high risk)

### Risk Assessment

- **Low Risk**: Minor UI changes, documentation updates → Fewer tags
- **Medium Risk**: Feature modifications, component updates → Focused tags
- **High Risk**: Core changes, dependency updates, configuration changes → Broader tag coverage

## Usage Guide

### Automatic Analysis

**No action required!** The system runs automatically on every pull request.

You'll see a comment on your PR with:

- **Risk Level**: Assessment of change impact
- **Selected Tags**: Recommended test tags for your changes
- **AI Reasoning**: Explanation of why these tags were selected
- **Confidence**: AI's confidence score (0-100%)
- **Test Recommendations**: Which areas should be tested

### For Local Development

```bash
# Basic analysis of current branch
yarn ai-e2e

# Get JSON output for CI integration
yarn ai-e2e --output json

# Verbose analysis with detailed reasoning
yarn ai-e2e --verbose

# Compare against different base branch
yarn ai-e2e --base-branch origin/develop

# Include broader change context
yarn ai-e2e --include-main-changes

# Show available tags
yarn ai-e2e --show-tags
```

## Configuration

### Environment Variables

- **`E2E_CLAUDE_API_KEY`**: Required for AI analysis (stored in GitHub Secrets)

### Script Options

```bash
Options:
  -b, --base-branch <branch>   Base branch to compare against
  -d, --dry-run               Show commands without running
  -v, --verbose               Verbose output with AI reasoning
  -o, --output <format>       Output format (default|json|tags|matrix)
  --include-main-changes       Include broader context from main branch
  --show-tags                 Show comparison of available vs pipeline tags
  --changed-files <files>     Use pre-computed changed files list
  -h, --help                 Show help information
```

## CI Integration Details

### Main CI Workflow Jobs

1. **needs_e2e_build**: Detects changed files and platform requirements
2. **ai-e2e-analysis**:
   - Runs AI analysis using the reusable action
   - Reuses changed files from `needs_e2e_build`
   - Posts analysis comment to PR
   - Outputs test matrix for future use
   - Continues on error (doesn't block CI)

### Action Components

The reusable action (`.github/actions/ai-e2e-analysis/`) includes:

1. **Setup Steps**: Node.js setup and dependency installation
2. **Repository Checkout**: Full git history for analysis
3. **Git Setup**: Ensures complete history for diff analysis
4. **AI Analysis**: Runs the analysis script with provided inputs
5. **Comment Management**: Deletes old comments and posts new analysis
6. **Error Handling**: Graceful failure without blocking CI

### Outputs

The action provides:

- **test-matrix**: JSON array of test job configurations for future E2E integration

Example matrix output:

```json
[
  { "tag": "SmokeCore", "fileCount": 15, "split": 1, "totalSplits": 2 },
  { "tag": "SmokeCore", "fileCount": 15, "split": 2, "totalSplits": 2 },
  { "tag": "SmokeAssets", "fileCount": 8, "split": 1, "totalSplits": 1 }
]
```

### Resource Optimization

- **Efficient File Detection**: Reuses changed files from `needs-e2e-build`
- **No Duplicate Git Operations**: Skips git diff when files are provided
- **Minimal Dependencies**: Installs only required AI packages
- **Graceful Failures**: Continues on error to avoid blocking CI
- **Conditional Execution**: Only runs on pull requests

## PR Comment Format

The system posts a comment on your PR with the following information:

```markdown
## 🔍 AI E2E Analysis Report

**Risk Level:** medium | **Selected Tags:** SmokeCore, SmokeAssets

**🤖 AI Analysis:**

> The changes affect core wallet functionality and asset display components, requiring testing of account operations and asset management flows.

**📊 Analysis Results:**

- **Confidence:** 85%

**🏷️ Test Recommendation:**
Based on the code changes, the AI recommends testing the following areas: **SmokeCore, SmokeAssets**

_🔍 [View complete analysis](link) • AI E2E Analysis_
```

## Monitoring and Debugging

### PR Comments

The system provides feedback through PR comments with:

- **Risk Level**: Low, medium, or high
- **Selected Tags**: Recommended test tags
- **AI Reasoning**: Why these tags were selected
- **Confidence Score**: AI's confidence in the recommendation
- **Test Recommendations**: Clear guidance on what to test

### Workflow Logs

Each workflow step provides detailed logging:

- Whether using pre-computed or git-based file detection
- File analysis and filtering results
- AI reasoning and confidence scores
- Test file counts and splitting calculations
- Comment posting status

### Local Testing

Test the AI analysis locally before pushing:

```bash
# Test current branch changes
yarn ai-e2e --verbose

# Test specific base branch
yarn ai-e2e --base-branch origin/main --verbose

# Get machine-readable output
yarn ai-e2e --output json | jq '.'

# See the test matrix
yarn ai-e2e --output matrix | jq '.'
```

## Best Practices

### For Developers

1. **Review AI recommendations**: Check the PR comment to understand which areas your changes affect
2. **Local testing**: Run `yarn ai-e2e --verbose` to preview recommendations before pushing
3. **Risk awareness**: Understand that dependency changes trigger broader recommendations
4. **Use recommendations**: Consider the suggested test tags when manually testing your changes

### For Maintainers

1. **Monitor accuracy**: Review AI recommendations to ensure they match actual impact
2. **Tag maintenance**: Keep test tag mappings updated as features evolve
3. **Tune prompts**: Update AI prompts if recommendations become inaccurate
4. **Future integration**: Plan for connecting test matrix output to actual E2E execution

## Future Enhancements

### Planned Features

1. **Actual Test Execution**: Connect test matrix output to E2E test jobs
2. **Label-based Triggers**: Add labels to trigger actual test execution when needed
3. **Platform Selection**: Support iOS/Android specific test execution
4. **Learning from Results**: Incorporate test results to improve future selections
5. **Custom Tag Mapping**: Allow repository-specific tag selection rules
6. **Performance Metrics**: Track and optimize CI execution time savings

### Integration Path

The system is designed to evolve from analysis-only to full test execution:

```yaml
# Future E2E test integration example
e2e-tests:
  needs: [ai-e2e-analysis, build-ios, build-android]
  if: needs.ai-e2e-analysis.outputs.test-matrix != '[]'
  strategy:
    matrix:
      include: ${{ fromJson(needs.ai-e2e-analysis.outputs.test-matrix) }}
  uses: ./.github/workflows/run-e2e-workflow.yml
  with:
    platform: 'ios' # or 'android'
    test_suite_tag: ${{ matrix.tag }}
    split_number: ${{ matrix.split }}
    total_splits: ${{ matrix.totalSplits }}
```

## Troubleshooting

### Common Issues

1. **No tags selected**: Likely low-risk changes (docs, images) - this is expected
2. **Unexpected tag selection**: Check file paths and AI reasoning in verbose output
3. **Missing API key**: Ensure `E2E_CLAUDE_API_KEY` is configured in GitHub Secrets
4. **Comment not appearing**: Check workflow permissions and `pull-requests: write` is granted
5. **Rate limit errors**: The action continues on error, won't block CI

### Debug Commands

```bash
# Check what files are being analyzed
yarn ai-e2e --verbose

# Verify available tags match pipeline
yarn ai-e2e --show-tags

# Test JSON output format
yarn ai-e2e --output json

# Test matrix output format
yarn ai-e2e --output matrix

# Compare different base branches
yarn ai-e2e --base-branch origin/develop --verbose

# Test with specific changed files
yarn ai-e2e --changed-files "app/file1.ts app/file2.ts"
```

## Summary

The AI E2E Testing system currently provides **intelligent test recommendations** on every pull request, helping developers understand which areas of the application are affected by their changes. The system is designed to be non-blocking, efficient, and ready to evolve into full test execution when needed.
