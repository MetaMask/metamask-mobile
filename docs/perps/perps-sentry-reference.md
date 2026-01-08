# Perps Sentry Event Reference

## Overview

This document defines all Sentry performance traces and measurements for the Perps feature. The monitoring system tracks:

- UI screen load performance
- Trading operation execution
- WebSocket connection lifecycle
- API integration timing
- Data fetch operations

## Two Tracing Approaches

### 1. `usePerpsMeasurement` Hook (UI Screens)

**Use for:** Screen/component load performance with conditional completion.

**Location:** `app/components/UI/Perps/hooks/usePerpsMeasurement.ts`

**When to use:**

- Screen load measurements
- Bottom sheet appearances
- UI component rendering
- Any measurement that depends on data loading states

**Pattern:**

```typescript
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { TraceName } from '../../../../../util/trace';

// Simple: Immediate measurement (no conditions)
usePerpsMeasurement({
  traceName: TraceName.PerpsOrderView,
});

// Conditional: Wait for data before completing
usePerpsMeasurement({
  traceName: TraceName.PerpsWithdrawView,
  conditions: [
    !!account?.availableBalance,
    !!destToken,
    availableBalance !== undefined,
  ],
});

// Advanced: Full control
usePerpsMeasurement({
  traceName: TraceName.PerpsPositionDetailsView,
  startConditions: [dataReady],
  endConditions: [renderComplete],
  resetConditions: [userNavigatedAway],
});
```

**How it works:**

- Starts trace immediately (or when `startConditions` met)
- Completes when ALL `conditions`/`endConditions` are true
- Auto-resets when ANY `resetConditions` become true
- Uses unique trace IDs to prevent conflicts

### 2. Direct `trace()` / `setMeasurement()` (Controllers)

**Use for:** Controller operations, WebSocket events, API calls, data fetches.

**Location:** `app/util/trace.ts`

**When to use:**

- Trading operations (placeOrder, closePosition, etc.)
- WebSocket lifecycle events
- API call timing
- Controller-level data fetches
- Sub-operations within traces

**Pattern:**

```typescript
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { setMeasurement } from '@sentry/react-native';
import { v4 as uuidv4 } from 'uuid';

// Basic trace
const traceId = uuidv4();
let traceData:
  | { success: boolean; error?: string; orderId?: string }
  | undefined;

try {
  trace({
    name: TraceName.PerpsPlaceOrder,
    id: traceId,
    op: TraceOperation.PerpsOrderSubmission,
    tags: { provider: 'hyperliquid', orderType: 'market' },
    data: { isBuy: true },
  });

  // Your operation here
  const result = await provider.placeOrder(params);

  // Build trace data as operation progresses
  traceData = { success: true, orderId: result.orderId };
} catch (error) {
  // Build error trace data
  traceData = {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
} finally {
  // Always end trace in finally block
  endTrace({
    name: TraceName.PerpsPlaceOrder,
    id: traceId,
    data: traceData,
  });
}

// Sub-measurement within parent trace
const startTime = performance.now();
const result = await someOperation();
setMeasurement(
  PerpsMeasurementName.PERPS_GET_POSITIONS_OPERATION,
  performance.now() - startTime,
  'millisecond',
);
```

## Event Catalog

### UI Screen Measurements (16 events)

**Purpose:** Track screen load times and user-perceived performance.

| TraceName                   | Conditions Tracked                            | Notes                                                    |
| --------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `PerpsTabView`              | Tab visible, markets loaded, connection ready | Main perps landing                                       |
| `PerpsMarketListView`       | Markets data, prices available                | Market browser (also used for home view for consistency) |
| `PerpsPositionDetailsView`  | Position data, market stats, history loaded   | Position details                                         |
| `PerpsOrderView`            | Current price, market data, account available | Trade entry                                              |
| `PerpsClosePositionView`    | Position data, current price                  | Position exit                                            |
| `PerpsAdjustMarginView`     | Position data, balance/max removable (mode)   | Adjust margin (add/remove) - differentiated by mode tag  |
| `PerpsFlipPositionSheet`    | Position data, fees, current price            | Flip position confirmation bottom sheet                  |
| `PerpsWithdrawView`         | Account balance, destination token            | Withdrawal form                                          |
| `PerpsTransactionsView`     | Order fills loaded                            | History view                                             |
| `PerpsOrderSubmissionToast` | Immediate (shows when toast appears)          | Order feedback                                           |

**Note on PerpsHomeView:** The new home view introduced in TAT-1538 uses `PerpsMarketListView` trace name for consistency with existing metrics, as it replaced the previous market list view. This maintains historical performance comparison capability.

**Measurements (sub-operations):**
| PerpsMeasurementName | Unit | Description |
|---------------------|------|-------------|
| `PERPS_TAB_LOADED` | ms | Tab screen render complete |
| `PERPS_MARKETS_SCREEN_LOADED` | ms | Market list render |
| `PERPS_ASSET_SCREEN_LOADED` | ms | Asset details render |
| `PERPS_TRADE_SCREEN_LOADED` | ms | Order form render |
| `PERPS_CLOSE_SCREEN_LOADED` | ms | Close position render |
| `PERPS_WITHDRAWAL_SCREEN_LOADED` | ms | Withdrawal form render |
| `PERPS_TRANSACTION_HISTORY_SCREEN_LOADED` | ms | History render |
| `PERPS_ORDER_SUBMISSION_TOAST_LOADED` | ms | Toast display |
| `PERPS_ORDER_CONFIRMATION_TOAST_LOADED` | ms | Confirmation toast |
| `PERPS_CLOSE_ORDER_SUBMISSION_TOAST_LOADED` | ms | Close toast |
| `PERPS_CLOSE_ORDER_CONFIRMATION_TOAST_LOADED` | ms | Close confirmation |
| `PERPS_LEVERAGE_BOTTOM_SHEET_LOADED` | ms | Leverage picker |

### Trading Operations (9 events)

**Purpose:** Track order execution, position management, and transaction completion.

| TraceName            | Operation                 | Tags                                                      | Data Attributes                                                   |
| -------------------- | ------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| `PerpsPlaceOrder`    | `PerpsOrderSubmission`    | provider, orderType, market, leverage, isTestnet          | isBuy, orderPrice, success, orderId                               |
| `PerpsEditOrder`     | `PerpsOrderSubmission`    | provider, orderType, market, leverage, isTestnet          | isBuy, orderPrice, success, orderId                               |
| `PerpsCancelOrder`   | `PerpsOrderSubmission`    | provider, market, isTestnet, **isBatch** (batch ops only) | orderId, success, **coinCount** (batch), **successCount** (batch) |
| `PerpsClosePosition` | `PerpsPositionManagement` | provider, coin, closeSize, isTestnet, **isBatch** (batch) | success, filledSize, **closeAll** (batch), **coinCount** (batch)  |
| `PerpsUpdateTPSL`    | `PerpsPositionManagement` | provider, market, isTestnet                               | takeProfitPrice, stopLossPrice, success                           |
| `PerpsUpdateMargin`  | `PerpsPositionManagement` | provider, coin, action, isTestnet                         | amount, success                                                   |
| `PerpsFlipPosition`  | `PerpsPositionManagement` | provider, coin, fromDirection, toDirection, isTestnet     | size, success                                                     |
| `PerpsWithdraw`      | `PerpsOperation`          | assetId, provider, isTestnet                              | success, txHash, withdrawalId                                     |
| `PerpsDeposit`       | `PerpsOperation`          | assetId, provider, isTestnet                              | success, txHash                                                   |

**Batch Operations Pattern:**

- `closePositions()` and `cancelOrders()` use the same trace names as single operations
- Add `isBatch: 'true'` tag to distinguish batch from single operations
- Include `coinCount` or order count in data attributes
- Add `closeAll: 'true'` data attribute when closing all positions
- Batch operations execute individual traces in parallel and aggregate results

### WebSocket Performance (6 events)

**Purpose:** Monitor real-time data connection health and latency.

| TraceName                        | Operation        | Measured Duration            | Notes                 |
| -------------------------------- | ---------------- | ---------------------------- | --------------------- |
| `PerpsConnectionEstablishment`   | `PerpsOperation` | Initial connection + preload | End-to-end first data |
| `PerpsWebSocketConnected`        | `PerpsOperation` | Raw connection time          | Transport only        |
| `PerpsWebSocketFirstPositions`   | `PerpsOperation` | Time to first position data  | Data latency          |
| `PerpsWebSocketFirstOrders`      | `PerpsOperation` | Time to first order data     | Data latency          |
| `PerpsWebSocketFirstAccount`     | `PerpsOperation` | Time to first account data   | Data latency          |
| `PerpsAccountSwitchReconnection` | `PerpsOperation` | Account switch full cycle    | Cleanup + reconnect   |

**Measurements (sub-operations):**
| PerpsMeasurementName | Unit | Description |
|---------------------|------|-------------|
| `PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT` | ms | Transport connection |
| `PERPS_WEBSOCKET_CONNECTION_WITH_PRELOAD` | ms | Connection + data preload |
| `PERPS_WEBSOCKET_FIRST_POSITION_DATA` | ms | First position received |
| `PERPS_WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION` | ms | Account switch timing |
| `PERPS_PROVIDER_INIT` | ms | Provider initialization |
| `PERPS_ACCOUNT_STATE_FETCH` | ms | Account state load |
| `PERPS_SUBSCRIPTIONS_PRELOAD` | ms | Subscription setup |
| `PERPS_RECONNECTION_CLEANUP` | ms | Cleanup before reconnect |
| `PERPS_CONTROLLER_REINIT` | ms | Controller restart |
| `PERPS_NEW_ACCOUNT_FETCH` | ms | New account data |
| `PERPS_RECONNECTION_PRELOAD` | ms | Reconnection subscriptions |

### API Integrations (4 events)

**Purpose:** Track external API call timing and reliability.

| TraceName             | Operation        | Purpose                           | Parent Trace                               |
| --------------------- | ---------------- | --------------------------------- | ------------------------------------------ |
| `PerpsRewardsAPICall` | `PerpsOperation` | Fee discount calculation          | Can be standalone or child of order traces |
| `PerpsDataLakeReport` | `PerpsOperation` | Order reporting for notifications | Fire-and-forget                            |

**Measurements:**
| PerpsMeasurementName | Unit | Description |
|---------------------|------|-------------|
| `PERPS_REWARDS_FEE_DISCOUNT_API_CALL` | ms | Fee discount fetch (cached) |
| `PERPS_REWARDS_POINTS_ESTIMATION_API_CALL` | ms | Points calculation (cached) |
| `PERPS_REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL` | ms | Live discount during order |
| `PERPS_DATA_LAKE_API_CALL` | ms | Order report submission |

### Data Fetch Operations (7 events)

**Purpose:** Track controller data fetch timing.

| TraceName                     | Operation        | Fetches                 | Notes    |
| ----------------------------- | ---------------- | ----------------------- | -------- |
| `PerpsGetPositions`           | `PerpsOperation` | Active positions        | REST API |
| `PerpsGetAccountState`        | `PerpsOperation` | Account balance, margin | REST API |
| `PerpsGetMarkets`             | `PerpsOperation` | Available markets       | REST API |
| `PerpsOrdersFetch`            | `PerpsOperation` | Open/historical orders  | REST API |
| `PerpsOrderFillsFetch`        | `PerpsOperation` | Trade execution history | REST API |
| `PerpsFundingFetch`           | `PerpsOperation` | Funding rate history    | REST API |
| `PerpsGetHistoricalPortfolio` | `PerpsOperation` | Portfolio value history | REST API |

**Measurements:**
| PerpsMeasurementName | Unit | Description |
|---------------------|------|-------------|
| `PERPS_GET_POSITIONS_OPERATION` | ms | Position fetch within trace |
| `PERPS_GET_OPEN_ORDERS_OPERATION` | ms | Orders fetch within trace |

### Market Data Updates (1 event)

**Purpose:** Track real-time price update subscriptions.

| TraceName               | Operation         | Subscription Duration        | Data                                         |
| ----------------------- | ----------------- | ---------------------------- | -------------------------------------------- |
| `PerpsMarketDataUpdate` | `PerpsMarketData` | Active subscription lifetime | symbols, includeMarketData, includeOrderBook |

## Adding New Events

### Adding a UI Screen Measurement

**Step 1:** Add TraceName to `app/util/trace.ts`

```typescript
export enum TraceName {
  // ... existing entries
  PerpsYourNewView = 'Perps Your New View',
}
```

**Step 2:** Use hook in your component

```typescript
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { TraceName } from '../../../../../util/trace';

const YourComponent = () => {
  const { data, isLoading } = useSomeData();

  // Track when component is ready
  usePerpsMeasurement({
    traceName: TraceName.PerpsYourNewView,
    conditions: [!isLoading, !!data],
  });

  return <View>...</View>;
};
```

**Step 3:** (Optional) Add measurement for sub-operation

```typescript
// In constants/performanceMetrics.ts
export enum PerpsMeasurementName {
  PERPS_YOUR_OPERATION = 'perps_your_operation',
}

// In your component
import { setMeasurement } from '@sentry/react-native';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';

const startTime = performance.now();
await doSomething();
setMeasurement(
  PerpsMeasurementName.PERPS_YOUR_OPERATION,
  performance.now() - startTime,
  'millisecond',
);
```

### Adding a Controller Operation Trace

**Step 1:** Add TraceName and Operation to `app/util/trace.ts`

```typescript
export enum TraceName {
  PerpsYourOperation = 'Perps Your Operation',
}

export enum TraceOperation {
  PerpsYourCategory = 'perps.your_category',
}
```

**Step 2:** Implement trace in controller

```typescript
import { trace, endTrace, TraceName, TraceOperation } from '../../../../util/trace';
import { v4 as uuidv4 } from 'uuid';

async yourOperation(params: Params): Promise<Result> {
  const traceId = uuidv4();
  let traceData:
    | { success: boolean; error?: string; resultData?: string }
    | undefined;

  try {
    trace({
      name: TraceName.PerpsYourOperation,
      id: traceId,
      op: TraceOperation.PerpsYourCategory,
      tags: {
        provider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
      },
      data: {
        someParam: params.value,
      },
    });

    const result = await this.provider.doSomething(params);

    // Build success trace data
    traceData = { success: true, resultData: result.id };
    return result;
  } catch (error) {
    // Build error trace data
    traceData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    throw error;
  } finally {
    // Always end trace, even on errors
    endTrace({
      name: TraceName.PerpsYourOperation,
      id: traceId,
      data: traceData,
    });
  }
}
```

**Step 3:** (Optional) Add sub-measurement

```typescript
// Within your trace
const subOpStart = performance.now();
const data = await fetchData();
setMeasurement(
  PerpsMeasurementName.PERPS_YOUR_SUB_OPERATION,
  performance.now() - subOpStart,
  'millisecond',
  traceSpan, // Optional: attach to parent span
);
```

## Event Naming Conventions

### TraceName Format

- Pattern: `Perps<Action><Subject>`
- Examples: `PerpsPlaceOrder`, `PerpsWebSocketConnected`, `PerpsTabView`

### TraceOperation Format

- Pattern: `perps.<category>`
- Categories:
  - `perps.operation` - General operations
  - `perps.order_submission` - Order-related operations
  - `perps.position_management` - Position operations
  - `perps.market_data` - Market data subscriptions

### PerpsMeasurementName Format

- Pattern: `PERPS_<CATEGORY>_<ACTION>_<SUBJECT>`
- All uppercase with underscores
- Examples: `PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT`, `PERPS_GET_POSITIONS_OPERATION`

## Performance Markers (Development)

Use these markers with DevLogger for development filtering:

```typescript
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';

DevLogger.log(
  `${PERFORMANCE_CONFIG.LOGGING_MARKERS.SENTRY_PERFORMANCE} Screen loaded`,
  { metric: TraceName.PerpsOrderView },
);
```

**Available markers:**

- `PERPSMARK_SENTRY` - Sentry performance logs
- `PERPSMARK_METRICS` - MetaMetrics events
- `PERPSMARK_SENTRY_WS` - WebSocket performance

**Usage in development:**

```bash
# Filter Sentry logs only
adb logcat | grep PERPSMARK_SENTRY

# Filter WebSocket performance
adb logcat | grep PERPSMARK_SENTRY_WS

# All Perps performance logs
adb logcat | grep PERPSMARK_
```

## Error Logging Best Practices

### Standard Pattern

All errors should be logged with consistent context using `Logger.error()`:

```typescript
import Logger from '../../../../util/Logger';
import { ensureError } from '../utils/perpsErrorHandler';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

try {
  await someOperation();
} catch (error) {
  Logger.error(ensureError(error), {
    feature: PERPS_CONSTANTS.FEATURE_NAME,
    context: 'PerpsController.placeOrder',
    provider: this.state.activeProvider,
    network: this.state.isTestnet ? 'testnet' : 'mainnet',
    message: 'Optional human-readable context',
  });
  throw error;
}
```

### Context Helper Pattern (Controllers)

Controllers should implement a `getErrorContext()` helper for consistency:

```typescript
/**
 * Generate standard error context for Logger.error calls
 * Ensures consistent error reporting to Sentry with minimal but complete context
 */
private getErrorContext(
  method: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    feature: PERPS_CONSTANTS.FEATURE_NAME,
    context: `PerpsController.${method}`,
    provider: this.state.activeProvider,
    network: this.state.isTestnet ? 'testnet' : 'mainnet',
    ...extra,
  };
}

// Usage in catch blocks
try {
  const positions = await this.provider.getPositions(params);
  return positions;
} catch (error) {
  Logger.error(ensureError(error), this.getErrorContext('getPositions'));
  throw error;
}
```

### Required Context Fields

| Field      | Type   | Purpose                         | Example                    |
| ---------- | ------ | ------------------------------- | -------------------------- |
| `feature`  | string | Feature name for Sentry queries | `'perps'`                  |
| `context`  | string | Component + method path         | `'PerpsController.method'` |
| `provider` | string | Active provider name            | `'hyperliquid'`            |
| `network`  | string | Network environment             | `'testnet'` or `'mainnet'` |

### Optional Context Fields

| Field     | Type   | Purpose                 | Example                            |
| --------- | ------ | ----------------------- | ---------------------------------- |
| `message` | string | Human-readable context  | `'Error reconnecting'`             |
| Custom    | any    | Operation-specific data | `{ orderId: '123', asset: 'BTC' }` |

### Error Helper: `ensureError()`

Always wrap caught errors with `ensureError()` to guarantee Error instances:

```typescript
import { ensureError } from '../utils/perpsErrorHandler';

catch (error) {
  // Converts unknown error types to Error instances
  Logger.error(ensureError(error), context);
}
```

### When to Log Errors

1. **Always log** in controller/service catch blocks
2. **Always log** in connection management catch blocks
3. **Always log** in async callbacks that might fail silently
4. **Don't log** in UI components (let errors bubble to controllers)
5. **Don't log** expected validation errors (e.g., insufficient balance)

---

## Best Practices

1. **Always use unique trace IDs** for manual traces with `uuidv4()`
2. **Include success/error data** when ending traces
3. **Use conditions** for UI measurements that depend on data loading
4. **Add tags** for filtering (provider, network, asset, etc.)
5. **Use setMeasurement** for sub-operations within larger traces
6. **Always clean up** in finally blocks
7. **Parent-child relationships**: Pass parent span to child traces for nested measurements
8. **Cache API calls**: Use cached values in Rewards API to avoid redundant calls
9. **Use `Logger.error()` with context** for all error logging (see Error Logging Best Practices)
10. **Use `ensureError()` helper** to normalize caught errors before logging

## Related Files

- **Trace utilities**: `app/util/trace.ts`
- **Measurement hook**: `app/components/UI/Perps/hooks/usePerpsMeasurement.ts`
- **Measurement constants**: `app/components/UI/Perps/constants/performanceMetrics.ts`
- **Config constants**: `app/components/UI/Perps/constants/perpsConfig.ts`
- **Controller**: `app/components/UI/Perps/controllers/PerpsController.ts`
- **WebSocket service**: `app/components/UI/Perps/services/HyperLiquidSubscriptionService.ts`
- **Connection manager**: `app/components/UI/Perps/services/PerpsConnectionManager.ts`
