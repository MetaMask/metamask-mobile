---
name: fs-fixbug
description: Developer-facing wrapper for fs-cook focused on bug reproduction/fix proof recipes
---

# FS-Fixbug

`fs-fixbug` is a thin wrapper around `fs-cook` for bug-fix recipe generation.

Use it when a developer wants to say something like:

- `/fs-fixbug I am solving JIRA https://... can you make a recipe to prove the solution autonomously`
- `/fs-fixbug reproduce this bug and build a validation recipe`

## Purpose

Keep `fs-cook` as the core engine, but give bug-fix workflows their own developer-facing wrapper and defaults.

## How It Maps To FS-Cook

1. prepare the run from Jira, text, or file source material
2. create a visible run package with `TASK.md` + `SOURCE-BUNDLE.md`
3. run `fs-cook` in autonomous or interactive mode

## Current Manual Invocation

From Jira:

```bash
node .agents/skills/fs-cook/scripts/prepare-cooking-run.js \
  --repo-root "$(pwd)" \
  --source-kind jira \
  --source-ref TAT-2946 \
  --jira-base-url "$JIRA_BASE_URL" \
  --jira-email "$JIRA_EMAIL" \
  --jira-token "$CONSENSYS_ATLASSIAN_API_TOKEN"
```

From free text:

```bash
node .agents/skills/fs-cook/scripts/prepare-cooking-run.js \
  --repo-root "$(pwd)" \
  --source-kind text \
  --source-ref bug-note \
  --source-text "Reverse position order fails because stale entry price is passed as currentPrice"
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

Longer-term, this wrapper should infer the right source-kind and source-ref from a developer’s message and delegate into `fs-cook` without exposing the raw prep flags unless the developer wants them.
