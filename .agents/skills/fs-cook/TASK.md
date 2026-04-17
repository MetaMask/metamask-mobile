# FS-Cook Task

> Compatibility harness path for runners that expect `fs-cook/TASK.md`.
> The immutable template lives at `references/TASK.md`.
> For each run, copy `references/TASK.md` into the run-local workspace as `TASK.md` before editing it.

## Task

```text
TARGET_REPO:
SOURCE_KIND:
SOURCE_REF:
ARTIFACT_DIR:
VALIDATION_MODE:
STATUS: pending
```

## Source Material

Paste or summarize:

- PR body
- linked ticket ACs / expected behavior
- investigation findings
- existing recipe / flow / eval refs

## Acceptance Criteria

If structured ACs exist, enumerate them verbatim.
If they do not, derive a numbered canonical list from the source material before proceeding.

## Proof Targets

One executable claim per line.
Every target must map to an AC number or be explicitly marked as investigation-only.

## Proof Mode Decisions

For each proof target, choose exactly one:

- `state`
- `visual`
- `mixed`

If `mixed`, explain why both matter.

## Resolved vs Unresolved

List:

- resolved targets
- unresolved targets
- why any unresolved target could not be covered honestly

## Recipe Coverage Audit

Map:

- AC / finding
- recipe node(s)
- proof mode
- screenshot required? yes/no
- status: `PROVEN` | `UNRESOLVED` | `UNTESTABLE`

## Validation Evidence

Record:

- schema validation command
- runner dry-run command
- live-run command if used
- output or explicit `validation unavailable`

## Learning Artifact

Write:

- `artifacts/fs-cook-learning.json`

It must include:

- scenario type
- recipe paths
- evidence verdict
- proposed next delta
- touched files from the cooking run

## Checklist

- [ ] **1. Fill the task block** — set `TARGET_REPO`, `SOURCE_KIND`, `SOURCE_REF`, `ARTIFACT_DIR`, `VALIDATION_MODE`, `STATUS: working`.
- [ ] **2. Gather the real source of truth** — PR/ticket/investigation text plus existing flows/evals in the target repo.
- [ ] **3. Enumerate acceptance criteria** — write a numbered canonical list under `## Acceptance Criteria`.
- [ ] **4. Extract proof targets** — split the work into the smallest executable claims.
- [ ] **5. Decide proof mode** — choose `state`, `visual`, or `mixed` for every target and justify every `mixed`.
- [ ] **6. Discover reuse** — list existing `flow` / `eval_ref` / canonical recipe surfaces before writing new graph steps.
- [ ] **7. Draft the recipe** — write `artifacts/recipe.json` and, when supported, `artifacts/recipe-cook.json`.
- [ ] **8. Run schema validation** — if the repo provides a schema validator, run it and record the command + output under `## Validation Evidence`.
- [ ] **9. Run runner dry-run validation** — if the repo provides a runner, run at least a dry-run and record the command + output.
- [ ] **10. Handle unavailable validation honestly** — if the repo has no validator or runner, write `validation unavailable` with the reason. Do not fake success.
- [ ] **11. Write the learning artifact** — write `artifacts/fs-cook-learning.json` with evidence verdict and proposed next delta.
- [ ] **12. Audit unresolved targets** — update `## Resolved vs Unresolved` and `## Recipe Coverage Audit` after validation evidence exists.
- [ ] **13. Final completion gate** — set `STATUS: done` only after recipe writing, validation evidence, learning artifact, and unresolved-target audit are all present.

## Failure Conditions

Fail the cooking attempt if:

- the recipe is written before AC extraction
- proof modes are missing
- unresolved targets are hidden
- `artifacts/fs-cook-learning.json` is missing
- the agent stops after writing JSON with no validation evidence
- the agent claims canonical success when every target is unresolved
- the cooking run edits `fs-cook/SKILL.md`, `fs-cook/TASK.md`, or `fs-cook/repos/*.md`
