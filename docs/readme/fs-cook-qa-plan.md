# FS-Cook QA Plan

Purpose: validate the new `fs-cook` / `fs-review` / `fs-fixbug` skill surfaces with real tasks before any worker-template integration.

## Why This Plan Exists

This branch proves:

- the mobile agentic runner/schema/docs improvements
- stable perps modify-sheet selectors
- a developer-first `fs-cook` core with wrapper docs

What is **not** yet proven is template-level integration. Before changing `review-pr.md` or `fix-bug.md`, we should validate that the skill surfaces work repeatedly on real tasks.

## Test Matrix

### Review tasks

Run `fs-review`-style flows against at least:

1. one already-merged PR with a visible UI path
2. one open/recent PR with mostly controller/state assertions
3. one PR where recipe generation should be skipped or downgraded honestly

### Bug-fix tasks

Run `fs-fixbug`-style flows against at least:

1. one Jira/ticket where the bug can be reproduced live
2. one Jira/ticket where the bug is only partially reproducible on the current slot
3. one case where the skill should mark the recipe blocked/untestable early instead of wasting setup

## Validation Goals

For each task, confirm:

1. run package is created visibly under `fs-cook-runs/`
2. `TASK.md` is materially rewritten
3. `SOURCE-BUNDLE.md` is usable
4. `artifacts/recipe.json` is created when appropriate
5. `artifacts/fs-cook-learning.json` is created
6. `SIGNAL.json` matches the actual outcome
7. screenshots land inside the run artifact directory when recipe steps capture them
8. learning from the run is concrete enough to feed back into the skill

## Runner Coverage

### Supported now

- Claude-backed runs are the primary supported path for this QA pass.

### Experimental

- Codex-backed runs should be sampled, but are **not** yet acceptance-gating for integration.
- A Codex failure should be recorded, not treated as a blocker for Claude-backed validation.

## Manual Execution Pattern

For review:

1. prepare from PR / text / file source
2. run `fs-cook` or `fs-review` in interactive mode
3. inspect the visible run package
4. record whether the run should be considered template-ready

For bug-fix:

1. prepare from Jira / text source
2. run `fs-cook` or `fs-fixbug` in interactive mode
3. check whether reproduction/setup logic is honest and efficient
4. record the terminal reason if blocked

## Readiness Gate For Worker Template Integration

Only consider template changes after all of these are true:

- at least 3 review-task runs succeed or block honestly
- at least 3 bug-fix-task runs succeed or block honestly
- the parent/child wait contract is stable:
  - `run-meta.json`
  - `artifacts/recipe.json`
  - `artifacts/fs-cook-learning.json`
  - `SIGNAL.json`
- no repeated hidden failure mode remains in the core skill contract
- the latest feedback-loop learnings have already been folded back into the skill

## What To Record During QA

For each task:

- task id / PR / Jira key
- slot used
- runner used
- task mode used
- outcome
- key blocker or key success signal
- whether a worker template could safely wait on this run

## Recommendation

Open the PR for this branch first.

Then run this QA plan on a handful of real review and bug-fix tasks.

Treat that QA phase as the decision gate for whether `review-pr.md` or `fix-bug.md` should delegate into `fs-cook`.
