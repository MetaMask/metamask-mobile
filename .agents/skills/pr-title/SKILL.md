---
name: pr-title
description: Generate a conventional commit PR title from git diff analysis. Use when the user asks to generate a PR title, write a pull request title, or create a conventional commit title for a branch.
---

# PR Title

## Format

```
<type>[optional scope]: <description>
```

- Max 72 characters total
- Imperative mood ("add", not "added" or "adds")
- No ticket/issue numbers (those belong in the PR description)
- Lowercase type and scope

## Types

| Type       | When to use                                  |
| ---------- | -------------------------------------------- |
| `feat`     | New feature or enhancement                   |
| `fix`      | Bug fix                                      |
| `refactor` | Code restructuring without behavior change   |
| `chore`    | Maintenance (dependencies, configs, scripts) |
| `test`     | Adding or updating tests                     |
| `docs`     | Documentation changes                        |
| `perf`     | Performance improvements                     |
| `style`    | Code style/formatting (no logic change)      |
| `ci`       | CI/CD pipeline changes                       |
| `build`    | Build system or external dependency changes  |
| `revert`   | Reverting a previous commit                  |

## Scope

Optional. Infer from the primary folder or feature area being modified.

Infer the scope from the primary feature area or directory being modified. Any meaningful area in the repo is a valid scope.

**Common scopes** (non-exhaustive): `analytics`, `transactions`, `wallet`, `ui`, `network`, `settings`, `permissions`, `tokens`, `nfts`, `swaps`, `bridge`, `staking`, `onboarding`, `confirmations`, `agents`, `e2e`, `deps`, `ramp`, `earn`, `perps`, `predict`, `notifications`, `accounts`

**Avoid**: Generic scopes like `app`, `src`, `components` that don't convey meaning.

**When to omit**: If changes span multiple unrelated areas, omit scope entirely.

## Steps

1. Get the branch name: `git rev-parse --abbrev-ref HEAD`
2. Get the full diff: `git diff main...HEAD`
3. Determine the **type** from the nature of the changes
4. Infer a **scope** from the primary folder/feature being modified (omit if ambiguous)
5. Write a concise **description** in imperative mood

## Examples

```
feat(predict): add market details view
fix(transactions): resolve memory leak in controller
refactor(analytics): migrate rewards tracking to useAnalytics hook
chore(deps): update @metamask/controller-utils to v5.0.0
test(onboarding): add e2e spec for SRP import flow
docs(staking): update pooled staking integration guide
perf(wallet): lazy-load token list on scroll
style(ui): apply design system tokens to network selector
ci: add conventional commit validation to PR checks
revert: undo NFT gallery feature flag removal
```

## CI Validation

PR titles are validated by the `amannn/action-semantic-pull-request` GitHub Action (`.github/workflows/pr-title-linter.yml`). Titles that don't follow Conventional Commits format will fail CI.
