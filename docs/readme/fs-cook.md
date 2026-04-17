# FS-Cook, FS-Review, and FS-Fixbug

This repo carries a local recipe-building skill stack under:

```text
.agents/skills/
```

Recommended mental model:

- `fs-cook` = generic core recipe engine
- `fs-review` = thin PR review wrapper over `fs-cook`
- `fs-fixbug` = thin bug-fix / reproduction wrapper over `fs-cook`

The goal is to make manual developer use easy first, before any worker-template integration.

## What The Core Engine Produces

A run creates a visible package under `fs-cook-runs/` containing:

- `TASK.md`
- `SOURCE-BUNDLE.md`
- `run-meta.json`
- `artifacts/recipe.json`
- `artifacts/fs-cook-learning.json`
- `SIGNAL.json` on terminal runs

These files are the contract a developer or parent worker can inspect.

## One Core Template Or Many?

Current direction:

- keep **one generic core engine**
- keep **two task modes**:
  - `standard`
  - `interactive`
- use wrapper entry surfaces to specialize for review vs bug-fix use cases

That means we do **not** need a different engine for every workflow.
Instead:

- `fs-cook` stays generic
- wrappers such as `fs-review` and `fs-fixbug` choose the source material and defaults

## Developer-First Usage

### PR Review

Prepare a run from a PR:

```bash
node .agents/skills/fs-cook/scripts/prepare-cooking-run.js \
  --repo-root "$(pwd)" \
  --source-kind pr \
  --source-ref 28897 \
  --gh-repo MetaMask/metamask-mobile
```

Then run `fs-cook` on the prepared task:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js \
  --scenario mobile-review-28897 \
  --scenario-config /Users/deeeed/dev/farmslot-wt/farmslot-1/.omx/scenarios/fs-cook-mobile.json \
  --runner claude \
  --model sonnet \
  --task-mode interactive
```

### Bug Fix / Jira

Prepare a run from Jira:

```bash
node .agents/skills/fs-cook/scripts/prepare-cooking-run.js \
  --repo-root "$(pwd)" \
  --source-kind jira \
  --source-ref TAT-2946 \
  --jira-base-url "$JIRA_BASE_URL" \
  --jira-email "$JIRA_EMAIL" \
  --jira-token "$CONSENSYS_ATLASSIAN_API_TOKEN"
```

Or from free text:

```bash
node .agents/skills/fs-cook/scripts/prepare-cooking-run.js \
  --repo-root "$(pwd)" \
  --source-kind text \
  --source-ref bug-note \
  --source-text "Reverse position order fails because stale entry price is passed as currentPrice"
```

Then run `fs-cook`:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js \
  --scenario mobile-review-28897 \
  --scenario-config /Users/deeeed/dev/farmslot-wt/farmslot-1/.omx/scenarios/fs-cook-mobile.json \
  --runner claude \
  --model sonnet \
  --task-mode interactive
```

## Task Modes

### `standard`

Use when you want the skill to drive the full loop autonomously:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js ... --task-mode standard
```

Think of this like launching a sub-agent with the skill and expecting terminal artifacts.

### `interactive`

Use when a developer may want to steer the recipe as it evolves:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js ... --task-mode interactive
```

This uses:

```text
.agents/skills/fs-cook/references/TASK.interactive.md
```

It emphasizes:

- progress notes
- blockers
- visible decisions
- feedback checkpoints

## Manual Delegation Simulation

Before touching any worker templates, validate delegation manually.

The parent/child contract we proved is:

1. launch `run-cooking-lane.js`
2. wait for the visible run package under `fs-cook-runs/...`
3. inspect:
   - `artifacts/recipe.json`
   - `artifacts/fs-cook-learning.json`
   - `SIGNAL.json`
   - `run-meta.json`

Validated example:

- `fs-cook-runs/worker-review-sim-20260417T200722`

## Wrapper Skills

The branch now includes local wrapper skill docs:

- `.agents/skills/fs-review/SKILL.md`
- `.agents/skills/fs-fixbug/SKILL.md`

These are intentionally thin wrappers around `fs-cook`.

Their role is:

- easier developer entry
- source-kind defaults
- clearer wording for review vs bug-fix usage

## Mobile-Specific Guidance

For MetaMask Mobile recipes:

- pass `ARTIFACT_DIR` to `validate-recipe.sh`, not `TASK_DIR`
- use `timeout_ms` / `poll_ms` on `wait_for`
- `wait_for` with `expression` must include `assert`
- if live slot state already has a relevant position, reuse it instead of forcing `trade-open-market`
- screenshots copy into the passed artifact directory

## Supported Runners

### Claude

This is the currently validated delegated path for real `fs-cook` runs.

### Codex

Current state:

- direct `codex exec` works
- local `fs-cook` runner can launch/scaffold Codex runs
- full terminal batch parity with Claude is **not yet validated**

So Codex should still be treated as experimental for delegated `fs-cook` batch use.

## Versioning

The local `fs-cook` skill contract is versioned:

```text
.agents/skills/fs-cook/VERSION
```

The runner records that version in:

- `run-meta.json`

Current local skill version:

```text
0.2.0
```
