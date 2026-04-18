# FS-Review / FS-Fixbug Handover

Date: 2026-04-18

## What Is Already Done

### Merged mobile-only PR

The first scoped PR is already merged:

- PR: [#28974](https://github.com/MetaMask/metamask-mobile/pull/28974)

That PR included only:

- stable Perps modify-action selectors in app code
- stricter mobile agentic schema/validator behavior
- screenshot copy into explicit artifact roots
- mobile agentic README clarification

It intentionally did **not** include:

- `.agents/skills/fs-cook`
- wrapper skill work
- worker-template integration
- `TRACKER.md`

### Wrapper branch

Current branch for follow-on work:

- `wip/mm4-fs-review-wrapper`

This branch contains:

- local `fs-cook` core
- `fs-review` wrapper skill
- `fs-fixbug` wrapper skill
- developer-first docs
- interactive task mode
- local skill versioning
- delegation simulation notes
- QA plan

## Current Product Direction

Recommended structure:

- `fs-cook` = generic core recipe engine
- `fs-review` = developer-facing PR review wrapper
- `fs-fixbug` = developer-facing bug-fix / reproduction wrapper

Important:

- wrappers should reuse the core artifact contract
- wrappers should stay interactive by default
- worker-template integration stays out of scope until the wrappers are manually benchmarked

## What We Validated

### Claude path

Validated enough for manual/developer use:

- visible run packages under `fs-cook-runs/`
- interactive and autonomous task modes
- version recorded in `run-meta.json`
- manual delegation simulation works as a parent/child contract

### Codex path

Validated partially:

- direct `codex exec` works
- local runner can launch and scaffold Codex-backed runs
- full batch terminal parity with Claude is **not** yet proven

Conclusion:

- use Claude as the supported runner for wrapper benchmarking
- treat Codex as experimental until a real terminal delegated run completes reliably

## Next Recommended Step

Use this branch to benchmark wrapper quality against existing Farmslot outputs before changing any worker templates.

Benchmark plan:

- [docs/readme/fs-review-benchmark-plan.md](./fs-review-benchmark-plan.md)

First benchmark set:

1. Review PR `28176` through `fs-review`
2. Review PR `28318` through `fs-review`
3. Run Jira `TAT-2971` through `fs-fixbug`

Compare against the existing Farmslot artifacts, especially:

- AC extraction quality
- proof target quality
- recipe decision quality
- blocker honesty
- review/report usefulness to a developer
- domain anti-pattern coverage

## Domain Knowledge To Carry Into FS-Review

`fs-review` should mirror the review intelligence from the Farmslot worker template, but in a lighter, developer-facing, interactive form.

High-value knowledge sources:

- `projects/metamask-mobile-farm/templates/worker/review-pr.md`
- `docs/perps/perps-review-antipatterns.md`

The goal is **not** to copy the whole worker template verbatim.
The goal is to inherit:

- PR parsing defaults
- AC derivation habits
- tiered evidence logic
- prior-review awareness
- mobile/perps anti-pattern review knowledge

## What Not To Do Yet

Do not:

- modify `review-pr.md`
- modify `fix-bug.md`
- integrate wrapper skills into worker templates
- treat Codex batch runs as template-ready

Those changes should wait until the wrapper benchmark plan has been executed and the parent/child wait contract is proven stable on multiple real tasks.

## Expected Outputs Of The Next Phase

For each benchmark task, preserve:

- `TASK.md`
- `SOURCE-BUNDLE.md`
- `run-meta.json`
- `artifacts/recipe.json` when appropriate
- `artifacts/fs-cook-learning.json`
- `SIGNAL.json`

And add a comparison note against the Farmslot baseline:

- matched / improved / regressed

## Current Local-Only Artifacts

Still intentionally untracked:

- `TASK.md`
- `fs-cook-runs/`

Keep them out of commits unless a future change explicitly decides otherwise.
