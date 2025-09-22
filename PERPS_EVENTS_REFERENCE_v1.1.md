# Perp Mixpanel Events Reference - v1.1

This document serves as the definitive reference for all Perp-related Mixpanel events as specified in "Perp Mixpanel events - Events v1.1.pdf". Use this as a checklist to track implementation status and ensure exact compliance with the specification.

## Legend

- ✅ Implemented & Verified
- ❌ Not Implemented
- ⚠️ Partially Implemented / Needs Review
- 🔄 Implementation in Progress

---

## Tutorial Events

### [ ] Perp Tutorial Viewed

**Properties:**

- Timestamp
- Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)

### [ ] Perp Tutorial Started

**Properties:**

- Timestamp
- Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)

### [ ] Perp Tutorial Completed

**Properties:**

- Timestamp
- Source (banner, notification, mainActionButton, positionTab, perpMarkets, deeplink)
- Completion Duration
- Steps Viewed
- View occurences

---

## Account Funding Events

_Note: Implemented by Confirmation team_

### [ ] Perp Funding Input Viewed

**Properties:**

- Timestamp
- Source (Tutorial, homescreen Tab, perps Markets screen)

### [ ] Perp Funding Review Viewed

**Properties:**

- Timestamp
- Source Chain
- SourceAsset
- SourceAmount
- networkFee

### [ ] Transaction Added (transaction_type == mm_perps_deposit)

**Properties:**

- Timestamp
- Source Chain
- SourceAsset
- SourceAmount
- networkFee

### [ ] Transaction Submitted (transaction_type == mm_perps_deposit)

**Properties:**

- Timestamp
- Source Chain
- SourceAsset
- SourceAmount
- networkFee

### [ ] Transaction Finalized (transaction_type == mm_perps_deposit, Status == confirmed)

**Properties:**

- Timestamp
- Source Chain
- SourceAsset
- SourceAmount
- networkFee
- execution_time

### [ ] Transaction Finalized (transaction_type == mm_perps_deposit, Status == failed)

**Properties:**

- Timestamp
- Source Chain
- SourceAsset
- SourceAmount
- networkFee
- execution_time
- Failure Reason

---

## Account Withdrawal Events

### [ ] Perp Withdrawal Input Viewed

**Properties:**

- Timestamp
- Source (homescreen Tab, perps Markets screen)

### [ ] Transaction Added (transaction_type == mm_perps_withdrawal)

**Properties:**

- Timestamp
- SourceAmount
- availableAmount

### [ ] Transaction Submitted (transaction_type == mm_perps_withdrawal)

**Properties:**

- Timestamp
- SourceAmount

### [ ] Transaction Finalized (transaction_type == mm_perps_withdrawal, Status == confirmed)

**Properties:**

- Timestamp
- SourceAmount
- execution_time

### [ ] Transaction Finalized (transaction_type == mm_perps_withdrawal, Status == failed)

**Properties:**

- Timestamp
- SourceAmount
- Failure Reason

---

## Pre-Trade Events

### [ ] Perp Markets Viewed

**Properties:**

- Timestamp
- Source (mainActionButton, positionTab, tutorial, deeplink)

### [ ] Perp Asset Search Bar Clicked

**Properties:**

- Timestamp

### [ ] Perp Asset Screen Viewed

**Properties:**

- Timestamp
- Source (Perp market, perp market seach, positionTab, notification, deeplink)
- Asset
- Open Position (boolean)

### [ ] Perp Chart Interaction

**Properties:**

- Timestamp
- Interaction Type (tap, zoom, slide)
- candlePeriodSelected (1min, 3min, 5min etc.)

### [ ] Perp Chart time serie changed

**Properties:**

- Timestamp
- Time serie selected

---

## Trade Events

### [ ] Perp Trading Screen Viewed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)

### [ ] Perp Order Type Viewed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- current order type (Market, Limit)

### [ ] Perp Order Type Selected

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- selected order type (Market, Limit)

### [ ] Perp Order Size Changed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Input Method (slider, keyboard)

### [ ] Perp Leverage Screen Viewed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)

### [ ] Perp Leverage Changed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage Used
- inputMethod (slider, preset)

### [ ] Transaction Added (transaction_type == mm_perps_trade)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Limit Price
- Fees
- Asset Price

### [ ] Transaction Submitted (transaction_type == mm_perps_trade)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Limit Price
- Fees
- Asset Price

### [ ] Transaction Finalized (transaction_type == mm_perps_trade, Status == confirmed)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Limit Price
- Fees
- Asset Price
- completionDuration

### [ ] Perp Trade Transaction Partially filled (transaction_type == mm_perps_trade, Status == partially_filled)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Limit Price
- Fees
- Asset Price
- completionDuration
- Amount filled
- Remaining amount

### [ ] Perp Trade Transaction Failed (transaction_type == mm_perps_trade, Status == failed)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Limit Price
- Fees
- Asset Price
- completionDuration
- Failure Reason

---

## Close Position Events

### [ ] Perp Homescreen Tab Viewed

**Properties:**

- Timestamp
- Open Position (array: Asset, Leverage, Direction)
- Perp Account $ Balance

### [ ] Perp Position Close Screen Viewed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Unrealized $PnL
- Unrealized %PnL
- Source (HomescreenTab, PerpAssetScreen)
- Received amount

### [ ] Perp Position Close Value Changed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Unrealized $PnL
- Unrealized %PnL
- Close value (amount)
- Close percentage (%)
- orderType (market, limit)
- Received amount

### [ ] Perp Position Close Order Type Changed

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Unrealized $PnL
- Unrealized %PnL
- Close value (amount)
- Close percentage (%)
- orderType (market, limit)
- Received amount

### [ ] Transaction Added (transaction_type == mm_perps_position_close)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Order Size
- orderType (market, limit)
- Percentage closed
- $PnL
- %PnL
- Fee
- Asset Price
- Limit Price
- Received amount

### [ ] Transaction Submitted (transaction_type == mm_perps_position_close)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Order Size
- orderType (market, limit)
- Percentage closed
- $PnL
- %PnL
- Fee
- Asset Price
- Limit Price
- Received amount

### [ ] Transaction Finalized (transaction_type == mm_perps_position_close, Status == confirmed)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Order Size
- orderType (market, limit)
- Percentage closed
- $PnL
- %PnL
- Fee
- Asset Price
- Limit Price
- Received amount
- completionDuration

### [ ] Perp Position Close Partially filled (transaction_type == mm_perps_position_close, Status == partially_filled)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Order Size
- orderType (market, limit)
- Percentage closed
- $PnL
- %PnL
- Fee
- Asset Price
- Limit Price
- Received amount
- completionDuration
- Amount filled
- Remaining amount

### [ ] Perp Position Close Failed (transaction_type == mm_perps_position_close, Status == failed)

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Open Position Size
- Order Size
- orderType (market, limit)
- Percentage closed
- $PnL
- %PnL
- Fee
- Asset Price
- Limit Price
- Received amount
- completionDuration
- Failure Reason

---

## Push Notifications Events

_Note: Implemented by Assets team_

### [ ] Perp Push Notification Received

**Properties:**

- Timestamp
- Asset
- Notification Type (PositionLiquidated, TP executed, SL executed, Limit order executed)
- Position Size
- $PnL

### [ ] Perp Push Notification Clicked

**Properties:**

- Timestamp
- Asset
- Notification Type (PositionLiquidated, TP executed, SL executed, Limit order executed)
- Position Size
- $PnL
- completionDuration

---

## Risk Management Events

### [ ] Stop Loss Set

**Properties:**

- Timestamp
- Asset
- Direction (Long, Short)
- Position size
- Stop Loss Price
- Stop Loss %
- source (tradeScreen, positionScreen)

### [ ] Take Profit Set

**Properties:**

- Timestamp
- Asset
- Position size
- Take Profit Price
- Take Profit %
- source (tradeScreen, positionScreen)

### [ ] Stop Loss Executed

**Properties:**

- Timestamp
- Direction (Long, Short)
- Asset
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Fees
- Asset Price
- estimatedRewards
- position age

### [ ] Take Profit Executed

**Properties:**

- Timestamp
- Direction (Long, Short)
- Asset
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Fees
- Asset Price
- estimatedRewards
- position age

### [ ] Position liquidated

**Properties:**

- Timestamp
- Direction (Long, Short)
- Asset
- Leverage
- Order Size
- Margin used
- orderType (market, limit)
- Fees
- Asset Price
- estimatedRewards
- position age

---

## Error Management Events

### [ ] Warning displayed

**Properties:**

- Timestamp
- Warning Type (minimum deposit, minimum order size, insufficient balance, geo-blocking)
- Warning Message

### [ ] Error Encountered

**Properties:**

- Timestamp
- Error Type (network, app crash, backend)
- Error Message

---

## Full Page Modal Events

### [ ] Full page modal viewed

**Properties:**

- Timestamp
- Source (homepage, deeplink)

### [ ] Full page modal tapped

**Properties:**

- Timestamp
- Source (homepage, deeplink)
- action_type (Start trading, Skip)

---

## Carousel Events

### [ ] Carousel (TBC if already handled)

_Note: To be confirmed if already handled elsewhere_

---

## Implementation Notes

### Teams Responsible:

- **Confirmation team**: Account funding events (deposits)
- **Assets team**: Push notification events

### Key Transaction Types:

- `mm_perps_deposit` - Account funding transactions
- `mm_perps_withdrawal` - Account withdrawal transactions
- `mm_perps_trade` - Trading transactions
- `mm_perps_position_close` - Position closing transactions

### Status Values:

- `confirmed` - Successful transaction
- `failed` - Failed transaction
- `partially_filled` - Partially executed order

### Common Properties:

- **Timestamp**: Present in all events
- **Asset**: Trading asset (BTC, ETH, etc.)
- **Direction**: Long or Short position
- **Source**: Where the action was initiated from
- **orderType**: market or limit orders

---

## Validation Checklist

Before marking any event as ✅ Implemented & Verified:

1. **Event Name**: Exact match with specification
2. **All Required Properties**: Present and correctly named
3. **Property Values**: Match expected format/options
4. **Transaction Types**: Correct transaction_type values
5. **Status Handling**: All status scenarios covered
6. **Source Attribution**: All source options implemented
7. **Error Scenarios**: Failure cases properly handled
8. **Team Coordination**: Cross-team events properly implemented

---

_Last Updated: Based on Perp Mixpanel events - Events v1.1.pdf_
_Total Events to Implement: 61_
