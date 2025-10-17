# AI E2E Testing System

## Overview

The AI E2E Testing system is an intelligent test selection mechanism that analyzes code changes in pull requests and automatically recommends which End-to-End (E2E) smoke tests should be executed. The system runs in **analysis-only mode** by default, providing test recommendations as PR comments without triggering actual test execution.

## How It Works

### Automatic Analysis on Every PR

The system runs automatically on every pull request:

1. **File Detection**: The `needs-e2e-build` job detects changed files
2. **AI Analysis**: The `ai-e2e-analysis` job analyzes changes using Claude AI
4. **Test Matrix**: A test matrix is generated (available for future use)

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