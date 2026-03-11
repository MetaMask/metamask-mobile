---
name: pr-changelog
description: Generate a CHANGELOG entry line for a pull request from code changes. Use when the user asks to write a changelog entry, fill the changelog section of a PR, or determine if changes are user-facing.
---

# PR Changelog

## Format

```
CHANGELOG entry: <past-tense summary>
```

or

```
CHANGELOG entry: null
```

## Decision

**User-facing change?** (new feature, bug fix, UI change, behavior change visible to end users)

- Yes --> write a past-tense summary: `Added...`, `Fixed...`, `Updated...`, `Removed...`
- No --> write `null` (refactors, tests, CI, internal tooling, dev-only changes)

## Rules

- CI validates this line exists and is non-empty (`.github/scripts/check-template-and-add-labels.ts`)
- The line must contain `CHANGELOG entry:` followed by a non-empty value (leading whitespace is tolerated by CI)
- Alternative bypass: adding the `no-changelog` label skips the check entirely
- One entry per PR, even if multiple things changed -- summarize the primary user-facing impact

## Steps

1. Read the diff: `git diff main...HEAD`
2. Determine if any change is user-facing
3. If yes, write a concise past-tense summary of the primary impact
4. If no, write `null`

## Examples

**User-facing:**

```
CHANGELOG entry: Added dark mode toggle to settings screen
CHANGELOG entry: Fixed token balance not updating after swap
CHANGELOG entry: Updated network selector to show custom networks first
CHANGELOG entry: Removed deprecated fiat on-ramp provider
```

**Not user-facing:**

```
CHANGELOG entry: null
```
