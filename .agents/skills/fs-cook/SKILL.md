---
name: fs-cook
description: Build a validation recipe from PR intent, ticket ACs, or investigation findings
compatibility: Designed for agent runners with Markdown skill loading, Bash access, git diff visibility, and repo-local recipe validation runners when available
metadata:
  package: fs-cook
  version: 0.1.0
  loop_model: inner-run-cook plus validator-run-refine
  outputs: artifacts/recipe.json artifacts/recipe-cook.json artifacts/fs-cook-learning.json
allowed-tools: Bash(rg:*) Bash(node:*) Bash(git:*) Read Write
---

# FS-Cook

Turn PR intent, ticket acceptance criteria, or investigation findings into a validation recipe.

This is an LLM skill.
Do not treat it as deterministic templating.

Use [references/TASK.md](references/TASK.md) as the immutable harness template.
[TASK.md](TASK.md) remains the compatibility harness path for runners that expect a package-root task file.
For each run, materialize a fresh `TASK.md` beside the run artifacts and work through that copy top-to-bottom.
File-first is the default pattern. The launcher prompt should be small; the real instructions live in the run-local `TASK.md`.
Do not stop after writing a recipe file.
See [the validator loop reference](references/VALIDATOR-LOOP.md) when you need the versioning and experiment artifacts beyond a single cooking run.

When this skill is injected into a target repo, prefer a repo-local install path like `.agents/skills/fs-cook/`.
Keep that path local-only via `.git/info/exclude` or the repo's existing local exclude pattern, not by editing the shared `.gitignore`.
When running inside a target repo, prefer repo-local validator/runtime discovery first; Farmslot slot lookup is only the experiment-harness fallback.

## Execution Modes

Treat `fs-cook` as one core skill with multiple execution surfaces:

- **Interactive / farmslot mode**: preferred when a live slot, tmux pane, or human-observable debugging loop exists. In this mode, keep going until the recipe is written, the run-local `TASK.md` is fully rewritten from the template, and every available validation command has been executed or explicitly marked unavailable with a real reason.
- **Interactive / developer mode**: use when a human may want to steer the recipe as it takes shape. In this mode, surface material uncertainties as explicit feedback checkpoints inside the run-local task file instead of silently guessing past them. Keep moving on low-risk steps, but when a decision would materially change the recipe graph or proof story, write the question into the task artifact and make the uncertainty visible.
- **Batch mode**: useful for unattended benchmark reruns and validator-comparison loops. Batch mode is optional. It does not lower the completion bar.

If an interactive slot exists, do not stop after pasting or emitting JSON in chat. The point is to drive the run-local workspace to completion.
If the selected task mode is interactive, the point is to make the reasoning and open questions inspectable, not to hide them in one-shot output.

## When To Use

- Current PR has no recipe and needs reviewable validation proof
- Existing recipe is weak, stale, or does not cover the real acceptance criteria
- You have investigation findings and want to turn them into a reproducible recipe
- You need before/after visual proof or explicit state proof for a change

## Workflow

1. Copy `references/TASK.md` into the run-local workspace as `TASK.md` and fill the `## Task` block there.
2. Gather the real source of truth.
3. Enumerate acceptance criteria before recipe drafting.
4. Extract proof targets.
5. Decide `state` / `visual` / `mixed` per target.
6. Discover reuse before invention.
7. Draft the recipe.
8. Rewrite the run-local `TASK.md` from the template into a real task artifact.
9. Run schema validation when available.
10. Run runner dry-run validation when available.
11. Run the strongest honest live validation path when available.
12. Audit resolved vs unresolved targets.
13. Only then mark completion.

The harness order is mandatory.
Do not silently batch or skip steps.
Mark each completed checklist step `[x]` immediately. Do not batch checkbox updates.

## Output Contract

Preferred outputs when the workflow/task has an artifacts directory:

- `artifacts/recipe.json`
- `artifacts/recipe-cook.json`

`recipe.json` should own:

- executable workflow
- claim-to-proof linkage
- proof steps

`recipe-cook.json` should own:

- resolved targets
- unresolved targets
- proof mode by target
- degrade reason when relevant

If the current runner/tooling does not use sidecar metadata yet, still write the recipe and include unresolved/proof-mode notes in the report or task artifact.

Completion requires:

- recipe artifact written
- run-local `TASK.md` materially rewritten from the template
- learning artifact written
- unresolved-target audit written
- validation evidence recorded
- all required proof targets either `PROVEN` or explicitly non-applicable by contract
- `STATUS: done` in the run-local copied `TASK.md`

## Hard Rules

- Do not fake proof for vague claims
- Do not emit canonical success output if every target is unresolved
- Do not prefer screenshots when state proof is enough
- Do not skip screenshots when the claim is visual or review-sensitive
- Do not rebuild known flows as raw steps when `call` exists
- Do not stop after printing a recipe or JSON payload if writable artifacts and validation surfaces still exist
- Do not leave the copied `TASK.md` as the untouched template
- Do not write `SIGNAL.json` with `complete/success` when a required validation failed or when a required proof target remains `UNRESOLVED`
- For `wait_for` nodes, use canonical runner field names such as `timeout_ms` and `poll_ms`. Do not invent `timeout` unless the target runner explicitly documents that alias.
- In interactive mode, do not silently guess through a material ambiguity. Record the checkpoint in the task artifact so a developer can respond.
- Do not edit `fs-cook/SKILL.md`, `fs-cook/references/TASK.md`, or `fs-cook/repos/*.md` during the cooking run

## Common Pitfalls

| Pitfall                                                            | Correct Pattern                                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Treating cooking as deterministic templating                       | Treat it as LLM synthesis constrained by repo flows/evals and honest proof                           |
| Using the whole PR description as one target                       | Extract small executable proof targets                                                               |
| Defaulting every UI claim to screenshots only                      | choose `visual` or `mixed` deliberately                                                              |
| Defaulting every non-visual claim to a screenshot anyway           | prefer state/log/trace proof                                                                         |
| Rewriting long repeated setup chains                               | reuse `call` flows                                                                                   |
| Forcing a canonical recipe when the claim is unresolved            | stop or emit only resolved targets with explicit gaps                                                |
| Treating interactive farmslot execution like chat-only drafting    | keep driving the workspace until artifacts + validation evidence exist                               |
| Writing recipe artifacts but forgetting the copied `TASK.md`       | rewrite the task file and update `STATUS` / evidence sections before stopping                        |
| Inventing non-canonical runner fields like `timeout` on `wait_for` | use documented runner field names such as `timeout_ms` so live validation honors the intended timing |

## Stop Conditions

Stop and report instead of forcing a recipe when:

- target text is still too ambiguous to map honestly
- repo has no viable flow/eval/native interaction path for the claim
- current runner context is missing and the missing context changes what should be proven
- the repo has no validation runner and you already recorded `validation unavailable`

Do **not** stop merely because the model has drafted a plausible recipe in chat. Drafting is not completion.

## Required Response Sections

1. `Proof Targets`
2. `Resolved vs Unresolved`
3. `Proof Mode Decisions`
4. `Recipe Plan`
5. `Validation Commands`

## Harness Rule

If the current repo has an `fs-cook` harness, execute through it.
If the harness is copied into a task/work directory, keep the same sections and checklist order.
