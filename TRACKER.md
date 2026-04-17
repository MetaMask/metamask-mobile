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

## Open Questions

- Should `fs-cook` have separate interactive and batch task templates?
- Should successful screenshots also be copied into `fs-cook-runs/.../artifacts/screenshots/` by the local harness layer, not just the validator?
- Should we add a dedicated pre-condition like `perps.open_position` / `perps.provider_connected` to the mobile recipes catalog?
