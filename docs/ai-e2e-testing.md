# AI E2E Testing System

## Overview

The AI E2E Testing system is an intelligent test selection mechanism that analyzes code changes in pull requests and automatically determines which End-to-End (E2E) smoke tests should be executed. This system reduces CI execution time and resource usage while maintaining comprehensive test coverage by running only the most relevant tests for each change.

## System Architecture

### Core Components

1. **AI Analysis Script** (`scripts/e2e/ai-e2e-tags-selector.ts`)

   - Analyzes git diffs and changed files
   - Uses Claude AI to intelligently select appropriate test tags
   - Provides risk assessment and confidence scoring
   - Calculates optimal test splitting for CI parallelization

2. **GitHub Workflow** (`.github/workflows/ai-e2e-selection.yml`)

   - Orchestrates the entire testing pipeline
   - Manages platform-specific builds (iOS/Android)
   - Executes selected tests in parallel across multiple CI jobs
   - Reports results back to pull requests

3. **Package Script** (`yarn ai-e2e`)
   - Provides local development access to the AI analysis
   - Supports multiple output formats and configuration options

## How It Works

### 1. Trigger Conditions

The system activates when:

- A pull request is labeled with `ai-e2e`, `ai-e2e-ios`, or `ai-e2e-android`
- Manual workflow dispatch is triggered
- Pull requests are synchronized or reopened (if already labeled)

### 2. Analysis Process

1. **File Analysis**: Examines changed files and filters out irrelevant changes (docs, images, etc.)
2. **AI Assessment**: Uses Claude AI to analyze changes and recommend test tags based on:
   - File paths and change patterns
   - Risk assessment (dependency changes, core modifications)
   - Historical testing patterns
3. **Test Planning**: Counts actual test files and calculates optimal CI job splitting
4. **Platform Selection**: Determines which platforms (iOS/Android) should run tests

### 3. Test Execution

- **Dynamic Matrix Generation**: Creates CI job matrix based on selected tags and file counts
- **Parallel Execution**: Runs tests across multiple CI runners for efficiency
- **Platform Coverage**: Executes same test suite on both iOS and Android (when enabled)
- **Real-time Reporting**: Updates pull request with progress and results

## Available Test Tags

The system works with predefined smoke test tags that are actively used in CI pipelines:

- `SmokeAccounts` - Account management and wallet operations
- `SmokeConfirmations` - Transaction confirmation flows
- `SmokeConfirmationsRedesigned` - Updated confirmation UI flows
- `SmokeIdentity` - Identity and authentication features
- `SmokeNetworkAbstractions` - Network abstraction layer
- `SmokeNetworkExpansion` - Network expansion features
- `SmokeTrade` - Trading and swap functionality
- `SmokeWalletPlatform` - Core wallet platform features

## Tag Selection Logic

### File Path Mapping

The AI uses these guidelines to select appropriate tags:

- **Dependencies** (`yarn.lock`, `package.json`) → All tags (high risk)
- **Core Infrastructure** (`app/core/`, `app/store/`) → `SmokeWalletPlatform`
- **Confirmations** (`app/components/Views/confirmations/`) → `SmokeConfirmations*`
- **Accounts** (`app/components/*Account*`) → `SmokeAccounts`
- **Trading** (`app/components/*Swap*`) → `SmokeTrade`
- **Identity** (`app/components/*Identity*`) → `SmokeIdentity`
- **Networks** (`app/util/networks/`) → `SmokeNetworkAbstractions`, `SmokeNetworkExpansion`
- **Configuration/E2E** → All tags (high risk)

### Risk Assessment

- **Low Risk**: Minor UI changes, documentation updates
- **Medium Risk**: Feature modifications, component updates
- **High Risk**: Core changes, dependency updates, configuration changes

## Usage Guide

### For Pull Requests

1. **Label your PR** with one of:

   - `ai-e2e` - Run on both iOS and Android
   - `ai-e2e-ios` - Run iOS tests only
   - `ai-e2e-android` - Run Android tests only

2. **Monitor Progress**: The system will:
   - Post initial analysis comment with selected tags
   - Show real-time progress updates
   - Update final results when complete

### For Local Development

```bash
# Basic analysis
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

### Manual Workflow Trigger

You can manually trigger the workflow with custom options:

1. Go to Actions → "AI E2E Selection"
2. Click "Run workflow"
3. Configure:
   - Enable iOS/Android platforms
   - Set base branch for comparison
   - Include main branch changes for context

## Configuration

### Environment Variables

- **`E2E_CLAUDE_API_KEY`**: Required for AI analysis (stored in GitHub Secrets)

### Script Options

```bash
Options:
  -b, --base-branch <branch>   Base branch to compare against
  -d, --dry-run               Show commands without running
  -v, --verbose               Verbose output with AI reasoning
  -o, --output <format>       Output format (default|json|tags)
  --include-main-changes       Include broader context from main branch
  --show-tags                 Show comparison of available vs pipeline tags
  -h, --help                 Show help information
```

## CI Integration Details

### Workflow Jobs

1. **analyze-and-plan**: AI analysis and test planning
2. **delete-existing-comments**: Clean up previous PR comments
3. **post-pr-comment**: Post analysis results to PR
4. **platform-conditions**: Determine platform testing requirements
5. **build-ios/build-android**: Build platform-specific apps
6. **ios-guided-tests/android-guided-tests**: Execute selected tests
7. **report-\*-guided-tests**: Generate test reports
8. **report-results**: Final summary and PR update

### Matrix Strategy

Tests are automatically split into parallel jobs based on:

- Number of test files for each selected tag
- Target of ~3-4 tests per CI job
- Maximum reasonable number of splits per tag
- Platform-specific execution (iOS/Android)

### Resource Optimization

- **Selective Building**: Only builds for platforms that will run tests
- **Parallel Execution**: Runs multiple test jobs simultaneously
- **Conditional Jobs**: Skips unnecessary steps based on analysis results
- **Smart Splitting**: Optimizes CI job distribution for fastest execution

## Monitoring and Debugging

### PR Comments

The system provides detailed feedback through PR comments:

- **Initial Analysis**: Risk level, selected tags, reasoning
- **Progress Updates**: Real-time job status
- **Final Results**: Complete execution summary with links

### Workflow Logs

Each workflow step provides detailed logging:

- File analysis and filtering results
- AI reasoning and confidence scores
- Test file counts and splitting calculations
- Platform enablement decisions

### Local Testing

Test the AI analysis locally before pushing:

```bash
# Test current branch changes
yarn ai-e2e --verbose

# Test specific base branch
yarn ai-e2e --base-branch origin/main --verbose

# Get machine-readable output
yarn ai-e2e --output json | jq '.'
```

## Best Practices

### For Developers

1. **Use appropriate labels**: Choose the right platform-specific labels when possible
2. **Monitor PR comments**: Check AI reasoning to ensure expected tests are selected
3. **Local testing**: Run `yarn ai-e2e --verbose` to preview test selection
4. **Risk awareness**: Understand that dependency changes trigger broader testing

### For Maintainers

1. **Tag maintenance**: Keep test tag mappings updated as features evolve
2. **Pipeline integration**: Ensure selected tags match available CI job definitions
3. **Performance monitoring**: Track CI resource usage and adjust splitting logic
4. **AI tuning**: Monitor AI selection accuracy and update prompts as needed

## Troubleshooting

### Common Issues

1. **No tests selected**: Likely low-risk changes (docs, images) - this is expected
2. **Unexpected tag selection**: Check file paths and AI reasoning in verbose output
3. **CI job failures**: Verify selected tags exist in pipeline definitions
4. **Missing API key**: Ensure `E2E_CLAUDE_API_KEY` is configured in GitHub Secrets

### Debug Commands

```bash
# Check what files are being analyzed
yarn ai-e2e --verbose

# Verify available tags match pipeline
yarn ai-e2e --show-tags

# Test JSON output format
yarn ai-e2e --output json

# Compare different base branches
yarn ai-e2e --base-branch origin/develop --verbose
```

## Future Enhancements

- **Learning from Results**: Incorporate test results to improve future selections
- **Custom Tag Mapping**: Allow repository-specific tag selection rules
- **Performance Metrics**: Track and optimize CI execution time savings
- **Integration Expansion**: Support for additional testing frameworks and platforms
