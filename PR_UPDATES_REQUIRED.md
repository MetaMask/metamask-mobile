# PR Updates Required to Pass CI Checks

## 1. Update PR Title

**Current Title:**
```
Invalid iOS app artifacts
```

**Required Title (add `ci:` prefix):**
```
ci: fix invalid iOS app artifacts causing E2E test failures
```

**Command to update:**
```bash
gh pr edit 26631 --title "ci: fix invalid iOS app artifacts causing E2E test failures"
```

## 2. Update PR Description

**Add this CHANGELOG entry line** to the PR description (add it after the first paragraph):

```
CHANGELOG entry: Fixed iOS E2E test failures caused by nested artifact directory structure from actions/download-artifact@v4.
```

**Complete Updated PR Description:**

```markdown
Fixes iOS E2E test failures by correcting the downloaded app bundle path and adding validation for iOS artifacts.

CHANGELOG entry: Fixed iOS E2E test failures caused by nested artifact directory structure from actions/download-artifact@v4.

## Problem

The `actions/download-artifact@v4` action creates an extra directory with the artifact name, leading to a nested `.app` bundle structure (`artifacts/artifact-name/app-name.app`). Detox expects the `.app` bundle directly (`artifacts/app-name.app`), causing `xcrun simctl install` to fail with "Unable to Install MetaMask" errors.

## Solution

This PR implements three layers of defense:

1. **Pre-upload validation**: Verify app bundle integrity before uploading artifacts
2. **Post-download extraction**: Move downloaded bundle from nested structure to expected location  
3. **Post-repack validation**: Ensure repack process doesn't corrupt the bundle

## Changes

- Added iOS app bundle validation before artifact upload in `build-ios-e2e.yml`
- Added artifact extraction step to handle nested directory structure in `run-e2e-workflow.yml`
- Added validation after repack operations to catch corruption early
- Fixed Flask workflow to handle both nested and direct artifact structures

---
[Slack Thread](https://consensys.slack.com/archives/C08388MPZ9V/p1772094865378009?thread_ts=1772094865.378009&cid=C08388MPZ9V)
```

## How to Apply

You can either:

### Option A: Use GitHub CLI (if you have write permissions)
```bash
gh pr edit 26631 --title "ci: fix invalid iOS app artifacts causing E2E test failures"
```

Then manually edit the PR description on GitHub web interface to add the CHANGELOG entry line.

### Option B: Update via GitHub Web Interface

1. Go to https://github.com/MetaMask/metamask-mobile/pull/26631
2. Click "Edit" next to the PR title
3. Update title to: `ci: fix invalid iOS app artifacts causing E2E test failures`
4. Click "Edit" in the description section
5. Add the CHANGELOG entry line after the first paragraph

## Why These Changes Are Needed

- **PR Title**: MetaMask requires conventional commit format for PRs. Since these are CI workflow changes, the prefix should be `ci:`
- **CHANGELOG Entry**: Required by the PR template check to ensure all changes are documented

Once these updates are applied, the CI checks should pass.
