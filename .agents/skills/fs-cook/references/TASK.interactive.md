# FS-Cook Interactive Task Template

> Developer-interactive recipe building mode.
> Work top-to-bottom, but do not hide uncertainty.
> This mode is for collaborative use: surface decisions, blockers, and missing evidence as you go.

Copy this file into the run-local workspace as `TASK.md` before editing it.
Do not edit the template in-place during a cooking run.

Every time you complete a checklist step:

1. immediately change `- [ ]` to `- [x]`
2. update `STATUS` if needed
3. add one concise note under `## Progress Notes`
4. only then move to the next step

Do not batch checkbox updates.
Do not leave completed steps unchecked.

## Task

```text
SCENARIO_ID: {{SCENARIO_ID}}
TARGET_REPO: {{TARGET_REPO}}
REPO_ROOT: {{REPO_ROOT}}
SOURCE_KIND: {{SOURCE_KIND}}
SOURCE_REF: {{SOURCE_REF}}
SOURCE_ARTIFACT_DIR: {{SOURCE_ARTIFACT_DIR}}
TASK_DIR: {{TASK_DIR}}
ARTIFACT_DIR: {{ARTIFACT_DIR}}
SOURCE_BUNDLE_FILE: {{SOURCE_BUNDLE_FILE}}
VALIDATION_MODE: {{VALIDATION_MODE}}
TASK_MODE: interactive
STATUS: pending
```

## Developer Loop

- Prefer short visible iterations over one giant hidden pass.
- When a concrete blocker appears, write it immediately under `## Open Questions / Blockers`.
- If a slot already has useful live state, reuse it instead of resetting it.
- If a recipe or validation assumption is wrong, fix the assumption and continue; do not silently discard the run.

## Source Material

Read `{{SOURCE_BUNDLE_FILE}}` first.

Then replace this section with your own summary of:

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

## Progress Notes

- Start empty.
- Add short timestamped bullets as the run evolves.

## Open Questions / Blockers

- Start empty.
- Add concrete blockers, uncertain assumptions, or decisions the developer may want to review.

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

If the repo can run a validator or test command and you did not run it, explain exactly why.

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
- [ ] **5. Decide proof mode** — choose `state`, `visual`, or `mixed` for every target and justify every `mixed`. For `wait_for` with `expression`, always include an `assert` block.
- [ ] **6. Discover reuse** — list existing `flow` / `eval_ref` / canonical recipe surfaces before writing new graph steps.
- [ ] **6a. Check slot readiness before trade recipes** — for MetaMask mobile perps flows, probe provider readiness before drafting/running live trade flows.
- [ ] **6b. Reuse existing live state when available** — if the slot already has the relevant position open and the flip control is visible, skip `trade-open-market` and validate the flip path directly.
- [ ] **7. Draft the recipe** — write `artifacts/recipe.json` and, when supported, `artifacts/recipe-cook.json`. Use documented runner field names for nodes.
- [ ] **8. Rewrite this copied TASK file** — replace the template placeholders with the real run data and working notes.
- [ ] **9. Run schema validation** — run the schema validator and record the exact output.
- [ ] **10. Run runner dry-run validation** — run at least a dry-run and record exact output. For MetaMask mobile, pass `ARTIFACT_DIR` to `validate-recipe.sh`, not `TASK_DIR`.
- [ ] **11. Run the strongest honest live validation path** — if a live slot/runtime exists, use it. If not, record the concrete blocker.
- [ ] **12. Handle unavailable validation honestly** — if the repo has no validator or runner, write `validation unavailable` with the reason. Do not fake success.
- [ ] **13. Write the learning artifact** — write `artifacts/fs-cook-learning.json`.
- [ ] **14. Audit unresolved targets** — update `## Resolved vs Unresolved` and `## Recipe Coverage Audit` after validation evidence exists.
- [ ] **15. Final completion gate** — set `STATUS: done` only after recipe writing, rewritten TASK.md, validation evidence, learning artifact, and unresolved-target audit are all present.
- [ ] **16. Write terminal signal** — write exactly one terminal `SIGNAL.json` based on the outcome matrix below.

## Outcome Matrix

Write `SIGNAL.json` only after step 15 is evaluated.

- **Success**:
  - every required validation passed or was explicitly non-applicable by contract
  - no required proof target remains `UNRESOLVED`
  - `STATUS: done`
  - signal:
    ```json
    { "status": "complete", "outcome": "success" }
    ```

- **Blocked**:
  - a concrete environment/runtime/tooling blocker prevented required validation
  - or a proof target remains `UNRESOLVED` because a required live/runtime dependency was unavailable
  - `STATUS: blocked`
  - signal:
    ```json
    {
      "status": "blocked",
      "outcome": "partial",
      "reason": "<concrete blocker>"
    }
    ```

- **Failed**:
  - a required validation actually ran and failed
  - or the recipe/proof contradicts the PR claim
  - `STATUS: failed`
  - signal:
    ```json
    { "status": "failed", "outcome": "failure", "reason": "<concrete failure>" }
    ```
