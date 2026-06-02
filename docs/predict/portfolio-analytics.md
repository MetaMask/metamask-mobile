# Predict Portfolio Analytics

This document records the minimal analytics coverage added for PRED-905, covering the Predict portfolio module and Positions screen. Product and analytics can refine event names or property shape later; this implementation intentionally reuses existing Predict analytics plumbing where possible.

## Event Mapping

Event constants are from `MetaMetricsEvents`. The emitted event name is shown in parentheses.

| Interaction                            | Event                                                   | Reuse status                     | `source`                   | Key properties                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------- | -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Portfolio module viewed                | `PREDICT_FEED_VIEWED` (`Predict Feed Viewed`)           | Reused                           | `predict_portfolio_module` | `action_type: viewed`, `entry_point`, `portfolio_module_enabled: true`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings` |
| Positions tapped from portfolio module | `PREDICT_PORTFOLIO_ACTION` (`Predict Portfolio Action`) | New lightweight Predict UI event | `predict_portfolio_module` | `action_type: clicked`, `cta_name: positions`, `entry_point`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`           |
| Add funds tapped from portfolio module | `PREDICT_PORTFOLIO_ACTION` (`Predict Portfolio Action`) | New lightweight Predict UI event | `predict_portfolio_module` | `action_type: clicked`, `cta_name: add_funds`, `entry_point`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`           |
| Withdraw tapped from portfolio module  | `PREDICT_PORTFOLIO_ACTION` (`Predict Portfolio Action`) | New lightweight Predict UI event | `predict_portfolio_module` | `action_type: clicked`, `cta_name: withdraw`, `entry_point`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`            |
| Claim all tapped from portfolio module | `PREDICT_PORTFOLIO_ACTION` (`Predict Portfolio Action`) | New lightweight Predict UI event | `predict_portfolio_module` | `action_type: clicked`, `cta_name: claim_all`, `entry_point`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`           |
| Positions screen viewed                | `PREDICT_POSITION_VIEWED` (`Predict Position Viewed`)   | Reused                           | `predict_positions_screen` | `entry_point`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`                                                          |
| Positions tab viewed                   | `PREDICT_POSITION_VIEWED` (`Predict Position Viewed`)   | Reused                           | `predict_positions_screen` | `entry_point`, `tab: positions`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`                                        |
| History tab viewed                     | `PREDICT_ACTIVITY_VIEWED` (`Predict Activity Viewed`)   | Reused                           | `predict_positions_screen` | `entry_point`, `tab: history`, `activity_type: activity_list`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`          |
| Claim all tapped from Positions screen | `PREDICT_PORTFOLIO_ACTION` (`Predict Portfolio Action`) | New lightweight Predict UI event | `predict_positions_screen` | `action_type: clicked`, `cta_name: claim_all`, `entry_point`, `positions_count`, `claimable_positions_count`, `has_claimable_winnings`           |

Funding, withdrawal, claim, buy, and sell transaction lifecycle outcomes continue to use existing Predict transaction analytics, primarily `PREDICT_TRADE_TRANSACTION` (`Predict Trade Transaction`), when those flows execute.

## Property Notes

- `source` is the canonical location property for this implementation. Do not send both `source` and `location` unless analytics asks for both.
- Portfolio module view tracking uses `entry_point: home_section`.
- Portfolio module Positions and Claim all taps use `entry_point: homepage_positions`.
- Portfolio module Add funds and Withdraw taps use `entry_point: homepage_balance`.
- Positions screen and tab events inherit `entry_point` from the route, defaulting to `homepage_positions`.
- Count and boolean context comes from `usePredictPortfolio`: `openPositionCount`, `claimablePositionCount`, and `hasClaimableWinnings`.

## Sensitive Value Guardrails

These view and interaction events do not add sensitive properties. The implementation sends counts and booleans only.

Do not add these values to the portfolio view/action payloads without explicit analytics review:

- `availableBalance` or `available_balance`
- `claimableAmount` or `claimable_amount`
- `portfolioValue` or `portfolio_value`
- `openPositionsValue` or `open_positions_value`
- `totalUnrealizedPnlAmount` or `total_unrealized_pnl_amount`
- `totalUnrealizedPnlPercent` or `total_unrealized_pnl_percent`
- position amounts, prices, P&L, `currentValue`, `initialValue`, or market value
- user address or account identifiers

Existing transaction lifecycle events continue to own amount-bearing funding, withdrawal, claim, buy, and sell reporting under the existing analytics standards.

## Implementation Notes

- React components call `Engine.context.PredictController` analytics helpers rather than importing analytics utilities directly.
- `PredictController` exposes `trackPortfolioModuleViewed`, `trackPortfolioAction`, `trackPositionsScreenViewed`, and `trackPositionsTabViewed`.
- `PredictAnalytics` maps typed helper arguments to MetaMetrics events through `PREDICT_ANALYTICS_EVENTS`.
- Portfolio module view tracking fires once after the portfolio model is no longer loading.
- Positions screen view tracking fires once per screen mount.
- Tab tracking fires for the active initial tab and on user tab changes, skipping repeated taps on the active tab.

## Verification

Focused coverage lives in:

- `app/components/UI/Predict/controllers/PredictAnalytics.test.ts`
- `app/components/UI/Predict/controllers/PredictController.test.ts`
- `app/components/UI/Predict/components/PredictPortfolio/PredictPortfolioModule.test.tsx`
- `app/components/UI/Predict/views/PredictPositionsView/PredictPositionsView.test.tsx`
- `app/components/UI/Predict/components/PredictPositionsViewHeader/PredictPositionsViewHeader.test.tsx`
- `app/components/UI/Predict/views/PredictPositionsView/PredictPositionsView.view.test.tsx`

For manual QA, enable analytics logging/debugging if available and confirm each listed interaction emits once with the expected non-sensitive properties.
