# Predict Portfolio Analytics

This document records the minimal analytics coverage added for PRED-905, covering the Predict portfolio module and Positions screen. Product and analytics can refine event names or property shape later; this implementation intentionally reuses existing Predict analytics plumbing where possible.

## Event Mapping

Event constants are from `MetaMetricsEvents`. The emitted event name is shown in parentheses.

| Interaction                            | Event                                                     | Reuse status | Context                                       | Key properties                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------- | ------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio module shown                 | `PREDICT_FEED_VIEWED` (`Predict Feed Viewed`)             | Extended     | `predict_component: predict_portfolio_module` | Real feed session fields from `PredictFeedSessionManager`, plus `portfolio_module_enabled: true`                                                                                 |
| Positions tapped from portfolio module | `PREDICT_POSITION_VIEWED` (`Predict Position Viewed`)     | Reused       | `predict_component: predict_portfolio_module` | `action_type: clicked`, `entry_point`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                                                             |
| Add funds tapped from portfolio module | `PREDICT_TRADE_TRANSACTION` (`Predict Trade Transaction`) | Reused       | `predict_component: predict_portfolio_module` | `status: initiated`, `transaction_type: mm_predict_deposit`, `entry_point`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                        |
| Withdraw tapped from portfolio module  | `PREDICT_TRADE_TRANSACTION` (`Predict Trade Transaction`) | Reused       | `predict_component: predict_portfolio_module` | `status: initiated`, `transaction_type: mm_predict_withdraw`, `entry_point`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                       |
| Claim all tapped from portfolio module | `PREDICT_TRADE_TRANSACTION` (`Predict Trade Transaction`) | Reused       | `predict_component: predict_portfolio_module` | `status: initiated`, `transaction_type: mm_predict_claim`, `entry_point`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                          |
| Positions screen viewed                | `PREDICT_POSITION_VIEWED` (`Predict Position Viewed`)     | Reused       | `predict_screen: predict_positions_screen`    | `action_type: viewed`, `entry_point`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                                                              |
| Positions tab viewed                   | `PREDICT_POSITION_VIEWED` (`Predict Position Viewed`)     | Reused       | `predict_screen: predict_positions_screen`    | `action_type: viewed`, `entry_point`, `predict_feed_tab: positions`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                               |
| History tab viewed                     | `PREDICT_ACTIVITY_VIEWED` (`Predict Activity Viewed`)     | Reused       | `predict_screen: predict_positions_screen`    | `action_type: viewed`, `entry_point`, `predict_feed_tab: history`, `activity_type: activity_list`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings` |
| Claim all tapped from Positions screen | `PREDICT_TRADE_TRANSACTION` (`Predict Trade Transaction`) | Reused       | `predict_screen: predict_positions_screen`    | `status: initiated`, `transaction_type: mm_predict_claim`, `entry_point`, `open_positions_count`, `claimable_positions_count`, `has_claimable_winnings`                          |

No new Predict event name is introduced by this implementation. Funding, withdrawal, claim, buy, and sell transaction lifecycle outcomes continue to use existing Predict transaction analytics, primarily `PREDICT_TRADE_TRANSACTION` (`Predict Trade Transaction`), when those flows execute.

## Property Notes

- `predict_screen` is used for actual Predict screens.
- `predict_component` is used for embedded Predict components, currently `predict_portfolio_module`.
- Portfolio module visibility is represented by extending real `Predict Feed Viewed` events from `PredictFeedSessionManager`; it does not emit a separate synthetic feed event.
- When the portfolio module is enabled, real feed events include `portfolio_module_enabled: true` and `predict_component: predict_portfolio_module` while preserving the real `session_id`, `predict_feed_tab`, `num_feed_pages_viewed_in_session`, `session_time_in_feed`, and `is_session_end` values.
- Portfolio module Positions and Claim all taps use `entry_point: homepage_positions`.
- Portfolio module Add funds and Withdraw taps use `entry_point: homepage_balance`.
- Positions screen and tab events inherit `entry_point` from the route, defaulting to `homepage_positions`.
- The embedded History transaction list does not emit its generic activity-list view event inside the Positions screen; the Positions screen owns History tab tracking so the contextual event is emitted once.
- `Predict Position Viewed` with `action_type: viewed` is used for both Positions screen entry and Positions tab views. Consumers can distinguish them with `predict_feed_tab`: absent for the screen view and `positions` for the tab view.
- The default Positions tab is not tracked separately on screen entry. History is tracked on screen entry only when the Positions screen opens directly with `initialTab: history`, because the embedded History list disables its own generic view event.
- Portfolio action, Positions screen, and tab count context comes from `usePredictPortfolio`: `openPositionCount`, `claimablePositionCount`, and `hasClaimableWinnings`.

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
- `PredictController` exposes `trackPortfolioPositionsButtonTapped`, `trackPortfolioTransactionInitiated`, `trackPositionsScreenViewed`, and `trackPositionsTabViewed`.
- `PredictAnalytics` maps typed helper arguments to MetaMetrics events through `PREDICT_ANALYTICS_EVENTS`.
- `PredictFeed` passes the portfolio module feature flag into `PredictFeedSessionManager`, which extends the real feed session events when the module is enabled.
- Positions screen view tracking fires once per screen mount.
- Tab tracking fires on explicit tab presses, including repeated taps on the active tab.

## Verification

Focused coverage lives in:

- `app/components/UI/Predict/controllers/PredictAnalytics.test.ts`
- `app/components/UI/Predict/controllers/PredictController.test.ts`
- `app/components/UI/Predict/services/PredictFeedSessionManager.test.ts`
- `app/components/UI/Predict/views/PredictFeed/PredictFeed.test.tsx`
- `app/components/UI/Predict/components/PredictPortfolio/PredictPortfolioModule.test.tsx`
- `app/components/UI/Predict/views/PredictPositionsView/PredictPositionsView.test.tsx`
- `app/components/UI/Predict/components/PredictPositionsViewHeader/PredictPositionsViewHeader.test.tsx`
- `app/components/UI/Predict/views/PredictPositionsView/PredictPositionsView.view.test.tsx`

For manual QA, enable analytics logging/debugging if available and confirm each listed interaction emits once with the expected non-sensitive properties.
