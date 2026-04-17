---
name: fs-review
description: Developer-facing wrapper for fs-cook focused on PR review recipe generation
---

# FS-Review

`fs-review` is a thin wrapper around `fs-cook` for PR review work.

Use it when a developer wants to say something like:

- `/fs-review PR 28897 on this branch`
- `/fs-review validate this review PR with a recipe`

## Purpose

Keep `fs-cook` as the generic recipe engine, but give PR review a simpler developer-facing entry surface.

## How It Maps To FS-Cook

1. prepare the run from PR source material
2. create a visible run package with `TASK.md` + `SOURCE-BUNDLE.md`
3. run `fs-cook` in either autonomous or interactive mode

## Current Manual Invocation

Prepare the run:

```bash
node .agents/skills/fs-cook/scripts/prepare-cooking-run.js \
  --repo-root "$(pwd)" \
  --source-kind pr \
  --source-ref 28897 \
  --gh-repo MetaMask/metamask-mobile
```

Then cook the recipe:

```bash
node .agents/skills/fs-cook/scripts/run-cooking-lane.js \
  --scenario mobile-review-28897 \
  --scenario-config /Users/deeeed/dev/farmslot-wt/farmslot-1/.omx/scenarios/fs-cook-mobile.json \
  --runner claude \
  --model sonnet \
  --task-mode interactive
```

## Intended UX

Longer-term, this wrapper should infer the right `prepare-cooking-run.js` parameters from a developer request and forward the work into `fs-cook` without making the developer think in raw source-kind flags.
