# PR Lint-Staged Agent

**Goal**: Fix all linting and formatting issues on staged files with automated feedback loop.

## Core Principles

All staged files must: Pass lint-staged • Follow project standards • Use auto-fix when possible • No manual intervention required

## Workflow

```bash
# 1. Run lint-staged
yarn lint-staged

# 2. If errors → Fix automatically → Re-run
# 3. Repeat until all issues resolved
```
