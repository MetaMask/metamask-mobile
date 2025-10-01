# Perps Events Reference - v2.0 (Final)

**Last Updated:** Post-consolidation (Phase 1 + Phase 2 + Final optimization complete)
**Total Events:** 8 consolidated events
**Reduction:** 25+ events eliminated from original set

---

## Final Consolidated Events

All Perps events use parameter-based differentiation for maximum consolidation and maintainability.

---

## 1. Transaction Lifecycle Events (4 events)

### `PERPS_WITHDRAWAL_TRANSACTION`

**Purpose:** Withdrawal lifecycle tracking
**Status Parameter:** `initiated` | `submitted` | `executed` | `failed`
**Key Properties:** status, source_amount, completion_duration, failure_reason

### `PERPS_TRADE_TRANSACTION`

**Purpose:** Trade execution lifecycle
**Status Parameter:** `initiated` | `submitted` | `executed` | `partially_filled` | `failed`
**Key Properties:** status, asset, direction, leverage, order_size, order_type, completion_duration

### `PERPS_POSITION_CLOSE_TRANSACTION`

**Purpose:** Position closing lifecycle
**Status Parameter:** `initiated` | `submitted` | `executed` | `partially_filled` | `failed`
**Key Properties:** status, asset, direction, position_size, dollar_pnl, percent_pnl, completion_duration

### `PERPS_ORDER_CANCEL_TRANSACTION`

**Purpose:** Order cancellation lifecycle
**Status Parameter:** `submitted` | `executed` | `failed`
**Key Properties:** status, asset, completion_duration, error_message

---

## 2. User Interaction Events (3 events)

### `PERPS_SCREEN_VIEWED`

**Purpose:** Screen navigation tracking
**Screen Type Parameter:** `markets` | `asset_details` | `trading` | `homescreen` | `position_close` | `leverage` | `tutorial` | `withdrawal`
**Key Properties:** screen_type, asset, source

### `PERPS_UI_INTERACTION`

**Purpose:** All UI interactions (consolidated)
**Interaction Type Parameter:**

- UI: `search_clicked` | `order_type_viewed` | `order_type_selected` | `setting_changed`
- Tutorial: `tutorial_started` | `tutorial_completed`
- Chart: `candle_period_viewed` | `candle_period_changed`
  **Key Properties:** interaction_type, asset, direction, setting_type, candle_period

### `PERPS_RISK_MANAGEMENT`

**Purpose:** Risk management actions
**Action Type Parameter:** `stop_loss_set` | `take_profit_set`
**Key Properties:** action_type, asset, direction, stop_loss_price, take_profit_price

---

## 3. Cross-Cutting Events (1 event)

### `PERPS_ERROR`

**Purpose:** Error tracking across all Perps operations
**Primary Differentiation:** Error Code (specific controller errors)

- Controller errors: `CLIENT_NOT_INITIALIZED` | `CLIENT_REINITIALIZING` | `PROVIDER_NOT_AVAILABLE` | `TOKEN_NOT_SUPPORTED` | `BRIDGE_CONTRACT_NOT_FOUND` | `WITHDRAW_FAILED` | `POSITIONS_FAILED` | `ACCOUNT_STATE_FAILED` | `MARKETS_FAILED` | `ORDER_LEVERAGE_REDUCTION_FAILED` | `UNKNOWN_ERROR`
- Inferred errors: `INSUFFICIENT_BALANCE` | `SLIPPAGE_EXCEEDED` | `MARKET_CLOSED` | `INVALID_POSITION_SIZE` | `INVALID_LEVERAGE` | `INVALID_PRICE`
  **Secondary Categorization:** Error Type (generic categories)
- `network` - Network connectivity issues
- `app_crash` - Application crashes
- `backend` - Backend/API failures
- `validation` - Input validation errors
  **Key Properties:** error_code (or error_type), error_message, operation, asset, direction, order_type
  **Implementation:** Uses `usePerpsErrorTracking()` hook which tracks controller `PERPS_ERROR_CODES` or generic `ERROR_TYPE` categories

---

## Standard Properties

All events include:

- `timestamp` - Event time
- `asset` - Trading pair (CAIP format when applicable)
- `direction` - Trade direction (`long` | `short`)
- `source` - User entry point

Additional properties added contextually based on event type.

---

## Event Usage Examples

```typescript
// Tutorial completed
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PerpsEventProperties.INTERACTION_TYPE]:
    PerpsEventValues.INTERACTION_TYPE.TUTORIAL_COMPLETED,
  [PerpsEventProperties.COMPLETION_DURATION]: 120000,
});

// Trade executed
track(MetaMetricsEvents.PERPS_TRADE_TRANSACTION, {
  [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
  [PerpsEventProperties.ASSET]: 'BTC',
  [PerpsEventProperties.DIRECTION]: PerpsEventValues.DIRECTION.LONG,
});

// Chart period changed
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PerpsEventProperties.INTERACTION_TYPE]:
    PerpsEventValues.INTERACTION_TYPE.CANDLE_PERIOD_CHANGED,
  [PerpsEventProperties.CANDLE_PERIOD]: '1h',
});
```

---

## Final Consolidation Results

**Original Events:** 33+ individual events
**Final Events:** 8 consolidated events
**Total Reduction:** 25+ events eliminated (76% reduction!)

**Consolidation Strategy:**

- Transaction events: Status-based parameters (withdrawal, trade, position close, order cancel)
- UI interactions: All consolidated into single event with type parameters
- Maximum reusability with minimal event count

---

## Implementation Files

**Constants:** `app/components/UI/Perps/constants/eventNames.ts`
**Events:** `app/core/Analytics/MetaMetrics.events.ts`
**Components:** Various Perps components using `usePerpsEventTracking()` hook

---

## Notes

- Deposit events use standard MetaMask transaction events (not Perps-specific)
- Push notification events handled by Assets team
- Backend-triggered events (liquidations, TP/SL executions) require separate implementation
- All "transactions" are HyperLiquid SDK operations, not MetaMask blockchain transactions
- Tutorial and chart events consolidated into UI_INTERACTION for maximum consolidation
