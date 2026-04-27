# Phase 7: Cleanup

## Goal

Remove the legacy Predict implementation, delete the translation layer, rename `PredictNext/` to `Predict/`, and finish the migration with zero old-code dependencies remaining.

## Prerequisites

- Phase 6 (UI Migration) complete.
- All routed screens and external embed points are using `PredictNext`.
- Zero runtime imports from the old `app/components/UI/Predict/` directory remain in the codebase.

## Deliverables

- Deleted `app/components/UI/Predict/` directory.
- Deleted `app/components/UI/PredictNext/compat/` directory.
- Renamed `app/components/UI/PredictNext/` to `app/components/UI/Predict/`.
- Updated import paths across the entire repository.
- Updated `CODEOWNERS` and documentation.

## Step-by-Step Tasks

1. **Final Verification**:
   - Run a global grep for `from '.*UI/Predict/'` and `from ".*UI/Predict/"` to ensure no production code still imports from the old directory.
   - Verify that all tests (unit, component view, E2E) pass.

2. **Delete Legacy Code**:
   - Delete the entire `app/components/UI/Predict/` tree.
   - Delete the `app/components/UI/PredictNext/compat/` translation layer. It is no longer needed since all consumers now use canonical types.

3. **Rename Directory**:
   - Execute: `git mv app/components/UI/PredictNext/ app/components/UI/Predict/`.
   - This preserves git history for the new implementation while restoring the original directory name.

4. **Update Import Paths**:
   - Update all import paths that were pointing to `PredictNext` to point to `Predict`.
   - Affected areas include:
     - `app/core/Engine/`
     - `app/core/NavigationService/`
     - `app/core/DeeplinkManager/`
     - `app/components/Views/Homepage/`
     - `app/components/Views/Wallet/`
     - `tests/component-view/`
     - `tests/smoke/` and `tests/regression/` (E2E tests)

5. **Update Documentation and Metadata**:
   - Update `CODEOWNERS` if the team structure has changed.
   - Rewrite `app/components/UI/Predict/README.md` and other docs to describe the final shipped architecture, removing references to the migration process where they are no longer relevant.
   - Update any scripts or CI configurations that referenced `PredictNext`.

6. **Final Test Run**:
   - Run the full suite of component view tests.
   - Run all Predict-related E2E tests (smoke and regression).
   - Perform a final manual smoke test on both iOS and Android.

## Files Created

| File path                             | Description                              | Estimated lines |
| ------------------------------------- | ---------------------------------------- | --------------: |
| `app/components/UI/Predict/README.md` | Updated final architecture documentation |         100-200 |

## Files Affected in Old Code

| File path                          | Expected change                                       |
| ---------------------------------- | ----------------------------------------------------- |
| `app/components/UI/Predict/` (old) | Deleted.                                              |
| `app/components/UI/PredictNext/`   | Renamed to `app/components/UI/Predict/`.              |
| `~15 external files`               | Import paths updated from `PredictNext` to `Predict`. |

## Acceptance Criteria

- The `app/components/UI/PredictNext/` directory no longer exists.
- The `app/components/UI/Predict/` directory contains the new architecture.
- The `compat/` translation layer is completely removed.
- All tests pass, and the app functions perfectly.
- No "PredictNext" terminology remains in production code or import paths.

## Estimated PRs

- 1-2 PRs total.
  1. Deletion of old code and translation layer.
  2. Directory rename and global import update.
