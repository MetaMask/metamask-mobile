# Perp Mixpanel Events Reference - v1.1

---

## Tutorial Events

### Perp Tutorial Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)

### Perp Tutorial Started

Status: ✅ Implemented
**Properties:** Timestamp, Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)

### Perp Tutorial Completed

Status: ✅ Implemented
**Properties:** Timestamp, Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink), Completion Duration, Steps Viewed, View occurences

---

## Account Funding Events

_Note: Uses standard MetaMetrics transaction events (Transaction Added/Confirmed/Failed) with transaction_type = 'perps_deposit', not custom Perps events._

### Perp Funding Input Viewed

Status: ❌ Missing
**Properties:** Timestamp, Source (Tutorial, homescreen Tab, perps Markets screen)

### Perp Funding Review Viewed

Status: ❌ Missing
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
**Properties:** Timestamp, Source (homescreen Tab, perps Markets screen)

### Transaction Added transaction_type == mm_perps_withdrawal

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, SourceAmount, availableAmount

### Transaction Submitted transaction_type == mm_perps_withdrawal

Status: ❌ Missing
**Properties:** Timestamp, SourceAmount

### Transaction Finalized transaction_type == mm_perps_withdrawal Status == confirmed

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, SourceAmount, execution_time

### Transaction Finalized transaction_type == mm_perps_withdrawal Status == failed

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, SourceAmount, Failure Reason

---

## Pre-Trade Events

### Perp Markets Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Source (mainActionButton, positionTab, tutorial, deeplink)

### Perp Asset Search Bar Clicked

Status: ✅ Implemented
**Properties:** Timestamp

### Perp Asset Screen Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Source (Perp market, perp market seach, positionTab, notification, deeplink), Asset, Open Position (boolean)

### Perp Chart Interaction

Status: ✅ Implemented
**Properties:** Timestamp, Interaction Type (tap, zoom, slide), candlePeriodSelected (1min, 3min, 5min etc.)

### Perp Chart time serie changed

Status: ✅ Implemented (via PERPS_CHART_INTERACTION)
**Properties:** Timestamp, Time serie selected

---

## Trade Events

_Note: Trade "transactions" are HyperLiquid SDK operations, not MetaMask on-chain transactions. They bypass TransactionController._

### Perp Trading Screen Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Asset, Direction (Long, Short)

### Perp Order Type Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Asset, Direction (Long, Short), current order type (Market, Limit)

### Perp Order Type Selected

Status: ✅ Implemented
**Properties:** Timestamp, Asset, Direction (Long, Short), selected order type (Market, Limit)

### Perp Order Size Changed

Status: ❌ Skipped - Too much noise (slider interactions)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Input Method (slider, keyboard)

### Perp Leverage Screen Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Asset, Direction (Long, Short)

### Perp Leverage Changed

Status: ✅ Implemented
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage Used, inputMethod (slider, preset)

### Transaction Added transaction_type == mm_perps_trade

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price

### Transaction Submitted transaction_type == mm_perps_trade

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price

### Transaction Finalized transaction_type == mm_perps_trade Status == confirmed

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price, completionDuration

### Perp Trade Transaction Partially filled transaction_type == mm_perps_trade Status == partially_filled

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price, completionDuration, Amount filled, Remaining amount

### Perp Trade Transaction Failed transaction_type == mm_perps_trade Status == failed

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Leverage, Order Size, Margin used, orderType (market, limit), Limit Price, Fees, Asset Price, completionDuration, Failure Reason

---

## Close Position Events

_Note: Position close "transactions" are HyperLiquid SDK operations, not MetaMask on-chain transactions. They bypass TransactionController._

### Perp Homescreen Tab Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Open Position (array: Asset, Leverage, Direction), Perp Account $ Balance

### Perp Position Close Screen Viewed

Status: ✅ Implemented
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Unrealized $PnL, Unrealized %PnL, Source (HomescreenTab, PerpAssetScreen), Received amount

### Perp Position Close Value Changed

Status: ❌ Skipped - Too much noise (slider interactions)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Unrealized $PnL, Unrealized %PnL, Close value (amount), Close percentage (%), orderType (market, limit), Received amount

### Perp Position Close Order Type Changed

Status: ❌ Skipped - Low priority UI interaction
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Unrealized $PnL, Unrealized %PnL, Close value (amount), Close percentage (%), orderType (market, limit), Received amount

### Transaction Added transaction_type == mm_perps_position_close

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount

### Transaction Submitted transaction_type == mm_perps_position_close

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount

### Transaction Finalized transaction_type == mm_perps_position_close Status == confirmed

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount, completionDuration

### Perp Position Close Partially filled transaction_type == mm_perps_position_close Status == partially_filled

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
**Properties:** Timestamp, Asset, Direction (Long, Short), Open Position Size, Order Size, orderType (market, limit), Percentage closed, $PnL, %PnL, Fee, Asset Price, Limit Price, Received amount, completionDuration, Amount filled, Remaining amount

### Perp Position Close Failed transaction_type == mm_perps_position_close Status == failed

Status: ⚠️ Implemented - Not on-chain (HyperLiquid direct)
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
**Properties:** Timestamp, Asset, Direction (Long, Short), Position size, Stop Loss Price, Stop Loss %, source (tradeScreen, positionScreen)

### Take Profit Set

Status: ✅ Implemented
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
**Properties:** Timestamp, Error Type (network, app crash, backend), Error Message

---

## Full Page Modal Events

### Full page modal viewed

Status: ✅ Implemented
**Properties:** Timestamp, Source (homepage, deeplink)

### Full page modal tapped

Status: ✅ Implemented
**Properties:** Timestamp, Source (homepage, deeplink), action_type (Start trading, Skip)

---

## Carousel Events

### Carousel

Status: ✅ Implemented
_TBC if already handled_
