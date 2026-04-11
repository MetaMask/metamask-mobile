# Phase 8: Cleanup

## Goal

Remove the legacy Predict implementation, rename `PredictNext/` to `Predict/`, and finish the migration with zero old-code dependencies remaining.

## Prerequisites

- Phase 7 complete.

## Deliverables

- Old `app/components/UI/Predict/` removed
- `app/components/UI/PredictNext/` renamed to `app/components/UI/Predict/`
- All imports, tests, routes, and docs updated to the final path

## Step-by-Step Tasks

1. Verify that no runtime imports from old `Predict/` remain.
   - Search for imports targeting:
     - `app/components/UI/Predict/`
     - `../Predict/`
     - `components/UI/Predict`
   - Confirm all remaining results are inside migration docs or historical references that will be removed or rewritten.

2. Remove any remaining transitional delegation.
   - Delete temporary comments and delegation paths where `PredictNext` services still call old feature wrappers instead of the adapter/service implementation.
   - Ensure `PolymarketAdapter` no longer depends on deprecated file shapes beyond the final retained provider internals, or migrate those internals fully if desired.

3. Delete the old feature tree.
   - Remove `app/components/UI/Predict/` only after the zero-import check passes.
   - This includes old:
     - `components/`
     - `hooks/`
     - `views/`
     - `controllers/`
     - `providers/`
     - `routes/`
     - `selectors/`
     - `types/`
     - `services/`

4. Rename the feature directory.
   - Run `git mv app/components/UI/PredictNext app/components/UI/Predict`.
   - Keep git history intact through the rename.

5. Update import paths across the repo.
   - Rewrite all remaining `PredictNext` imports to `Predict` in at least these files if they were switched earlier:
     - `app/core/Engine/controllers/predict-controller/index.ts`
     - `app/core/Engine/messengers/predict-controller-messenger/index.ts`
     - `app/core/Engine/types.ts`
     - `app/core/NavigationService/types.ts`
     - `app/core/DeeplinkManager/handlers/legacy/handlePredictUrl.ts`
     - `app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx`
     - `app/components/Views/Homepage/Sections/Predictions/components/PredictMarketCard.tsx`
     - `app/components/Views/TrendingView/sections.config.tsx`
     - `app/components/Views/Wallet/index.tsx`
     - `app/components/Views/WalletActions/WalletActions.tsx`
     - `app/components/Views/TradeWalletActions/TradeWalletActions.tsx`
     - `app/components/Views/BrowserTab/BrowserTab.tsx`
     - `tests/component-view/presets/predict.ts`
     - `tests/component-view/renderers/predict.tsx`
     - `tests/component-view/renderers/predictMarketDetails.tsx`

6. Update test and preset paths.
   - Move or rewrite component view imports to the final `Predict/` path.
   - Update any `*.view.test.tsx` files created under `PredictNext/views/` so they live under the renamed `Predict/views/` paths.
   - Update any fixtures, snapshot paths, or renderer helpers that still include `PredictNext` in file imports.

7. Update navigation registration and route typings one final time.
   - Ensure the route stack points at the renamed final paths.
   - Ensure `app/core/NavigationService/types.ts` imports from final `Predict/types/navigation.ts`.

8. Update ownership and documentation metadata.
   - Update `CODEOWNERS` if PredictNext-specific entries were added.
   - Rewrite `app/components/UI/Predict/README.md` and docs under `app/components/UI/Predict/docs/` so they describe the shipped architecture, not the migration.
   - Remove migration notes from public docs that are no longer useful after cutover.

9. Run final verification.
   - Execute the full Predict component view suite.
   - Run relevant E2E tests for the feature entry points and routed flows.
   - Confirm no import paths or navigation registrations still reference `PredictNext`.

10. Merge only when the repo is on the final steady-state shape.
    - After this phase there should be exactly one feature folder: `app/components/UI/Predict/`.

## Files Created

| File path | Description                                                          | Estimated lines |
| --------- | -------------------------------------------------------------------- | --------------: |
| None      | This phase is rename/delete/update work, not net-new module creation |               0 |

## Files Affected in Old Code

| File path                                                          | Expected change                                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `app/components/UI/Predict/`                                       | Entire old tree deleted before rename, then replaced by renamed PredictNext tree |
| `app/core/Engine/controllers/predict-controller/index.ts`          | Final import path update from `PredictNext` to `Predict`                         |
| `app/core/Engine/messengers/predict-controller-messenger/index.ts` | Final import path update                                                         |
| `app/core/NavigationService/types.ts`                              | Final import path update                                                         |
| `tests/component-view/presets/predict.ts`                          | Final import path update                                                         |
| `tests/component-view/renderers/predict.tsx`                       | Final import path update                                                         |
| `tests/component-view/renderers/predictMarketDetails.tsx`          | Final import path update                                                         |
| `CODEOWNERS`                                                       | Update ownership entries if PredictNext paths were temporary                     |

## Acceptance Criteria

- Zero imports from the legacy pre-migration Predict implementation remain.
- The only feature directory left is `app/components/UI/Predict/`.
- All external consumers point to the final renamed path.
- Component view tests and relevant E2E tests pass against the final path.
- Docs and ownership metadata no longer mention `PredictNext` except in historical migration records intentionally retained outside the feature folder.

## Estimated PRs

- 1-2 PRs total.
  1. Delete old tree, rename `PredictNext`, and update imports.
  2. Optional follow-up cleanup PR for docs, CODEOWNERS, and residual non-production references if the rename PR needs to stay narrowly scoped.
