# MM-4 Improvement Tracker

Purpose: keep a visible root-level record of the mobile/script/testability improvements added while iterating on `fs-cook` and live perps validation on `mm-4`.

Current branch: `wip/fs-cook-mm4-improvements`

## Scope

- Mobile app testability fixes that should become a real PR
- Mobile agentic runner/schema/docs fixes that should become a real PR
- Local-only `fs-cook` / runner prompt improvements used to iterate faster on `mm-4`

## Tracked Repo Changes

### Mobile UI / testability

- `app/components/UI/Perps/Views/PerpsSelectModifyActionView/PerpsSelectModifyActionView.tsx`
  - pass `testID` through to `PerpsModifyActionSheet`
- `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx`
  - pass stable modify-sheet testID into `PerpsSelectModifyActionView`
- `app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx`
  - pass stable modify-sheet testID into `PerpsSelectModifyActionView`
- `app/components/UI/Perps/Perps.testIds.ts`
  - add `PerpsOrderBookViewSelectorsIDs.MODIFY_ACTION_SHEET`
- `app/components/UI/Perps/Views/PerpsSelectModifyActionView/PerpsSelectModifyActionView.test.tsx`
  - verify `testID` pass-through

### Mobile agentic runner / schema / docs

- `scripts/perps/agentic/validate-flow-schema.js`
  - reject `wait_for.timeout`; require `timeout_ms`
- `scripts/perps/agentic/validate-recipe.js`
  - schema-validate before execution
  - artifact-root screenshots now copy into the passed `artifacts/` directory
- `scripts/perps/agentic/README.md`
  - document canonical `wait_for` timing fields: `timeout_ms`, `poll_ms`

## Local-Only Changes

These are intentionally local to `mm-4` for iteration and are not yet PR-ready:

- `.agents/skills/fs-cook/references/TASK.md`
  - added checklist guidance for:
    - `wait_for` + `expression` must include `assert`
    - MetaMask mobile validation must pass `ARTIFACT_DIR`
    - slot readiness checks
    - reuse existing live position state when available
- `.agents/skills/fs-cook/scripts/run-cooking-lane.js`
  - visible runs under `fs-cook-runs/`
  - mobile live-slot auto-detection via `yarn a:status`
  - stronger mobile-specific recipe guidance

## Promoted Local Builder Improvements

Promoted into the branch for broader use:

- `.agents/skills/fs-cook/references/TASK.interactive.md`
  - separate developer-interactive task surface
- `.agents/skills/fs-cook/scripts/run-cooking-lane.js`
  - `--task-mode standard|interactive`
  - prompt distinguishes autonomous vs developer-interactive handling
- `.agents/skills/fs-cook/SKILL.md`
  - documents interactive/developer mode expectations
- `.agents/skills/fs-cook/scripts/test-run-cooking-lane.js`
  - verifies interactive task-mode materialization and prompt wording
- `.agents/skills/fs-cook/VERSION`
  - explicit local skill versioning
  - runner now records `skill_version` in `run-meta.json`
- `docs/readme/fs-cook.md`
  - usage doc for autonomous vs interactive fs-cook
  - documents current Codex caveat
  - documents manual worker-style delegation simulation

## Key Learnings Captured So Far

1. `wait_for.timeout` was a contract mismatch.
   - fixed by strict schema + docs + fail-fast validation

2. `wait_for` with `expression` needs an explicit `assert`.
   - validator rejects expression-only waits

3. For MetaMask mobile, `validate-recipe.sh` must receive `ARTIFACT_DIR`, not `TASK_DIR`.

4. Live slot state matters more than generic setup flows.
   - if a BTC position already exists and the flip affordance is visible, reuse it
   - do not force `trade-open-market`

5. The original live recipe used the wrong UI path.
   - `position-card-flip-icon` was not the real flip action
   - actual path resolved to:
     - `perps-market-details-modify-button`
     - modify sheet flip option
     - `perps-flip-position-confirm-sheet`
     - `perps-flip-position-cancel-button`

6. Real mobile UI testability bug found:
   - `PerpsModifyActionSheet` was rendering option IDs from an undefined base testID
   - result was `undefined-flip_position`
   - fixed in app code by passing a stable `testID`

7. Screenshot proof should live inside the run folder.
   - validator now copies screenshots into the passed `artifacts/` directory

## Latest Successful Evidence

Primary successful run:

- `fs-cook-runs/mobile-review-28897/mobile-review-28897-2026-04-17T10-19-42-234Z`

Artifacts:

- `TASK.md`
- `artifacts/recipe.json`
- `artifacts/fs-cook-learning.json`
- `SIGNAL.json`

Terminal result:

- `{"status":"complete","outcome":"success"}`

Evidence summary:

- AC1: live visual path proven
- AC2: unit test proves no `currentPrice` passed to provider
- AC3: unit test proves `order_value` uses `averagePrice`
- AC4: `10/10` `flipPosition` tests pass

Screenshot proof:

- `.agent/screenshots/2026-04-17_182702_flip-confirm-sheet.png`

## Next Candidate PR Slice

1. Commit the tracked mobile UI/testability fix:
   - stable modify-sheet test IDs

2. Commit the tracked agentic runner/schema/docs fix:
   - strict `timeout_ms`
   - fail-fast schema validation
   - screenshot copy into artifact root

3. Optionally add one more testability pass:
   - explicit selector IDs for the modify sheet flip option path
   - maybe a dedicated integration-style test for that path

## Fresh Verification After Follow-up Fix

After adding stable modify-sheet IDs in app code, live probing on `mm-4` showed:

- before pressing modify:
  - `modifyButton: true`
  - `stableSheet: false`
  - `stableFlip: false`
  - `legacyFlip: false`
- after pressing `perps-market-details-modify-button`:
  - `stableSheet: true`
  - `stableFlip: true`
  - `legacyFlip: false`

Meaning:

- the stable path now works live:
  - `perps-market-details-modify-button`
  - `perps-market-details-modify-action-sheet`
  - `perps-market-details-modify-action-sheet-flip_position`
- the old accidental `undefined-flip_position` path is no longer needed

## Codex Runner Validation

Fresh evidence on the promoted local runner:

- `--runner codex` now launches successfully through `codex exec`
- the local runner records normal run scaffolding + metadata before Codex completes
- verified fields in the minimal probe run:
  - `runner: "codex"`
  - `task_mode: "interactive"`
  - `skill_version: "0.1.0"`
  - visible run package materialized under `/tmp/fs-cook-codex-mini-.../out`
- however, the minimal Codex batch probe did **not** reach a terminal artifact set within the short validation window, while the comparable Claude path completed quickly

Conclusion so far:

- Codex runner path is **launch-viable**
- Codex batch delegation path is **not yet proven terminal/reliable enough** to replace the Claude-backed proof path
- before worker-template integration, Codex likely needs either:
  1. a different non-interactive contract, or
  2. a dedicated timeout / streaming / output-capture strategy validated end-to-end

Visible tmux follow-up:

- validation was rerun from a real shell pane in the `mm-4` tmux session (not inside the Claude pane)
- first visible failure was the `asdf` shim path:
  - `No version is set for command codex`
- local runner was then patched to bypass the shim and invoke the real Codex entrypoint
- latest visible run:
  - `fs-cook-runs/codex-visible-20260417T202656`
  - `run-meta.json` written normally
  - `runner-output.txt` effectively empty
  - pane ended with `Runner exited with status null`

Refined conclusion:

- Codex support in the local runner is improved enough to launch and scaffold visible runs
- Codex batch capture is still not template-ready because terminal completion/output handling is not yet reliable like the Claude path

## Open Questions

- Should `fs-cook` have separate interactive and batch task templates?
- Should successful screenshots also be copied into `fs-cook-runs/.../artifacts/screenshots/` by the local harness layer, not just the validator?
- Should we add a dedicated pre-condition like `perps.open_position` / `perps.provider_connected` to the mobile recipes catalog?

## Validated Manual Delegation Contract

Manual worker-style delegation simulation completed successfully without touching worker templates:

- run:
  - `fs-cook-runs/worker-review-sim-20260417T200722`
- emitted package:
  - `TASK.md`
  - `SOURCE-BUNDLE.md`
  - `run-meta.json`
  - `artifacts/recipe.json`
  - `artifacts/fs-cook-learning.json`
  - validation logs

Observed contract from `run-meta.json`:

- `scenario_id: mobile-review-28897`
- `task_mode: interactive`
- `runner_mode: batch`
- `slot_resolution: repo-local`
- `cdp_port: auto-mobile-live`
- `skill_version: 0.1.0`

Implication:

- a worker template can plausibly delegate recipe construction to `fs-cook` as a sub-task
- the worker does not need to own recipe-generation logic directly if it can:
  1. call `run-cooking-lane.js`
  2. wait for `artifacts/recipe.json` + run completion metadata
  3. continue with downstream review/fix steps

Still not validated:

- template-level integration inside `review-pr.md` / `fix-bug.md`
- signaling/wait contract if the delegated `fs-cook` task runs interactively in tmux rather than batch
