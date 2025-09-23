# Perp Mixpanel Events Reference - v1.1

---

## Tutorial Events

### Perp Tutorial Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsTutorialCarousel.tsx:174
**Properties:** Timestamp, Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)

### Perp Tutorial Started

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsTutorialCarousel.tsx:201,270
**Properties:** Timestamp, Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)

### Perp Tutorial Completed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsTutorialCarousel.tsx:232,295
**Properties:** Timestamp, Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink), Completion Duration, Steps Viewed, View occurences

---

## Account Funding Events

_Note: Uses standard MetaMetrics transaction events (Transaction Added/Confirmed/Failed) with transaction_type = 'perps_deposit', not custom Perps events._

### Perp Balance Modal Viewed

Status: ⚠️ Implemented - Not in original spec
**Implementation:** MetaMetrics.events.ts + PerpsBalanceModal.tsx:45
**Properties:** Timestamp, Source (homescreen Tab)

### Perp Funding Input Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + deposit.tsx:47
**Properties:** Timestamp, Source (Tutorial, homescreen Tab, perps Markets screen)

### Perp Funding Review Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + deposit.tsx:47
**Properties:** Timestamp, Source Chain, SourceAsset, SourceAmount, networkFee

### Transaction Added transaction_type == perps_deposit

Status: ⚠️ Implemented via standard TransactionController events
**Properties:** Timestamp, Source Chain, SourceAsset, SourceAmount, networkFee

### Transaction Submitted transaction_type == perps_deposit

Status: ⚠️ Implemented via standard TransactionController events
**Properties:** Timestamp, Source Chain, SourceAsset, SourceAmount, networkFee

### Transaction Finalized transaction_type == perps_deposit Status == confirmed

Status: ⚠️ Implemented via standard TransactionController events
**Properties:** Timestamp, Source Chain, SourceAsset, SourceAmount, networkFee, execution_time

### Transaction Finalized transaction_type == perps_deposit Status == failed

Status: ⚠️ Implemented via standard TransactionController events
**Properties:** Timestamp, Source Chain, SourceAsset, SourceAmount, networkFee, execution_time, Failure Reason

---

## Account Withdrawal Events

_Note: Withdrawal "transactions" are HyperLiquid SDK operations, not MetaMask on-chain transactions. They bypass TransactionController._

### Perp Withdrawal Input Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsWithdrawView.tsx:159
**Properties:** Timestamp, Source (homescreen Tab, perps Markets screen)

### Transaction Added transaction_type == mm_perps_withdrawal

Status: ⚠️ Implemented as PERPS_WITHDRAWAL_INITIATED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsWithdrawView.tsx:243
**Properties:** Timestamp, SourceAmount, availableAmount

### Transaction Submitted transaction_type == mm_perps_withdrawal

Status: ❌ Missing - No separate submitted event exists
**Properties:** Timestamp, SourceAmount

### Transaction Finalized transaction_type == mm_perps_withdrawal Status == confirmed

Status: ⚠️ Implemented as PERPS_WITHDRAWAL_COMPLETED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsWithdrawView.tsx:300
**Properties:** Timestamp, SourceAmount, execution_time

### Transaction Finalized transaction_type == mm_perps_withdrawal Status == failed

Status: ⚠️ Implemented as PERPS_WITHDRAWAL_FAILED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsWithdrawView.tsx:313,349
**Properties:** Timestamp, SourceAmount, Failure Reason

---

## Pre-Trade Events

### Perp Markets Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsMarketListView.tsx:235
**Properties:** Timestamp, Source (mainActionButton, positionTab, tutorial, deeplink)

### Perp Asset Search Bar Clicked

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsMarketListView.tsx:209
**Properties:** Timestamp

### Perp Asset Screen Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsMarketDetailsView.tsx:240
**Properties:** Timestamp, Source (Perp market, perp market seach, positionTab, notification, deeplink), Asset, Open Position (boolean)

### Perp Chart Candle Periods Viewed

Status: ⚠️ Implemented - Not in original PDF spec
**Implementation:** MetaMetrics.events.ts + PerpsCandlePeriodBottomSheet.tsx:60
**Properties:** Timestamp, Asset, candlePeriod (current selection), Source (PerpAssetScreen)
**Note:** Added to track when users actually view the advanced candle period options bottom sheet

### Perp Chart Interaction

Status: ⚠️ Partially Implemented - WebView complexity limits full implementation
**Implementation:** MetaMetrics.events.ts + PerpsMarketDetailsView.tsx:270
**Properties:** Timestamp, Asset, Interaction Type (candle_period_change), candlePeriod (1m, 3m, 5m, etc.)
**Original Spec:** Should track tap, zoom, slide interactions with chart
**Current Implementation:** Only tracks candle period changes - WebView architecture makes direct chart interactions complex to track

### Perp Chart time serie changed

Status: ✅ Implemented (via PERPS_CHART_INTERACTION)
**Implementation:** Same as Perp Chart Interaction above
**Properties:** Timestamp, Time serie selected

---

## Trade Events

_Note: Trade "transactions" are HyperLiquid SDK operations, not MetaMask on-chain transactions. They bypass TransactionController._

### Perp Trading Screen Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsOrderView.tsx:289
**Properties:** Timestamp, Asset, Direction (Long, Short)

### Perp Order Type Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsOrderView.tsx:330
**Properties:** Timestamp, Asset, Direction (Long, Short), current order type (Market, Limit)

### Perp Order Type Selected

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsOrderTypeBottomSheet.tsx:66
**Properties:** Timestamp, Asset, Direction (Long, Short), selected order type (Market, Limit)

### Perp Order Size Changed

Status: 🚫 **CANCELED** - Product decision: Not needed
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Input Method (slider, keyboard)

### Perp Leverage Screen Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsLeverageBottomSheet.tsx:415
**Properties:** Timestamp, Asset, Direction (Long, Short)

### Perp Leverage Changed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsOrderView.tsx:1248
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage Used, inputMethod (slider, preset)

### Transaction Added transaction_type == mm_perps_trade

Status: ✅ Implemented as PERPS_TRADE_TRANSACTION_INITIATED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:778
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price

### Transaction Submitted transaction_type == mm_perps_trade

Status: ✅ Implemented as PERPS_TRADE_TRANSACTION_SUBMITTED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:808
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price

### Transaction Finalized transaction_type == mm_perps_trade Status == confirmed

Status: ✅ Implemented as PERPS_TRADE_TRANSACTION_EXECUTED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:844
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price, completionDuration

### Perp Trade Transaction Partially filled transaction_type == mm_perps_trade Status == partially_filled

Status: ✅ Implemented as PERPS_TRADE_TRANSACTION_PARTIALLY_FILLED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts (partially filled logic)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price, completionDuration, Amount filled, Remaining amount

### Perp Trade Transaction Failed transaction_type == mm_perps_trade Status == failed

Status: ✅ Implemented as PERPS_TRADE_TRANSACTION_FAILED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:897,942
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price, completionDuration, Failure Reason

---

## Close Position Events

_Note: Position close "transactions" are HyperLiquid SDK operations, not MetaMask on-chain transactions. They bypass TransactionController._

### Perp Homescreen Tab Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsTabView.tsx:103
**Properties:** Timestamp, Open Position (array: Asset, Leverage, Direction), Perp Account $ Balance

### Perp Position Close Screen Viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsClosePositionView.tsx:235
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Unrealized $PnL, Unrealized %PnL, Source (HomescreenTab, PerpAssetScreen), Received amount

### Perp Position Close Value Changed

Status: 🚫 **CANCELED** - Product decision: Not needed
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Unrealized $PnL, Unrealized %PnL, Close value (amount), Close percentage (%), orderType (market, limit), Received amount, inputMethod (slider, keyboard, percentage_button)

### Perp Position Close Order Type Changed

Status: ⚠️ Not supported in current UI - Simplified interface
**Original Spec:** Should track when users change between market/limit order types
**Current Implementation:** UI no longer has order type selector - defaults to market order with optional limit price via bottom sheet
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Unrealized $PnL, Unrealized %PnL, Close value (amount), Close percentage (%), orderType (market, limit), Received amount

### Transaction Added transaction_type == mm_perps_position_close

Status: ✅ Implemented as PERPS_POSITION_CLOSE_INITIATED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts (closePosition method)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount

### Transaction Submitted transaction_type == mm_perps_position_close

Status: ✅ Implemented as PERPS_POSITION_CLOSE_SUBMITTED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts (closePosition method)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount

### Transaction Finalized transaction_type == mm_perps_position_close Status == confirmed

Status: ✅ Implemented as PERPS_POSITION_CLOSE_EXECUTED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:1118
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount, completionDuration

### Perp Position Close Partially filled transaction_type == mm_perps_position_close Status == partially_filled

Status: ✅ Implemented as PERPS_POSITION_CLOSE_PARTIALLY_FILLED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:1084
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount, completionDuration, Amount filled, Remaining amount

### Perp Position Close Failed transaction_type == mm_perps_position_close Status == failed

Status: ✅ Implemented as PERPS_POSITION_CLOSE_FAILED - Not on-chain (HyperLiquid direct)
**Implementation:** MetaMetrics.events.ts + PerpsController.ts:1147,1183
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount, completionDuration, Failure Reason

---

## Push Notifications Events

_Implemented by Assets team_

### Perp Push Notification Received

Status: ❌ Missing
**Properties:** Timestamp, Asset, Notification Type (PositionLiquidated, TP executed, SL executed, Limit order executed), Position Size, $PnL

### Perp Push Notification Clicked

Status: ❌ Missing
**Properties:** Timestamp, Asset, Notification Type (PositionLiquidated, TP executed, SL executed, Limit order executed), Position Size, $PnL, completionDuration

---

## Risk Management Events

### Stop Loss Set

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsTPSLBottomSheet.tsx:328
**Properties:** Timestamp, Asset, Direction (Long, Short), Position size, Stop Loss Price, Stop Loss %, source (tradeScreen, positionScreen)

### Take Profit Set

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsTPSLBottomSheet.tsx:342
**Properties:** Timestamp, Asset, Position size, Take Profit Price, Take Profit %, source (tradeScreen, positionScreen)

### Stop Loss Executed

Status: ❌ Backend-triggered - Validation needed
**Properties:** Timestamp, Direction (Long, Short), Asset, Leverage, Order Size, Margin used, orderType (market, limit), Fees, Asset Price, estimatedRewards, position age

### Take Profit Executed

Status: ❌ Backend-triggered - Validation needed
**Properties:** Timestamp, Direction (Long, Short), Asset, Leverage, Order Size, Margin used, orderType (market, limit), Fees, Asset Price, estimatedRewards, position age

### Position liquidated

Status: ❌ Backend-triggered - Validation needed
**Properties:** Timestamp, Direction (Long, Short), Asset, Leverage, Order Size, Margin used, orderType (market, limit), Fees, Asset Price, estimatedRewards, position age

---

## Error Management Events

### Warning displayed

Status: ❌ Missing
**Properties:** Timestamp, Warning Type (minimum deposit, minimum order size, insufficient balance, geo-blocking), Warning Message

### Error Encountered

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + usePerpsErrorTracking.ts + PerpsOrderView.tsx
**Properties:** Timestamp, Error Type (network, app crash, backend), Error Message

---

## Full Page Modal Events

### Full page modal viewed

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsGTMModal.tsx:50
**Properties:** Timestamp, Source (homepage, deeplink)

### Full page modal tapped

Status: ✅ Implemented
**Implementation:** MetaMetrics.events.ts + PerpsGTMModal.tsx:51,60
**Properties:** Timestamp, Source (homepage, deeplink), action_type (Start trading, Skip)

---

## Carousel Events

### Carousel

Status: ⚠️ Implemented - Added for tutorial navigation tracking (not in original spec)
**Implementation:** MetaMetrics.events.ts + PerpsTutorialCarousel.tsx:215,301
**Properties:** Timestamp, previous*screen, current_screen, screen_position, total_screens, navigation_method (swipe, continue_button)
\_Note: This event tracks navigation within the tutorial carousel and was added to provide tutorial engagement insights not covered by the original Tutorial Events section*
