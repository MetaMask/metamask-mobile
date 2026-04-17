# FS-Cook Usage

This repo carries a local `fs-cook` skill bundle under:

```text
.agents/skills/fs-cook/
```

It is intended for recipe-building and validation-proof work against MetaMask Mobile, especially on isolated slots like `mm-4`.

## What FS-Cook Produces

A run creates a visible package under `fs-cook-runs/` containing:

- `TASK.md`
- `SOURCE-BUNDLE.md`
- `run-meta.json`
- `artifacts/recipe.json`
- `artifacts/fs-cook-learning.json`
- `SIGNAL.json` on terminal runs

These artifacts are the contract a parent worker or developer can inspect.

## Modes

### 1. Standard / Autonomous

Use this when you want the skill to drive the whole recipe-building loop to terminal state:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js \
  --scenario mobile-review-28897 \
  --scenario-config /Users/deeeed/dev/farmslot-wt/farmslot-1/.omx/scenarios/fs-cook-mobile.json \
  --runner claude \
  --model sonnet
```

This defaults to:

- visible run folders under `fs-cook-runs/`
- live-slot detection for mobile
- autonomous task handling

### 2. Interactive / Developer Mode

Use this when a developer may want to inspect progress notes, blockers, and decisions in the task file:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js \
  --scenario mobile-review-28897 \
  --scenario-config /Users/deeeed/dev/farmslot-wt/farmslot-1/.omx/scenarios/fs-cook-mobile.json \
  --runner claude \
  --model sonnet \
  --task-mode interactive
```

This uses the interactive template:

```text
.agents/skills/fs-cook/references/TASK.interactive.md
```

Interactive mode is meant for developer-in-the-loop usage, not just batch completion. It encourages:

- visible progress notes
- explicit blockers
- feedback checkpoints for material uncertainty

## Manual Worker-Style Simulation

Before wiring `fs-cook` into any farm worker template, simulate the delegation manually.

The parent/child contract we validated is:

1. call `run-cooking-lane.js`
2. wait for the run package under `fs-cook-runs/...`
3. inspect:
   - `artifacts/recipe.json`
   - `artifacts/fs-cook-learning.json`
   - `SIGNAL.json` (on terminal runs)
   - `run-meta.json`

This proves the delegated sub-task shape without changing `review-pr.md` or `fix-bug.md`.

## Mobile-Specific Guidance

For MetaMask Mobile recipes:

- pass `ARTIFACT_DIR` to `validate-recipe.sh`, not `TASK_DIR`
- use `timeout_ms` / `poll_ms` on `wait_for`
- `wait_for` with `expression` must also include `assert`
- if live slot state already has a relevant position, reuse it instead of forcing `trade-open-market`
- screenshots now copy into the passed artifact directory

## Supported Runners

### Claude

This is the currently validated delegated path for real fs-cook runs.

### Codex

The local runner can launch Codex and scaffold a visible run package.

Current status:

- launch/scaffold: validated
- full terminal batch parity with Claude: not yet validated

So Codex should still be treated as experimental for delegated `fs-cook` batch usage until a real terminal run completes reliably under the Codex path.

## Versioning

The local `fs-cook` skill contract is versioned:

```text
.agents/skills/fs-cook/VERSION
```

The runner records that version in:

- `run-meta.json`

This makes it possible to tell which local skill contract produced a given run.
