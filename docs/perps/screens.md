# Perps screens

Mobile screens, routes, and how users enter and leave them. Controller math the screens call is in the [Core architecture doc](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md).

## Entry points

There is no Perps tab in the wallet. Users enter Perps from wallet home, deeplinks, token details and the tutorial.

| Entry                                                                                                     | Resolver                                             | Lite lands on                                                                                | Pro lands on                                                                         |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Wallet-home Perps section, balance-breakdown row, homepage Perps button, wallet actions sheet, trade menu | `usePerpsHeaderEntryNavigation` `getTarget`          | `PERPS_HOME`                                                                                 | Market list or last-viewed market, by A/B variant ([ab-testing.md](./ab-testing.md)) |
| Discovery pills                                                                                           | `useGetPerpsHomeNavigationTarget`                    | `PERPS_HOME`                                                                                 | `MARKET_DETAILS` with the last-viewed market, else BTC                               |
| Wallet params `shouldSelectPerpsTab` or `initialTab: 'perps'`                                             | `useGetPerpsHomeNavigationTarget`                    | `PERPS_HOME`                                                                                 | `MARKET_DETAILS`                                                                     |
| Deeplinks                                                                                                 | `handlePerpsUrl`                                     | See [deeplinks.md](./deeplinks.md)                                                           | See [deeplinks.md](./deeplinks.md)                                                   |
| Token details one-click trade                                                                             | `usePerpsActions`, then `PerpsOrderRedirect` in Lite | `BALANCE_ORDER` when the active provider is Lighter, else the deposit-and-order confirmation | `MARKET_DETAILS` with the chosen direction                                           |

- First-time users from the wallet-home section go to `Routes.PERPS.TUTORIAL` with `redirectScreen` and `redirectParams`. The tutorial replaces itself with that target, or with the Perps home target when none was passed.
- `PerpsScreenStack` sets `initialRouteName` to `MARKET_DETAILS` in Pro mode and `PERPS_HOME` in Lite. Pro mode never shows `PerpsHomeView`.
- With basic functionality off, `PerpsScreenStack` renders an empty state instead of the stack.
- `MainNavigator` registers the Perps routes only when the Perps flag is on.

Code: `app/components/UI/Perps/hooks/usePerpsHeaderEntryNavigation.ts` `usePerpsHeaderEntryNavigation`; `app/components/UI/Perps/utils/perpsModeSwitch.ts` `resolvePerpsHomeNavigationTarget`, `useGetPerpsHomeNavigationTarget`; `app/components/Views/Homepage/Sections/Perpetuals/hooks/usePerpsNavigationHandlers.ts` `navigateToTutorialOrScreen`, `navigateToPerpsHome`; `app/components/Views/Wallet/index.tsx` `handlePerpsTabDeepLink`; `app/components/UI/Perps/components/PerpsTutorialCarousel/PerpsTutorialCarousel.tsx` `navigateAfterTutorial`; `app/components/UI/Perps/routes/index.tsx` `PerpsScreenStack`; `app/components/Nav/Main/MainNavigator.tsx`; `app/components/UI/TokenDetails/hooks/usePerpsActions.ts` `usePerpsActions`

## Routes

`Routes.PERPS.*` constants. Some names do not match their screen.

### Perps stack (`Routes.PERPS.ROOT`)

| Constant                                  | Route name                 | Component                           | Note                               |
| ----------------------------------------- | -------------------------- | ----------------------------------- | ---------------------------------- |
| `PERPS_TAB`                               | `PerpsTradingView`         | `PerpsRedirect`                     | No caller navigates here           |
| `PERPS_HOME`                              | `PerpsMarketListView`      | `PerpsHomeView`                     |                                    |
| `MARKET_LIST`                             | `PerpsTrendingView`        | `PerpsMarketListView`               |                                    |
| `BALANCE_ORDER`                           | `PerpsBalanceOrder`        | `PerpsBalanceOrderView`             |                                    |
| `WITHDRAW`                                | `PerpsWithdraw`            | `PerpsWithdrawView`                 | Legacy withdraw                    |
| `MARKET_DETAILS`                          | `PerpsMarketDetails`       | `PerpsMarketDetailsRouter`          |                                    |
| `POSITIONS`                               | `PerpsPositions`           | `PerpsPositionsView`                | No caller navigates here           |
| `CLOSE_POSITION`                          | `PerpsClosePosition`       | `PerpsClosePositionRouter`          |                                    |
| `HIP3_DEBUG`                              | `PerpsHIP3Debug`           | `HIP3DebugView`                     | Registered only in `__DEV__`       |
| `TPSL`                                    | `PerpsTPSL`                | `PerpsTPSLRouter`                   |                                    |
| `ADJUST_MARGIN`                           | `PerpsAdjustMargin`        | `PerpsAdjustMarginRouter`           |                                    |
| `ORDER_DETAILS`                           | `PerpsOrderDetailsView`    | `PerpsOrderDetailsView`             |                                    |
| `ORDER_BOOK`                              | `PerpsOrderBook`           | `PerpsOrderBookView`                | Full order book depth              |
| `PNL_HERO_CARD`                           | `PerpsPnlHeroCard`         | `PerpsHeroCardView`                 |                                    |
| `ACTIVITY`                                | `PerpsActivity`            | `ActivityScreen`                    | Shared activity view               |
| `MODALS.CLOSE_POSITION_MODALS`            | `PerpsClosePositionModals` | Modal stack with `PerpsTooltipView` |                                    |
| `MODALS.ROOT`                             | `PerpsModals`              | `PerpsModalStack`                   |                                    |
| `ORDER_REDIRECT`                          | `PerpsOrderRedirect`       | `PerpsOrderRedirect`                | One-click trade from token details |
| `FULL_SCREEN_CONFIRMATIONS.CONFIRMATIONS` |                            | `PerpsConfirmScreen`                | Hosts `PerpsOrderView`             |

### Modal stack (`Routes.PERPS.MODALS.ROOT`)

| Constant                                  | Component                            |
| ----------------------------------------- | ------------------------------------ |
| `MODALS.QUOTE_EXPIRED_MODAL`              | `PerpsQuoteExpiredModal`             |
| `MODALS.GTM_MODAL`                        | `PerpsGTMModal`                      |
| `MODALS.CLOSE_ALL_POSITIONS`              | `PerpsCloseAllPositionsView`         |
| `MODALS.CANCEL_ALL_ORDERS`                | `PerpsCancelAllOrdersView`           |
| `MODALS.CROSS_MARGIN_WARNING`             | `PerpsCrossMarginWarningBottomSheet` |
| `MODALS.SELECT_PROVIDER`                  | `PerpsSelectProviderView`            |
| `MODALS.MODE_SELECTION`                   | `PerpsModeSelectionView`             |
| `MODALS.OUTREACH_DETAILS`                 | `PerpsOutreachDetailsView`           |
| `MODALS.SHARE_POSITION`                   | `PerpsSharePositionView`             |
| `SELECT_MODIFY_ACTION`                    | `PerpsSelectModifyActionView`        |
| `SELECT_ADJUST_MARGIN_ACTION`             | `PerpsSelectAdjustMarginActionView`  |
| `SELECT_ORDER_TYPE`                       | `PerpsSelectOrderTypeView`           |
| `ORDER_REDIRECT`                          | `PerpsOrderRedirect`                 |
| `FULL_SCREEN_CONFIRMATIONS.CONFIRMATIONS` | `PerpsConfirmScreen`                 |

### Main navigator

| Constant               | Component                        |
| ---------------------- | -------------------------------- |
| `ROOT`                 | `PerpsScreenStack`               |
| `TUTORIAL`             | `PerpsTutorialCarousel`          |
| `MODALS.ROOT`          | `PerpsModalStackWithErrorGate`   |
| `POSITION_TRANSACTION` | `PerpsPositionTransactionView`   |
| `ORDER_TRANSACTION`    | `PerpsOrderTransactionView`      |
| `FUNDING_TRANSACTION`  | `PerpsFundingTransactionView`    |
| `PRICE_ALERTS`         | `ManagePriceAlertsView` (Assets) |
| `CREATE_PRICE_ALERT`   | `CreatePriceAlertView` (Assets)  |

Code: `app/constants/navigation/Routes.ts` `PERPS`; `app/components/UI/Perps/routes/index.tsx` `PerpsScreenStack`, `PerpsModalStack`, `PerpsClosePositionBottomSheetStack`, `PerpsConfirmScreen`; `app/components/Nav/Main/MainNavigator.tsx`

## Routers

One route, one set of params; a thin router picks the component.

| Router                     | Picks                                                            | Condition                                                 |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| `PerpsMarketDetailsRouter` | `PerpsProMarketView` or `PerpsMarketDetailsView`                 | Pro mode active (`usePerpsProModeEnabled`)                |
| `PerpsClosePositionRouter` | `PerpsClosePositionBottomSheet` or `PerpsClosePositionView`      | `useBottomSheet` from `usePerpsScreenVsBottomSheetAbTest` |
| `PerpsTPSLRouter`          | `PerpsTPSLView` with `variant` `sheet` or `screen`               | `useBottomSheet` route param from the caller              |
| `PerpsAdjustMarginRouter`  | `PerpsAdjustMarginBottomSheet` or `PerpsAdjustMarginView`        | `useBottomSheet` route param plus `position` and `mode`   |
| `PerpsConfirmScreen`       | Confirmation `Confirm`, whose info root renders `PerpsOrderView` | Transaction type `perpsDepositAndOrder`                   |

Code: `app/components/UI/Perps/Views/PerpsMarketDetailsRouter/PerpsMarketDetailsRouter.tsx`; `app/components/UI/Perps/Views/PerpsClosePositionRouter/PerpsClosePositionRouter.tsx`; `app/components/UI/Perps/Views/PerpsTPSLRouter/PerpsTPSLRouter.tsx`; `app/components/UI/Perps/routes/index.tsx` `PerpsAdjustMarginRouter`, `PerpsConfirmScreen`; `app/components/Views/confirmations/components/info-root/info-root.tsx`

## PerpsHomeView

Lite landing screen with positions, open orders, watchlist and recent activity.

| Components                                                                                                                                                                                          | Hooks                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PerpsMarketBalanceActions`, `PerpsCard`, `PerpsWatchlistMarkets`, `PerpsMarketTypeSection`, `PerpsRecentActivityList`; embedded `PerpsCloseAllPositionsView` and `PerpsCancelAllOrdersView` sheets | `usePerpsHomeData`, `usePerpsHomeActions`, `usePerpsNavigation`, `usePerpsHeaderEntryNavigation`, `usePerpsMeasurement`, `usePerpsEventTracking` |

- Enters from the Lite entry points above.
- Leaves to `MARKET_DETAILS` (tap a market) and `MARKET_LIST`.
- Close all and cancel all open as embedded sheets, not routes.
- The Lite pill switches to Pro through `getProSwitchTarget`.
- Tracks a screen view with `screen_type` `perps_home` and the route `source`.

Code: `app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx` `PerpsHomeView`

## PerpsMarketListView

Market browser with search, sort, category filter and watchlist.

| Components                                                                                                                           | Hooks                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `PerpsMarketList`, `PerpsMarketFiltersBar`, `PerpsMarketSortFieldBottomSheet`, `PerpsMarketBalanceActions`, `PerpsMarketRowSkeleton` | `usePerpsMarketListView`, `usePerpsMeasurement`, `usePerpsEventTracking`, `usePerpsNavigation` |

- `usePerpsMarketListView` returns `markets`, `searchState`, `sortState`, `favoritesState`, `marketTypeFilterState`, `recentlyViewedState`, `marketCounts`, `isLoading` and `error`.
- The route param `defaultMarketTypeFilter` preselects a category.
- Sort fields come from Core ([architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md)).
- Enters from Home sections, deeplinks and Pro entry points in the TAT-4021 treatment. Leaves to `MARKET_DETAILS` (`handleMarketPress`).

Code: `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx` `PerpsMarketListView`; `app/components/UI/Perps/hooks/usePerpsMarketListView.ts` `usePerpsMarketListView`

## PerpsMarketDetailsView (Lite)

Single-market screen with chart, stats and trade actions. `PerpsMarketDetailsRouter` renders it when Pro mode is off.

| Components                                                                                                                                                                                                                                                                   | Hooks                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsMarketHeader`, `TradingViewChart`, `CandlePeriodSelector` (from `app/components/UI/Charts`), `PerpsMarketSocialTabs`, `PerpsOICapWarning`, `PerpsMarketHoursBanner`, `PerpsFlipPositionConfirmSheet`, `PerpsStopLossPromptBanner`, `PerpsSelectAdjustMarginActionView` | `usePerpsMarketStats`, `useHasExistingPosition`, `usePerpsOICap`, `usePerpsDataMonitor`, `usePerpsMeasurement`, `usePerpsLiveOrders`, `usePerpsLiveAccount`, `usePerpsTPSLUpdate`, `usePerpsSharePosition`, `usePerpsMarketDetailSession` |

- Route params are `market` (full or partial `PerpsMarketData`), plus optional `direction`, `initialTab`, `source` and analytics fields.
- The chart overlays entry, TP, SL and liquidation lines from the open position, plus one line per resting limit order.
- Leaves to the order confirmation (`navigateToOrder`), `CLOSE_POSITION`, `TPSL`, `PNL_HERO_CARD` (share) and the adjust-margin action sheet.
- Enters from Home, the market list, deeplinks and activity entries.

Code: `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx` `PerpsMarketDetailsView`; `app/components/UI/Perps/utils/chartOverlayLines.ts`; `app/components/UI/Perps/types/navigation.ts` `PerpsMarketDetails`

## PerpsProMarketView (Pro)

Pro layout for `MARKET_DETAILS`, with an inline order form and a positions panel. It is the landing screen in Pro mode.

### Open order edit

Users edit the limit price or size of eligible open limit orders in place (venue modify, not cancel and replace). Tapping the price or size row, or Edit, opens a bottom sheet. Confirm applies an optimistic patch, calls `editOrder`, and rolls back on failure.

| Component or hook                  | Role                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `PerpsProOrderCard`                | Order row with tappable price and size rows                     |
| `PerpsProOrderEditSheets`          | Renders the limit-price or size sheet from shared edit state    |
| `PerpsLimitPriceBottomSheet`       | Limit price keypad, also used by `PerpsOrderView`               |
| `PerpsOrderSizeBottomSheet`        | Size keypad with minimum-notional and incremental-margin checks |
| `usePerpsProOrderEdit`             | Sheet state, confirm handler, optimistic apply and rollback     |
| `usePerpsProPositionsPanelActions` | Wires panel handlers and `renderOrderEditSheets()`              |

`isLimitOrderEditable` allows open, unfilled, non-trigger limits only. Size edit is also blocked when TP/SL children are attached.

| Constant                                                | testID                              |
| ------------------------------------------------------- | ----------------------------------- |
| `PerpsProMarketViewSelectorsIDs.ORDER_EDIT`             | `perps-pro-market-order-edit`       |
| `PerpsProMarketViewSelectorsIDs.ORDER_PRICE_EDIT`       | `perps-pro-market-order-price-edit` |
| `PerpsProMarketViewSelectorsIDs.ORDER_SIZE_EDIT`        | `perps-pro-market-order-size-edit`  |
| `PerpsOrderSizeBottomSheetSelectorsIDs.SIZE_DISPLAY`    | `perps-order-size-display`          |
| `PerpsOrderSizeBottomSheetSelectorsIDs.CONFIRM_BUTTON`  | `perps-order-size-confirm-button`   |
| `PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON` | `perps-limit-price-confirm-button`  |

Code: `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderCard.tsx`, `PerpsProOrderEditSheets.tsx`; `app/components/UI/Perps/hooks/usePerpsProOrderEdit.tsx`, `usePerpsProPositionsPanelActions.tsx`; `app/components/UI/Perps/utils/orderUtils.ts` `isLimitOrderEditable`; `app/components/UI/Perps/Perps.testIds.ts`

## PerpsOrderView

Lite order form. It has no Perps-stack route. It renders as the confirmation body for `TransactionType.perpsDepositAndOrder`.

| Components                                                                                                | Hooks                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsOrderHeader`, `PerpsAmountDisplay`, `PerpsSlider`, `PerpsFeesDisplay`, `PerpsLimitPriceBottomSheet`, `PerpsAccountUnsupportedModal` | `usePerpsOrderForm` (through `PerpsOrderContext`), `usePerpsOrderFees`, `usePerpsRewards`, `usePerpsOrderValidation`, `usePerpsLivePrices`, `usePerpsOrderExecution`, `usePerpsAccountSupport`, `usePerpsLiteOrderSubmitGate`, `usePerpsOrderSubmit`, `usePerpsMeasurement`, `usePerpsEventTracking` |

- Params are `PerpsOrderRouteParams`, including `direction`, `asset`, `providerId`, `leverage`, `amount`, `price`, `orderType`, `existingPosition`, `hideTPSL`, `source` and `useBottomSheet`.
- Form state holds amount (USD), leverage, order type, limit price and direction. `usePerpsOrderFees` computes the fee, discount and rewards.
- `navigateToOrder` creates the deposit-and-order transaction, then opens `CONFIRMATIONS`. When the order provider is Lighter it opens `BALANCE_ORDER` instead.
- Submit runs through a support gate: `usePerpsLiteOrderSubmitGate` retires attempts on context changes and `usePerpsAccountSupport` (backed by Core `getAccountSupport`) blocks unsupported accounts, explaining through `PerpsAccountUnsupportedModal` or the Trade sheet's `accountUnsupported` screen.
- Submit orchestration — validation settle, the pay-with-token deposit branch, direct placement and the post-deposit re-entry — lives in `usePerpsOrderSubmit`.
- TP/SL opens from the form before submit (`TPSL`). See [tpsl.md](./tpsl.md).

Code: `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx` `PerpsOrderView`; `app/components/UI/Perps/contexts/PerpsOrderContext.tsx` `PerpsOrderProvider`; `app/components/UI/Perps/hooks/usePerpsNavigation.ts` `navigateToOrder`; `app/components/UI/Perps/hooks/usePerpsAccountSupport.ts`, `usePerpsOrderSubmitGate.ts`, `usePerpsOrderSubmit.ts`; `app/components/UI/Perps/components/PerpsAccountUnsupportedModal/PerpsAccountUnsupportedModal.tsx`; `app/components/UI/Perps/types/navigation.ts` `PerpsOrderRouteParams`

## PerpsBalanceOrderView

Lighter order entry for users with an existing venue balance. It reuses the Pro order form without a deposit transaction and without changing the Lite/Pro preference. It applies when the order provider is `lighter`.

| Item   | Value                                                                          |
| ------ | ------------------------------------------------------------------------------ |
| Route  | `Routes.PERPS.BALANCE_ORDER`                                                   |
| From   | Lite market Long/Short (`navigateToOrder`), token-details `PerpsOrderRedirect` |
| Params | `PerpsOrderRouteParams`                                                        |
| Back   | Previous Lite or token-details screen                                          |

| Constant                                      | testID                      |
| --------------------------------------------- | --------------------------- |
| `PerpsBalanceOrderViewSelectorsIDs.CONTAINER` | `perps-balance-order`       |
| `PerpsBalanceOrderViewSelectorsIDs.BACK`      | `perps-balance-order-back`  |
| `PerpsBalanceOrderViewSelectorsIDs.ERROR`     | `perps-balance-order-error` |

Code: `app/components/UI/Perps/Views/PerpsBalanceOrderView/PerpsBalanceOrderView.tsx` `PerpsBalanceOrderView`; `app/components/UI/Perps/hooks/usePerpsNavigation.ts` `navigateToOrder`; `app/components/UI/Perps/Views/PerpsOrderRedirect.tsx`

## PerpsClosePositionView

Close a position fully or partly, at market or limit. `PerpsClosePositionRouter` shows it in the A/B control arm and `PerpsClosePositionBottomSheet` in treatment.

| Components                                                                                                 | Hooks                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsOrderHeader`, `PerpsAmountDisplay`, `PerpsSlider`, `PerpsCloseSummary`, `PerpsLimitPriceBottomSheet` | `usePerpsClosePositionForm`, which wraps `usePerpsClosePosition`, `usePerpsClosePositionValidation`, `usePerpsOrderFees`, `usePerpsRewards`, `usePerpsLivePrices` and `usePerpsMeasurement` |

- Params are `{ position }`. State is close percentage, close amount in USD, order type and limit price.
- `closeAmount` comes from `calculateCloseAmountFromPercentage` on the absolute live position size and the market's `szDecimals`, or is the exact token amount typed on the keypad. `closingValue = positionValue * (closePercentage / 100)`.
- Receive, margin returned, PnL and fee come from Core `estimateCloseReceive` ([architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md)).
- Confirm calls `handleClosePosition`. Dismiss calls `navigation.goBack()`, or the sheet's `dismiss` override.
- Enters from market details and the modify action sheet (Reduce).

Code: `app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView.tsx`; `app/components/UI/Perps/hooks/usePerpsClosePositionForm.ts` `usePerpsClosePositionForm`; `app/components/UI/Perps/utils/positionCalculations.ts` `calculateCloseAmountFromPercentage`; `app/components/UI/Perps/hooks/usePerpsNavigation.ts` `navigateToClosePosition`

## PerpsCloseAllPositionsView

Bottom sheet that closes every open position. Shows the total receive and P&L, plus a margin row when a margin mode applies.

| Components                        | Hooks                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BottomSheet`, `PerpsCloseTotals` | `usePerpsLivePositions`, `usePerpsLivePrices`, `usePerpsCloseAllCalculations`, `usePerpsCloseAllPositions`, `usePerpsToasts`, `usePerpsEventTracking` |

- Confirm makes one batch call, `PerpsController.closePositions({ symbols })`.
- Runs embedded in Home through an external `sheetRef`, or as the `MODALS.CLOSE_ALL_POSITIONS` route.

Code: `app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView.tsx`; `app/components/UI/Perps/hooks/usePerpsCloseAllPositions.ts`

## PerpsCancelAllOrdersView

Bottom sheet that cancels every pending order without closing positions.

| Components    | Hooks                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `BottomSheet` | `usePerpsLiveOrders` (`hideTpSl: true`), `usePerpsCancelAllOrders`, `usePerpsToasts`, `usePerpsEventTracking` |

- Confirm makes one batch call, `PerpsController.cancelOrders`, then shows a toast and closes.
- Embedded in Home, or the `MODALS.CANCEL_ALL_ORDERS` route.

Code: `app/components/UI/Perps/Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView.tsx`; `app/components/UI/Perps/hooks/usePerpsCancelAllOrders.ts`

## PerpsTPSLView

Take-profit and stop-loss editor, by price or RoE percentage. `PerpsTPSLRouter` renders it as a sheet or a screen.

| Components                                                                         | Hooks                                                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Keypad`; `formatPerpsFiat`, `PRICE_RANGES_UNIVERSAL`, `PRICE_RANGES_MINIMAL_VIEW` | `usePerpsTPSLForm`, `usePerpsLivePrices`, `usePerpsLiquidationPrice`, `usePerpsEventTracking` |

- Params include `asset`, `direction`, `position`, `leverage`, `marginMode`, `orderType`, `limitPrice`, `amount`, `useBottomSheet`, `onBeforeConfirm` and `onConfirm`.
- `onConfirm(position?, takeProfitPrice?, stopLossPrice?, trackingData?)`.
- Price and position updates are throttled to 1000 ms (`TP_SL_VIEW_CONFIG`).
- Enters from the order form and market details. Back returns to the previous screen.

Code: `app/components/UI/Perps/Views/PerpsTPSLView/PerpsTPSLView.tsx`; `app/components/UI/Perps/types/navigation.ts` `PerpsTPSL`; `app/components/UI/Perps/constants/perpsConfig.ts` `TP_SL_VIEW_CONFIG`

## PerpsAdjustMarginView

Add or remove margin on a position. `mode` picks the direction.

| Components                                                             | Hooks                                                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsSlider`, `PerpsAmountDisplay`, `Keypad`, `PerpsValidationErrors` | `usePerpsMarginAdjustment`, `usePerpsAdjustMarginData` (wraps `usePerpsLiveAccount`, `usePerpsMarkets`, `usePerpsLivePrices`), `usePerpsMeasurement` |

- Params are `{ position, mode: 'add' | 'remove' }`.
- Maximum removable margin comes from Core `calculateMaxRemovableMargin` ([architecture.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/architecture.md)).
- Confirm calls `handleAddMargin` or `handleRemoveMargin`, then goes back on success.
- Enters from market details or the Pro positions panel, through the `PerpsSelectAdjustMarginActionView` sheet.

Code: `app/components/UI/Perps/Views/PerpsAdjustMarginView/PerpsAdjustMarginView.tsx`; `app/components/UI/Perps/hooks/usePerpsAdjustMarginData.ts`; `app/components/UI/Perps/hooks/usePerpsNavigation.ts` `navigateToAdjustMargin`

## PerpsWithdrawView

Legacy withdrawal of USDC to Arbitrum. Home opens it only when `perpsWithdrawConfig` is disabled; otherwise Home starts the withdraw-to-any-token confirmation.

| Components                                                                 | Hooks                                                                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Keypad`, `AvatarToken`, `Badge`, `PerpsBottomSheetTooltip`, `KeyValueRow` | `usePerpsLiveAccount`, `usePerpsWithdrawQuote`, `useWithdrawValidation`, `useWithdrawTokens`, `usePerpsAccountSupport`, `usePerpsEventTracking`, `usePerpsMeasurement` |

- Amount by keypad or 10/25/50/Max. Percentage buttons hide once an amount is entered.
- The minimum is the route's `minAmount` constraint, else Core `WITHDRAWAL_CONSTANTS.DefaultMinAmount`.
- Confirm resolves the venue through Core `resolveWithdrawalRoute()` (the same resolution and refusal `withdraw()` applies), then checks `usePerpsAccountSupport` for the resolved provider before navigating.
- Confirm shows a toast, goes back at once, then calls `controller.withdraw()`.

Code: `app/components/UI/Perps/Views/PerpsWithdrawView/PerpsWithdrawView.tsx` `handleContinue`; `app/components/UI/Perps/hooks/useWithdrawValidation.ts`; `app/components/UI/Perps/hooks/useWithdrawTokens.ts`; `app/components/UI/Perps/hooks/usePerpsHomeActions.ts`

## PerpsHeroCardView

Shareable PnL card carousel with 4 cards (2 positive and 2 negative PnL characters).

| Components                                                                            | Hooks                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------- |
| `ScrollableTabView`, `react-native-view-shot`, `react-native-share`, `PerpsTokenLogo` | `usePerpsEventTracking`, `usePerpsToasts` |

- Params are `{ position, marketPrice?, source? }`. RoE comes from `position.returnOnEquity`; the asset is `position.symbol`.
- Share captures the card and sends `share_message_without_referral_code`.
- Enters from `usePerpsSharePosition` (market details), the close toast, and `PerpsSharePositionView`.

Code: `app/components/UI/Perps/Views/PerpsHeroCardView/PerpsHeroCardView.tsx`; `app/components/UI/Perps/hooks/usePerpsSharePosition.ts`; `app/components/UI/Perps/hooks/usePerpsToasts.tsx`; `app/components/UI/Perps/Views/PerpsSharePositionView/PerpsSharePositionView.tsx`

## Activity and transaction details

- `ACTIVITY` renders the shared `ActivityScreen` with `redirectToPerpsTransactions`. Home recent activity, the market trades list and the Pro view navigate there.
- `navigateToPerpsTransactionDetails` opens the shared `ACTIVITY_DETAILS` when the transaction maps to an activity item. Otherwise it opens `PerpsPositionTransactionView` (trade), `PerpsOrderTransactionView` (order) or `PerpsFundingTransactionView` (funding).
- `PerpsTransactionsView` exists but no route mounts it.

Code: `app/components/UI/Perps/hooks/usePerpsNavigation.ts` `navigateToActivity`; `app/components/UI/Perps/utils/navigateToPerpsTransactionDetails.ts`; `app/components/UI/Perps/Views/PerpsTransactionsView/`

## Unreachable screens

| Screen                  | Route       | Status                                                                                                                                                                                                               |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PerpsPositionsView`    | `POSITIONS` | Registered, no caller. Renders `PerpsPositionCard` rows with no handlers, plus total PnL and margin                                                                                                                  |
| `PerpsRedirect`         | `PERPS_TAB` | Registered, no caller. Shows `PerpsLoader` ('Initializing Perps controller...', 'Connecting to Perps trading...', 'Redirecting to Perps trading...'), then navigates to `WALLET.HOME` and sets `initialTab: 'perps'` |
| `PerpsTransactionsView` | none        | Not mounted                                                                                                                                                                                                          |

Code: `app/components/UI/Perps/Views/PerpsPositionsView/PerpsPositionsView.tsx`; `app/components/UI/Perps/Views/PerpsRedirect.tsx`

## HIP3DebugView

Development-only tool for HyperLiquid HIP-3 multi-DEX. It casts `PerpsController.getActiveProvider()` to `HyperLiquidProvider` and logs to `DevLogger`.

| Feature               | Action                                             |
| --------------------- | -------------------------------------------------- |
| DEX and market select | Pick a HIP-3 DEX, then a market on it              |
| Balance check         | Log balances across DEXs                           |
| Manual transfer       | $10 to the selected DEX, or all back to main       |
| Place order           | $11 order with auto-transfer                       |
| Close position        | Close the first position on the DEX, transfer back |

- Opens from the developer options `PerpsHIP3DebugButton`. No deeplink.
- The route exists only in `__DEV__`. Outside it the view shows "Only available in development builds".

Code: `app/components/UI/Perps/Debug/HIP3DebugView.tsx`; `app/components/UI/Perps/components/PerpsDeveloperOptionsSection/PerpsHIP3DebugButton.tsx`

## Cross margin

Behind `selectPerpsCrossMarginEnabledFlag`. With the flag off, cross positions keep the isolated presentation, except that the Pro position card always shows the venue's margin mode tag.

- `usePerpsCrossMarginSummary` derives account ratio, maintenance margin, account leverage and cross margin usage from `AccountState.crossMarginSummary` and `spotCollateral` through Core `calculateAccountSummary`. The ratio tone is safe below 50%, warning up to 75% and danger above it (`CROSS_MARGIN_RATIO_*_THRESHOLD`).
- The hook throttles its account and positions streams to `CROSS_MARGIN_SUMMARY_THROTTLE_MS`. On `SLOW_CELLULAR` it slows them to 3 s, or 5 s on `LOW` hardware. A `null` tier keeps the default.
- Perps Home and the wallet homepage Perps section show `PerpsCrossMarginRatioBanner` when the tone is warning or danger. On Home, the available balance opens `PerpsBalanceBottomSheet`. The Pro header wallet icon opens the same sheet, which lists the four metrics with a tooltip on each label.
- The Pro order form estimates the liquidation price of a new Cross order with `estimateCrossLiquidationPrice`, on Hyperliquid only. TAT-4668 moves it to Core.
- Position cards (Lite and Pro) tag the margin mode and explain the cross liquidation price through `PerpsCrossMarginInfoButton`. The venue only adjusts isolated margin, so a cross position's margin is read-only.
- Close position and close all show P&L on its own row when any position is cross. Margin then excludes P&L, so Margin + P&L - fees equals Receive.
- An unknown value (spot collateral not published, max leverage loading, no live price) shows `--`, never `0`. Privacy mode masks the ratio figure with the same dots used for other balances.
- The first switch to Cross in the Pro order form opens `PerpsCrossMarginConfirmBottomSheet`. Confirm stores the lowercase account address in `settings.perpsCrossMarginConfirmedAccounts`, so later Cross selections on any market skip the sheet for that account. Go back stores nothing, so the sheet opens again next time. An account switch while the sheet is open closes it, and deleting the wallet clears the stored accounts.

Code: `app/components/UI/Perps/hooks/usePerpsCrossMarginSummary.ts`; `app/components/UI/Perps/utils/crossMarginSummary.ts`; `app/components/UI/Perps/components/PerpsBalanceBottomSheet/`; `app/components/UI/Perps/components/PerpsCrossMarginRatioBanner/`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProCrossMarginConfirm.ts`; `app/components/UI/Perps/selectors/crossMarginConfirmation/`

## Shared patterns

- Live data hooks are `usePerpsLivePrices`, `usePerpsLivePositions`, `usePerpsLiveOrders` and `usePerpsLiveAccount`.
- Close position throttles prices to 1000 ms. TP/SL throttles prices and positions to 1000 ms.
- `usePerpsMeasurement` records screen load times. See [performance/architecture.md](./performance/architecture.md).
- The candle period is persisted in Redux.

Code: `app/components/UI/Perps/hooks/stream/`; `app/components/UI/Perps/hooks/usePerpsClosePositionForm.ts`; `app/components/UI/Perps/hooks/usePerpsMeasurement.ts`; `app/components/UI/Perps/selectors/chartPreferences/index.ts`
