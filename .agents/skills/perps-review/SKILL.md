---
name: perps-review
description: >
  Review a Perps pull request with deep code + domain analysis, interactive
  finding validation, and optional inline comment posting to GitHub. Use when
  the user asks to review a perps PR or invokes /perps-review <number>.
---

# Perps PR Review

Review a pull request remotely (no local checkout needed) with deep code and domain analysis, then interactively validate findings before optionally posting inline comments to GitHub.

## Phase 0 — Parse Input & Environment

Parse `$ARGUMENTS`:

- First token = **PR number** (required — abort if missing)

```bash
gh auth status
```

If `gh` is not authenticated, stop and tell the developer to run `gh auth login`.

Print: `Reviewing PR #<N>`

## Phase 1 — Fetch PR Data & Prior Reviews

Fetch diff and metadata:

```bash
gh pr diff <N> --repo MetaMask/metamask-mobile > /tmp/pr-<N>.diff
gh pr view <N> --repo MetaMask/metamask-mobile --json title,body,headRefName,changedFiles,labels,reviews,commits
```

From the metadata:

1. **Extract acceptance criteria** from the PR body — look for Gherkin blocks, structured criteria, or manual testing steps.
2. **Scan for linked Jira tickets** — patterns like `MCWP-\d+`, `PERPS-\d+` in the PR body.
3. **Analyze prior reviews:**

```bash
gh api repos/MetaMask/metamask-mobile/pulls/<N>/reviews \
  --jq '[.[] | select(.state=="CHANGES_REQUESTED") | {author: .user.login, body: .body, submitted_at: .submitted_at}]'
```

For each `CHANGES_REQUESTED` review:

- Count commits pushed **after** the review's `submitted_at` timestamp
- Classify: **addressed** (commits after review) | **unaddressed** (no commits since)
- Check if files mentioned in review comments were modified in later commits

This avoids duplicating feedback that was already given and addressed.

## Phase 2 — Build Codebase Context

Before analyzing the PR, build deep understanding of the perps architecture, team conventions, and existing patterns **from the local codebase** (on `main`). Without this context, you cannot judge whether a change is the best long-term approach.

**Note:** `CLAUDE.local.md` in the repo root is automatically loaded and provides the team's code quality standards, debugging conventions, and validation rules. Read it if you haven't already — it defines what "good code" looks like for this team.

### 2a — Read architecture & domain docs

Read these local reference files to understand the system design and where it's heading. **Read selectively based on what the PR touches** — you don't need all docs for every PR, but you must read the ones relevant to the changed code:

| Doc                                           | Read when PR touches...                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/perps/perps-architecture.md`            | **Always** — overall system design, data flow, component hierarchy                       |
| `docs/perps/perps-refactoring-plan.md`        | **Always** — active refactoring direction, what patterns are being phased out vs adopted |
| `docs/perps/perps-review-antipatterns.md`     | **Always** — known anti-patterns to check against                                        |
| `docs/perps/perps-connection-architecture.md` | WebSocket, providers, connection lifecycle                                               |
| `docs/perps/perps-caching-architecture.md`    | Data fetching, caching, invalidation                                                     |
| `docs/perps/perps-rules-decimals.md`          | Number formatting, precision, display values                                             |
| `docs/perps/perps-metametrics-reference.md`   | Analytics events, tracking properties                                                    |
| `docs/perps/perps-sentry-reference.md`        | Error tracking, trace names, spans                                                       |
| `docs/perps/perps-feature-flags.md`           | Feature gating, LaunchDarkly config                                                      |
| `docs/perps/perps-screens.md`                 | Navigation, routes, screen params, testIDs                                               |
| `docs/perps/perps-deeplinks.md`               | Deep link handling                                                                       |
| `docs/perps/perps-websocket-monitoring.md`    | WebSocket health, reconnection                                                           |

### 2b — Explore surrounding code

For each changed file in the PR, read the **local `main` version** of:

1. **The file itself** — understand the baseline before the PR's changes
2. **Sibling files** in the same directory — understand conventions and patterns in that area
3. **Imports and dependents** — trace what the changed code connects to:
   - What does it import? Read those modules to understand the interfaces being used.
   - What imports it? Search with `grep -r "from.*<module>" app/` to find consumers.
4. **Related test files** — read existing tests to understand expected behavior and coverage gaps

### 2c — Identify existing patterns

From the architecture docs and surrounding code, build a clear picture of:

- **Established patterns** for the type of change (e.g., how other selectors are structured, how other screens handle state, how other controllers expose methods)
- **Utilities and helpers** that already exist and should be reused (not reinvented)
- **Active refactoring direction** from `perps-refactoring-plan.md` — is the PR aligned with where the codebase is heading, or does it add more of a pattern being phased out? This is critical for the "best long-term fix" assessment.
- **Constants and config** already defined in `perpsConfig.ts`, `PERPS_CONSTANTS`, `ORDER_SLIPPAGE_CONFIG`, `DECIMAL_PRECISION_CONFIG`, etc. that the PR should reference instead of hardcoding values

## Phase 3 — Fetch & Classify Changed Files

Classify every changed file:

| Category         | Pattern                                                   | Notes                |
| ---------------- | --------------------------------------------------------- | -------------------- |
| React component  | `app/components/**/*.tsx`                                 | UI logic             |
| View/screen      | `app/views/**/*.tsx`                                      | Screen-level         |
| Controller       | `app/core/**/*.ts`                                        | Business logic       |
| Selector/reducer | `app/selectors/**`, `app/reducers/**`                     | State                |
| Navigation       | `app/navigation/**`                                       | Routing              |
| Style-only       | `*.styles.ts`                                             | Visual only          |
| Test file        | `**/__tests__/**`, `*.test.*`, `*.spec.*`                 | Test code            |
| Config/types     | `*.d.ts`, `*.config.*`, `*.json` (non-app)                | Config               |
| Docs             | `*.md`, `CHANGELOG`                                       | Documentation        |
| Native           | `*.m`, `*.h`, `*.java`, `*.kt`, `Podfile`, `build.gradle` | Flag: rebuild needed |

**Read every changed file in full** — not just diff hunks. Fetch from GitHub:

```bash
gh api "repos/MetaMask/metamask-mobile/contents/<path>?ref=<branch>" --jq '.content' | base64 --decode
```

Understanding full file context is critical for accurate review.

## Phase 4 — Code & Domain Analysis

### Domain Anti-Patterns

Read the local reference file `docs/perps/perps-review-antipatterns.md`. Check **every category** against the fetched code and diff, with file:line references:

- **Controller isolation** — if the PR touches `app/controllers/perps/`, this is a `must_fix` category. The controller is published as `@metamask/perps-controller` and synced to the `core` monorepo. It must remain platform-agnostic. Check for:
  - Mobile imports (`react-native`, `Engine`, `Sentry`, `DevLogger`) — all platform services must flow through `PerpsPlatformDependencies` (DI)
  - `__DEV__` usage — core replaces it with `false` during sync, breaks runtime behavior
  - New dependencies not in the DI interface — controller reaching outside its boundary (hooks, React context, mobile utilities)
  - Breaking the publisher contract — changing public API (state shape, method signatures, event names) without considering extension consumers
  - App code importing from `../../controllers/perps/` instead of `@metamask/perps-controller`
- Magic strings/numbers (use `perpsConfig.ts` constants, especially `FallbackPriceDisplay`/`FallbackDataDisplay` instead of `0`)
- Protocol abstraction (route through `AggregatedPerpsProvider` / `ProviderRouter`, no hardcoded provider names or APIs, no `if (provider === 'hyperliquid')` in UI)
- MetaMetrics events (use `PERPS_EVENT_PROPERTY.*` / `PERPS_EVENT_VALUE.*` constants, not magic strings)
- Sentry tracing (`usePerpsMeasurement`, `ensureError()`, `endTrace` in finally)
- Connection & WebSocket (`manageLifecycle={false}`, throttled subscriptions, ref counting)
- Data flow & state (go through hooks, verify `accountState`, handle stale data after async)
- Trade flow (pre-trade checks, post-trade refresh, slippage handling)
- Agentic testability (testIDs on interactive elements, centralize in `Perps.testIds.ts`)

### Fix Quality Assessment

For each non-trivial code change, evaluate:

**Best approach:**

- Is this the minimal, most correct fix? Or is there a simpler/more elegant approach?
- Distinguish "best long-term fix" vs "pragmatic fix for this PR" — document both if they differ
- Would you ship this? If not, state what and why

**Test quality:**

- Do tests assert the _right thing_, not just pass?
- Are failure paths tested?
- Could tests pass even if the fix is reverted? If yes, tests are insufficient

**Brittleness:**

- Does the fix rely on import-time evaluation, module-level constants, or frozen values?
- Does it create mock coupling?
- Does it leave the data model "confusing and easy to break again"?

### File Size Guardrail

For each file touched by the PR, count total lines from the fetched content:

| Lines                       | Severity     | Action                                                   |
| --------------------------- | ------------ | -------------------------------------------------------- |
| >2,500                      | `must_fix`   | Exceeds hard limit — PR must refactor/split before merge |
| >2,000                      | `suggestion` | Approaching limit — recommend a split plan               |
| >1,500 + PR adds >100 lines | `suggestion` | Trending toward limit — flag growth                      |

### Validate Concerns Before Flagging

Before writing any "could this break X?" concern into the review:

- Read the actual function/code path — trace through the logic with concrete values
- Only include the concern if it survives this validation
- **Unvalidated speculative concerns create noise for human reviewers.** A concern that could have been resolved with a code read should never appear in the final review.

## Phase 5 — Generate Review Report

Write to `.agent/reviews/pr-<N>.md` (create `.agent/reviews/` if it does not exist):

```markdown
# PR Review: #<N> — <title>

## Summary

<what the PR does, whether it achieves its stated goal>

## Prior Reviews

| Reviewer | State             | Date   | Addressed?            | Notes     |
| -------- | ----------------- | ------ | --------------------- | --------- |
| <login>  | CHANGES_REQUESTED | <date> | addressed/unaddressed | <details> |

_If no prior reviews exist, write "No prior reviews."_

## Acceptance Criteria Validation

| #   | Criterion | Status            | Evidence                  |
| --- | --------- | ----------------- | ------------------------- |
| 1   | <AC text> | PASS/FAIL/SKIPPED | <code analysis reference> |

## Code Quality

- Pattern adherence: <follows/deviates from codebase conventions>
- Complexity: <appropriate/over-engineered/too-simple>
- Type safety: <any type issues?>
- Error handling: <adequate/missing>
- Anti-pattern findings: <with file:line refs>

## Fix Quality

- **Best approach:** <is this the best fix? pragmatic vs ideal if they differ>
- **Would not ship:** <items that should block merge, with file:line and reason>
- **Test quality:** <are tests testing the right thing? failure paths covered?>
- **Brittleness:** <runtime fragility, mock coupling, import-time constants>

## Correctness

- Diff vs stated goal: <aligned/misaligned>
- Edge cases: <covered/uncovered — list specific ones>
- Race conditions: <none/potential — describe>
- Backward compatibility: <preserved/broken>

## Architecture & Domain

<scaling implications, pattern adherence, perps-specific concerns>

## Risk Assessment

- [LOW | MEDIUM | HIGH] — <rationale>

## Recommended Action

[APPROVE | REQUEST_CHANGES | COMMENT]
<specific items to address, with file:line references>
```

## Phase 6 — Interactive Comment Validation

This is the interactive phase where the developer curates the findings.

### 5a — Build findings list

Collect all file:line findings from Phase 4 into a structured list:

- index number
- path (relative to repo root)
- line number (must be a line changed/added in the diff)
- body (self-contained: what's wrong, why, what to do)
- severity: `must_fix` | `suggestion` | `nitpick`

Severity guide:

- **must_fix**: correctness bug, would-not-ship blocker, brittleness that will break again
- **suggestion**: better approach exists, test quality improvement, pragmatic vs ideal gap
- **nitpick**: style, naming, minor simplification

### 5b — Present findings

Display findings grouped by severity:

```
## Review Findings — N comments (M must_fix, S suggestion, P nitpick)

Recommended action: APPROVE | COMMENT | REQUEST_CHANGES

| # | Severity   | File                         | Line | Finding                  |
|---|------------|------------------------------|------|--------------------------|
| 1 | must_fix   | app/core/PerpsController.ts  | 42   | Missing null check on... |
| 2 | suggestion | app/views/TradeScreen.tsx     | 115  | Consider PERPS_CONST...  |
| 3 | nitpick    | app/selectors/positions.ts   | 23   | Rename getData to get... |
```

For each finding, show:

- The **full comment body** (not just the truncated table cell)
- **Diff context** (3-5 lines around the target line from the diff)

Then present available actions:

- **approve all** — keep all comments as-is
- **drop N,M** — remove specific comments by number
- **edit N: new text** — modify a comment's body
- **drop all nitpicks** — remove all comments of a severity level
- **add path:line body** — add a new comment

### 5c — Process edits

Apply the developer's changes. If any modifications were made, re-display the updated table and confirm: "Final comment list has N comments. Proceed?"

## Phase 7 — Post to GitHub

Ask the developer: **"Post these N inline comments to PR #<N> on GitHub? (yes/no)"**

### If yes:

Build a review payload and post as a single review:

```bash
unset GH_TOKEN && gh api repos/MetaMask/metamask-mobile/pulls/<N>/reviews \
  -X POST \
  -f event="COMMENT" \
  -f body="<1-2 sentence summary>" \
  --input /tmp/review-comments-<N>.json
```

Where the JSON input contains:

```json
{
  "event": "COMMENT",
  "body": "<summary>",
  "comments": [
    {
      "path": "app/components/Perps/Foo.tsx",
      "line": 42,
      "body": "<self-contained comment>"
    }
  ]
}
```

**Critical rules for posting:**

- **Always `event: "COMMENT"`** — never APPROVE or REQUEST_CHANGES. The approval decision belongs to the developer alone.
- **`unset GH_TOKEN`** before the `gh api` call (falls back to keyring token with write scope).
- **`line` must exist in the diff** — it must reference an added or changed line. Verify each line number against the diff before posting.

### If no:

Print: "Comments not posted. Review saved to `.agent/reviews/pr-<N>.md`"

## Phase 8 — Final Summary

```
=== REVIEW COMPLETE ===
PR: #<N> — <title>
Risk: <level>
Comments: N (M must_fix, S suggestion, P nitpick)
Posted to GitHub: yes/no
Report: .agent/reviews/pr-<N>.md
Recommendation: APPROVE | COMMENT | REQUEST_CHANGES
=======================
```

---

## Rules

1. **Read-only** — no commits, no pushes, no code changes to the repo.
2. **Never mention Claude, AI, or LLM** in review content or GitHub comments.
3. **Always post as COMMENT** — never APPROVE or REQUEST_CHANGES. The approval decision belongs to the developer.
4. **Validate before flagging** — trace code paths with concrete values before writing speculative concerns. Unvalidated concerns are noise.
5. **`unset GH_TOKEN`** before any `gh` write operation.
6. **Self-contained comments** — each inline comment must explain what is wrong, why it matters, and what to do. No cross-references between comments.
