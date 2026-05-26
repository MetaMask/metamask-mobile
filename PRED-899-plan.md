# PRED-899 Predict Portfolio Module Plan

## Summary

Build the new Predict homepage portfolio module and supporting reusable portfolio actions. The first implementation slice excludes the shared empty state and the active/claimable positions list composition, per the current task focus.

The Jira issue is not directly accessible from this environment because Atlassian redirects to login, so this plan is based on the ticket text, provided screenshot, and local repository inspection.

Current repo findings:

- No `usePredictPortfolio` hook/model exists on `main`.
- No `PredictPortfolio*` components exist yet.
- The PRED-898 branch only adds portfolio feature-flag plumbing.
- Existing homepage Predict balance/action logic lives mostly in `PredictBalance`, `PredictPositionsHeader`, and `PredictHomePositions`.
- No Predict Positions route exists yet.

## Commit 1: Add Shared Portfolio Model Hook

Commit message:

```text
feat(predict): add shared portfolio model hook
```

Add `usePredictPortfolio` under `app/components/UI/Predict/hooks`.

The hook should compose existing Predict hooks:

- `usePredictBalance`
- `useUnrealizedPnL`
- `usePredictPositions({ claimable: false, livePriceUpdates: true })`
- `usePredictPositions({ claimable: true })`
- `usePredictClaim`
- `usePredictDeposit`
- `usePredictWithdraw`
- `usePredictAccountState`

Return a UI-ready model:

- `portfolioValue`: available balance + active position current value + actionable claimable winnings
- `availableBalance`
- `totalUnrealizedPnlAmount`
- `totalUnrealizedPnlPercent`
- `showPnlLine`: `Math.abs(totalUnrealizedPnlAmount) >= 0.01`
- `claimableAmount`
- `hasClaimableWinnings`
- `positionsBadgeCount`: active/open positions + actionable claimable positions
- `isLoading`
- `isRefreshing`
- `error`
- `refetch`
- action handlers or action dependencies needed by the module

Keep privacy handling out of the hook. Components should apply existing `SensitiveText` patterns.

## Commit 2: Add Portfolio Action Components

Commit message:

```text
feat(predict): add portfolio action components
```

Create a new portfolio-domain component folder, for example:

```text
app/components/UI/Predict/components/PredictPortfolio/
```

Add:

- `PredictPortfolioAction`
- `PredictPortfolioActions`
- test IDs colocated with the components or added to `Predict.testIds.ts`
- an index export

`PredictPortfolioAction` should be the reusable tile used for all three actions:

- icon
- label
- optional badge
- disabled/loading state
- `onPress`
- accessibility label

`PredictPortfolioActions` should compose:

- Positions, using `IconName.Book`
- Add funds, using `IconName.Add`
- Withdraw, using `IconName.ArrowDown`

Badge behavior:

- Show the Positions badge only when count > 0.
- Badge count = active/open positions + actionable claimable positions.

Positions action behavior for this slice:

- Prefer an `onPositionsPress` prop if the Positions route is not implemented yet.
- If the implementation includes the route shell in a later commit, wire the handler to that route there.

## Commit 3: Add Portfolio Module Surface

Commit message:

```text
feat(predict): add portfolio module surface
```

Add `PredictPortfolioModule`.

The module should render only:

- primary portfolio value
- optional secondary P&L / available line
- Positions / Add funds / Withdraw action row
- optional prominent Claim CTA

It must not render the Predictions header/title. The screen header owns that.

Primary amount behavior:

- Large value = `portfolioValue`.
- No visual label above the amount.
- Accessibility label should be explicit, for example: `Portfolio value, $0.00`.
- Use `SensitiveText` for privacy mode.

Secondary line behavior:

- Hide when `Math.abs(totalUnrealizedPnlAmount) < 0.01`.
- When visible, match the Figma pattern:

```text
-$18.47 (2.1%) · $250.00 available
```

- Use existing formatting helpers where possible, especially `formatPrice`, `formatPercentage`, and `formatPredictUnrealizedPnLStringParts`.
- Use P&L text color matching existing Predict P&L convention: error for negative, success for positive.

Claim CTA behavior:

- Show `PredictClaimButton` when claimable winnings exist.
- Reuse `usePredictClaim`/existing claim flow through the shared portfolio model.
- Use guarded action flow with `PredictEventValues.ATTEMPTED_ACTION.CLAIM`.

Loading/error behavior:

- Loading state should use skeletons while keeping the module footprint stable.
- Error/fallback state should still render the module with `$0.00`, hide secondary P&L, keep actions visible, and surface errors through tests/logging rather than blocking the homepage.

## Commit 4: Wire Homepage To Portfolio Module

Commit message:

```text
feat(predict): wire homepage portfolio module
```

Replace the current `PredictBalance` usage in `PredictFeedHeader` with `PredictPortfolioModule`.

Reuse existing flows:

- Add funds uses the existing guarded `deposit` flow with homepage entry point.
- Withdraw uses existing `usePredictWithdraw`.
- Deposit-wallet withdraw falls back to `PredictWithdrawUnavailableSheet` unless the real withdraw flag/path is enabled.
- Claim uses existing guarded claim flow.

Feature flag:

- If the PRED-898 feature flag plumbing is available on the implementation branch, gate the new module with `selectPredictPortfolioEnabledFlag`.
- If that plumbing is not merged yet, implement the module without a flag in this branch and call out the dependency in the PR.

Positions navigation:

- If a Predict Positions route exists by implementation time, navigate to it.
- If it still does not exist, keep `PredictPortfolioModule` accepting `onPositionsPress` and wire a placeholder handler that can be swapped when the Positions screen lands.
- Do not implement `PredictPositionsEmpty` or `PredictPortfolioPositionList` in this task.

## Commit 5: Add Focused Tests

Commit message:

```text
test(predict): cover portfolio module states
```

Add tests for:

- first-time zero state: `$0.00`, no secondary P&L line, actions visible
- returning state with P&L above threshold
- P&L hidden below `$0.01`
- claimable winnings showing Claim CTA
- Positions badge count combining active/open and actionable claimable positions
- privacy mode masking via `SensitiveText`
- loading skeleton state
- error/fallback state
- action press wiring for Positions, Add funds, Withdraw, and Claim

Recommended targeted commands:

```bash
yarn jest app/components/UI/Predict/hooks/usePredictPortfolio.test.ts
yarn jest app/components/UI/Predict/components/PredictPortfolio
yarn jest app/components/UI/Predict/views/PredictFeed/PredictFeed.test.tsx
```

Also run type checking if the touched surface is broad:

```bash
yarn lint:tsc
```

## Assumptions

- PRED-899 should create `usePredictPortfolio` because no shared portfolio hook/model is present locally.
- `PredictPositionsEmpty` and `PredictPortfolioPositionList` are intentionally out of scope for this first slice.
- The new module belongs below the screen-owned Predictions title/header, so it must not render that title itself.
- `portfolioValue` is computed from current local data sources until a dedicated backend/controller portfolio endpoint exists.
- Positions navigation may require a route shell or a handler prop depending on whether the Positions screen lands before implementation begins.
