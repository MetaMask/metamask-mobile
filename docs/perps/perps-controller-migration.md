# PerpsController Migration to Core Monorepo

## Overview

This document outlines the plan to migrate `PerpsController` from MetaMask Mobile to a standalone package (`@metamask/perps-controller`) in the MetaMask Core monorepo for reuse across Mobile and Extension.

### Goals

- **Reusability**: Same controller for Mobile and Extension
- **API compatibility**: Minimize changes to method signatures; inject dependencies
- **Protocol agnosticity**: Keep `IPerpsProvider` abstraction for future protocols
- **Observability**: Preserve Sentry/MetaMetrics via injectable interfaces

---

## Architecture Separation

### What STAYS in Mobile (Platform-Specific)

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE-ONLY LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  PerpsConnectionManager (singleton)                          │
│    - Redux store subscription for account/network changes    │
│    - BackgroundTimer for grace periods                       │
│    - Sentry captureException                                 │
│    - trace/endTrace performance monitoring                   │
├─────────────────────────────────────────────────────────────┤
│  PerpsConnectionProvider (React Context)                     │
│    - App/tab visibility lifecycle                            │
│    - UI state polling                                        │
├─────────────────────────────────────────────────────────────┤
│  PerpsStreamManager (React Context)                          │
│    - WebSocket subscription caching                          │
│    - Component-level throttling                              │
├─────────────────────────────────────────────────────────────┤
│  Hooks Layer (usePerps*)                                     │
│    - useLivePrices, usePerpsTrading, etc.                   │
├─────────────────────────────────────────────────────────────┤
│  Views Layer                                                 │
│    - All UI components                                       │
├─────────────────────────────────────────────────────────────┤
│  Mobile Adapters (to be created)                             │
│    - MobilePerpsLogger (implements IPerpsLogger → Sentry)    │
│    - MobilePerpsMetrics (implements IPerpsMetrics → MM)      │
│    - MobileStreamManager (implements IPerpsStreamManager)    │
└─────────────────────────────────────────────────────────────┘
```

### What MOVES to Core (@metamask/perps-controller)

```
┌─────────────────────────────────────────────────────────────┐
│                   CORE PACKAGE LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  PerpsController (BaseController)                            │
│    - initializeProviders()                                   │
│    - disconnect()                                            │
│    - Trading methods (placeOrder, closePosition, etc.)       │
│    - Data methods (getAccountState, getPositions, etc.)      │
│    - State management                                        │
├─────────────────────────────────────────────────────────────┤
│  HyperLiquidProvider (IPerpsProvider)                        │
│    - REST API client (InfoClient, ExchangeClient)            │
│    - WebSocket connections                                   │
│    - Protocol-specific message handling                      │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│    - TradingService, MarketDataService, AccountService       │
│    - EligibilityService, DepositService, DataLakeService     │
├─────────────────────────────────────────────────────────────┤
│  Types & Interfaces                                          │
│    - IPerpsProvider, IPerpsLogger, IPerpsMetrics             │
│    - All domain types (Order, Position, MarketInfo, etc.)    │
├─────────────────────────────────────────────────────────────┤
│  Constants                                                   │
│    - perpsConfig, hyperLiquidConfig, chartConfig             │
├─────────────────────────────────────────────────────────────┤
│  Pure Utilities                                              │
│    - Calculations (order, margin, PnL, position)             │
│    - Formatting, validation, adapters                        │
├─────────────────────────────────────────────────────────────┤
│  Standalone Client (HyperLiquid-specific)                    │
│    - createStandaloneInfoClient()                            │
│    - Read-only queries without full initialization           │
└─────────────────────────────────────────────────────────────┘
```

---

## Initialization Flow

### Mobile-Specific Flow (STAYS IN MOBILE)

```
User enters Perps screen
    ↓
PerpsConnectionProvider mounts (React)
    ↓
PerpsConnectionManager.connect() (Mobile Singleton)
    ├── setupStateMonitoring()
    │       └── Redux subscription (store.subscribe)
    │       └── selectSelectedInternalAccountByScope
    ├── startConnectionTimeout() (30s guard)
    │       └── BackgroundTimer (react-native)
    └── [CALLS INTO CORE] ──────────────────────────┐
                                                     │
```

### Core Package Flow (MOVES TO CORE)

```
                                                     │
    ├── PerpsController.initializeProviders()  ◄────┘
    │       ├── Disconnect existing providers
    │       │       └── provider.disconnect() (close WebSockets)
    │       ├── Create HyperLiquidProvider({
    │       │       isTestnet,
    │       │       hip3Enabled,
    │       │       allowlistMarkets,
    │       │       blocklistMarkets
    │       │   })
    │       │       └── new HttpTransport()
    │       │       └── new InfoClient()
    │       │       └── new ExchangeClient()
    │       │       └── WebSocket setup
    │       ├── wait(RECONNECTION_CLEANUP_DELAY_MS)
    │       └── Set initializationState = INITIALIZED
    │
```

### Mobile-Specific Flow Continues (STAYS IN MOBILE)

```
    ↓
PerpsStreamManager.prewarm() (Mobile)
    ├── Subscribe to 'prices' channel
    ├── Subscribe to 'positions' channel
    ├── Subscribe to 'orders' channel
    └── Cache data for instant UI rendering
    ↓
UI renders with cached data (Mobile)
```

---

## Dependencies to Abstract

### Engine.context Access

**Controllers accessed via Engine.context**:

| Controller              | Package                            | Status           | Method Used                      |
| ----------------------- | ---------------------------------- | ---------------- | -------------------------------- |
| `RewardsController`     | `app/core/Engine/controllers/`     | **Mobile-only**  | `getPerpsDiscountForAccount()`   |
| `NetworkController`     | `@metamask/network-controller`     | **Core package** | `findNetworkClientIdByChainId()` |
| `TransactionController` | `@metamask/transaction-controller` | **Core package** | Transaction submission           |

**Migration strategy**:

| Controller Type                                                 | Strategy                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Core controllers** (NetworkController, TransactionController) | Access via messenger actions (standard core pattern)                       |
| **Mobile-only controllers** (RewardsController)                 | Inject callback: `getFeeDiscount?: (accountId: string) => Promise<number>` |

**Locations** (in `PerpsController.ts`):

| Lines                                    | Current Code                           | After Migration                  |
| ---------------------------------------- | -------------------------------------- | -------------------------------- |
| 1178, 1201, 1251, 1275, 1296, 1314, 1333 | `Engine.context.RewardsController`     | Inject `getFeeDiscount` callback |
| 1178, 1201, 1251, 1275, 1296, 1314, 1333 | `Engine.context.NetworkController`     | Via messenger action             |
| 1351                                     | `Engine.context.TransactionController` | Via messenger action             |

### Analytics & Logging

| Current                     | Lines                                       | After Migration                      |
| --------------------------- | ------------------------------------------- | ------------------------------------ |
| `MetaMetrics.getInstance()` | 1114, 1581-1591                             | `this.options.metrics?.trackEvent()` |
| `Logger.error()`            | 732, 887, 908, 1025, 1226, 1864, 2180       | `this.options.logger?.error()`       |
| `DevLogger.log()`           | 952, 969, 979, 1014, 1036, 1056, 1879, 2167 | `this.options.debugLogger?.log()`    |

### Mobile-Specific Utils

| Current                                   | Usage              | After Migration                              |
| ----------------------------------------- | ------------------ | -------------------------------------------- |
| `getEvmAccountFromSelectedAccountGroup()` | Line 1365          | Pass `accountAddress` as method param        |
| `getStreamManagerInstance()`              | Lines 876, 883-917 | `this.options.streamManager?.pauseChannel()` |

### Intl Utilities

**Analysis**: The `getIntlNumberFormatter` and `getIntlDateTimeFormatter` utilities from `app/util/intl.ts` are **NOT migration blockers**.

**Why NOT a blocker**:

- Uses only standard JavaScript `Intl.NumberFormat` / `Intl.DateTimeFormat` APIs
- No mobile-specific dependencies
- No React Native specific code
- ~70 lines of pure utility code

**Validation against core monorepo**:

- `@metamask/assets-controllers/src/utils/formatters.ts` has `getCachedNumberFormat()` with the same caching approach
- `@metamask/notification-services-controller` uses `Intl.NumberFormat` directly
- No `Intl.DateTimeFormat` caching in core yet (would be new)

**Files using Intl utilities** (in `formatUtils.ts`):

| Function                  | Line      | Usage                                             |
| ------------------------- | --------- | ------------------------------------------------- |
| `formatPnl()`             | 630       | `getIntlNumberFormatter('en-US', {...}).format()` |
| `formatTransactionDate()` | 1031-1041 | `getIntlDateTimeFormatter` for date/time          |
| `formatOrderCardDate()`   | 1052-1061 | `getIntlDateTimeFormatter` for date/time          |
| `formatDateSection()`     | 1094-1100 | `getIntlDateTimeFormatter` for month/day          |

**Action**: Copy `app/util/intl.ts` to core package as `src/utils/intl.ts`. No code changes needed in consuming files.

### Other Mobile Utils

**Additional dependencies discovered in core-bound util files**:

| Dependency              | Source                                | Used By                                           | Core Equivalent                                         | Action                                             |
| ----------------------- | ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `formatWithThreshold`   | `app/util/assets/index.ts`            | `formatUtils.ts` (lines 382, 410, 433)            | None                                                    | Copy function to core (~20 lines)                  |
| `DevLogger`             | `app/core/SDKConnect/utils/DevLogger` | Multiple files                                    | Already planned: `IPerpsDebugLogger`                    | Use injected logger                                |
| `Logger`                | `app/util/Logger`                     | `amountConversion.ts`, `rewardsUtils.ts`          | Already planned: `IPerpsLogger`                         | Use injected logger                                |
| `safeToChecksumAddress` | `app/util/address`                    | `tokenIconUtils.ts`                               | `@metamask/controller-utils` has `toChecksumHexAddress` | Use core package                                   |
| `isIPFSUri`             | `app/util/general`                    | `tokenIconUtils.ts`                               | None                                                    | Keep in mobile (UI-specific)                       |
| `ensureError`           | `app/util/errorUtils.ts`              | All Perps services, controllers, hooks (21 files) | Ready for core - pure utility                           | ✅ Already extracted from `translatePerpsError.ts` |

**Notes on `formatWithThreshold`**:

- Simple formatting helper (~20 lines) that wraps `getIntlNumberFormatter`
- Used for threshold-based number formatting (`<$0.01` style)
- Can be copied to core alongside `intl.ts` utilities

### i18n / Localization (strings())

**Problem**: Several files planned for core contain direct `strings()` calls for localized error messages and labels. Core packages must be i18n-agnostic.

**Files with i18n dependencies**:

| File                       | Usage Count | Example Strings                                      |
| -------------------------- | ----------- | ---------------------------------------------------- |
| `HyperLiquidProvider.ts`   | 20+         | Validation errors (`perps.errors.orderValidation.*`) |
| `hyperLiquidValidation.ts` | 15+         | Validation messages (`perps.errors.validation.*`)    |
| `orderCalculations.ts`     | 5+          | `perps.errors.orderValidation.limitPriceRequired`    |
| `orderUtils.ts`            | 2           | `perps.market.long`, `perps.market.short`            |
| `formatUtils.ts`           | 2           | `perps.today`, `perps.yesterday`                     |
| `transactionTransforms.ts` | 2           | `perps.market.long`, `perps.market.short`            |
| `translatePerpsError.ts`   | All         | Maps error codes to i18n keys (stays in mobile)      |
| `perpsErrorHandler.ts`     | All         | Maps error codes to i18n keys                        |

**Migration strategy**:

| Pattern                           | Strategy                                                             |
| --------------------------------- | -------------------------------------------------------------------- |
| **Error messages**                | Return error codes (enum/string), translate at UI layer              |
| **Validation messages**           | Return structured error objects with code + context, translate in UI |
| **Labels** (long/short)           | Return enum values (`PositionSide.LONG`), translate in UI            |
| **Date labels** (today/yesterday) | Return raw dates, format in UI layer                                 |

**Example refactor**:

```typescript
// BEFORE (in core - BAD)
throw new Error(strings('perps.errors.orderValidation.limitPriceRequired'));

// AFTER (in core - GOOD)
throw new PerpsValidationError({
  code: PerpsErrorCode.LIMIT_PRICE_REQUIRED,
  context: { orderType: 'limit' },
});

// Mobile UI layer handles translation
const message = translatePerpsError(error.code, error.context);
```

**Files that MUST stay in mobile** (i18n layer):

- `translatePerpsError.ts` - Maps error codes to localized strings
- `perpsErrorHandler.ts` - UI-level error formatting

---

## Interfaces to Define

### PerpsControllerOptions

```typescript
export type PerpsControllerOptions = {
  messenger: PerpsControllerMessenger;
  state?: PerpsControllerState;

  // Platform-specific callbacks (optional - graceful degradation if not provided)
  getFeeDiscount?: (caipAccountId: string) => Promise<number>;
  getAccountAddress?: () => string | null;

  // Injectable services (optional)
  logger?: IPerpsLogger;
  metrics?: IPerpsMetrics;
  debugLogger?: IPerpsDebugLogger;
  streamManager?: IPerpsStreamManager;
};
```

### IPerpsLogger

```typescript
export interface IPerpsLogger {
  error(
    error: Error | string,
    options?: {
      tags?: Record<string, string | number>;
      context?: { name: string; data: Record<string, unknown> };
      extras?: Record<string, unknown>;
    },
  ): void;
}
```

### IPerpsMetrics

```typescript
export interface IPerpsMetrics {
  trackEvent(event: {
    category: string;
    action: string;
    properties?: Record<string, unknown>;
  }): void;
  isEnabled(): boolean;
}
```

### IPerpsStreamManager

```typescript
export interface IPerpsStreamManager {
  pauseChannel(channel: string): void;
  resumeChannel(channel: string): void;
}
```

### IPerpsDebugLogger

```typescript
export interface IPerpsDebugLogger {
  log(...args: unknown[]): void;
}
```

---

## Standalone Calls Pattern

**Current Implementation** (PR #24512):

```typescript
// app/components/UI/Perps/utils/standaloneInfoClient.ts
export const createStandaloneInfoClient = (options: {
  isTestnet: boolean;
  timeout?: number;
}): InfoClient => {
  const httpTransport = new HttpTransport({ isTestnet, timeout });
  return new InfoClient({ transport: httpTransport });
};
```

**Core Package Export** (HyperLiquid-specific):

```typescript
// @metamask/perps-controller/src/standalone.ts
export { createStandaloneInfoClient } from './utils/standaloneInfoClient';

// Usage without full perps initialization
import { createStandaloneInfoClient } from '@metamask/perps-controller';

const client = createStandaloneInfoClient({ isTestnet: false });
const markets = await client.meta();
const prices = await client.allMids();
```

---

## Migration Stages

### Stage 1: Document & Prepare ✅

- [x] Document initialization flow
- [x] Identify all dependency categories with line numbers
- [x] Document i18n dependencies and migration strategy
- [x] Define `PerpsErrorCode` enum for validation error cases ✅ (in `perpsErrorCodes.ts`)

### Stage 2: Remove i18n from Core-Bound Files ✅

- [x] Refactor `HyperLiquidProvider.ts` to throw error codes instead of translated strings ✅
- [x] Migrate time formatting strings in `HyperLiquidProvider.ts` ✅ (moved to `usePerpsWithdrawQuote` hook)
- [x] Refactor `hyperLiquidValidation.ts` to return error codes ✅
- [x] Refactor `orderCalculations.ts` to return error codes ✅
- [x] Refactor `orderUtils.ts` to return raw `'long'`/`'short'` strings ✅
- [x] Refactor `formatUtils.ts` to return raw `'Today'`/`'Yesterday'` strings ✅
- [x] Refactor `transactionTransforms.ts` to return raw strings ✅
- [x] Enhance `translatePerpsError.ts` to handle all new error codes ✅
- [x] Extract `ensureError` to shared utility (`app/util/errorUtils.ts`) ✅
- [x] Add `translatePerpsError` to `usePerpsOrderValidation` hook ✅ (protocol errors now translated)

### Stage 3: Refactor Controller In-Place

- [ ] Create interface definitions (IPerpsLogger, IPerpsMetrics, IPerpsDebugLogger, IPerpsStreamManager)
- [ ] Add optional dependency injection to PerpsController constructor
- [ ] Create wrapper functions that use injected deps OR fallback to current behavior
- [ ] Ensure all tests pass with no behavior change

### Stage 4: Create Mobile Adapters

- [ ] Create `MobilePerpsLogger` implementing IPerpsLogger
- [ ] Create `MobilePerpsMetrics` implementing IPerpsMetrics
- [ ] Create `MobileStreamManager` implementing IPerpsStreamManager
- [ ] Wire adapters in mobile's Engine setup

### Stage 5: Extract to Core Package

- [ ] Create `packages/perps-controller/` in core monorepo
- [ ] Move controller, provider, services, types, constants, utils
- [ ] Update mobile to import from `@metamask/perps-controller`
- [ ] Run full test suite

### Stage 6: Extension Integration

- [ ] Create extension adapters (ExtensionPerpsLogger, etc.)
- [ ] Register PerpsController in extension's controller setup
- [ ] Add extension-specific tests

---

## Files to Migrate

### Move to Core

| Category        | Files                                                                                                                                                                  | i18n Removal Required      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Controller**  | `PerpsController.ts`, `perpsErrorCodes.ts`                                                                                                                             | No                         |
| **Provider**    | `providers/HyperLiquidProvider.ts`                                                                                                                                     | **No** (all i18n removed)  |
| **Services**    | `services/*.ts` (TradingService, MarketDataService, AccountService, EligibilityService, DepositService, DataLakeService, FeatureFlagConfigurationService)              | No                         |
| **Types**       | `types/index.ts`, `types/perps-types.ts`, `types/transactionTypes.ts`                                                                                                  | No                         |
| **Constants**   | `constants/perpsConfig.ts`, `constants/hyperLiquidConfig.ts`, `constants/chartConfig.ts`                                                                               | No                         |
| **Utils**       | `orderCalculations.ts`, `marginUtils.ts`, `pnlCalculations.ts`, `positionCalculations.ts`, `hyperLiquidAdapter.ts`, `wait.ts`, `idUtils.ts`, `standaloneInfoClient.ts` | See below                  |
| **Error Utils** | `errorUtils.ts` (already in `app/util/errorUtils.ts`)                                                                                                                  | No - pure utility          |
| **Intl Utils**  | `intl.ts` (copy from `app/util/intl.ts`)                                                                                                                               | No - pure JS Intl wrappers |
| **Formatting**  | `formatWithThreshold` (extract from `app/util/assets/index.ts`)                                                                                                        | No - pure Intl wrapper     |

**Utils i18n removal status**:

| File                       | Original i18n Calls | Status                                 |
| -------------------------- | ------------------- | -------------------------------------- |
| `hyperLiquidValidation.ts` | 15+                 | ✅ Migrated to `PERPS_ERROR_CODES`     |
| `orderCalculations.ts`     | 5+                  | ✅ Migrated to `PERPS_ERROR_CODES`     |
| `orderUtils.ts`            | 2                   | ✅ Returns raw `'long'`/`'short'`      |
| `formatUtils.ts`           | 2                   | ✅ Returns raw `'Today'`/`'Yesterday'` |
| `transactionTransforms.ts` | 2                   | ✅ Returns raw `'long'`/`'short'`      |

**Provider i18n status**:

| File                     | i18n Calls | Status                                                 |
| ------------------------ | ---------- | ------------------------------------------------------ |
| `HyperLiquidProvider.ts` | 0          | ✅ All i18n removed (time formatting moved to UI hook) |

### Keep in Mobile

| Category       | Files                                                      |
| -------------- | ---------------------------------------------------------- |
| **Connection** | `PerpsConnectionManager.ts`, `PerpsConnectionProvider.tsx` |
| **Streams**    | `PerpsStreamManager.tsx`                                   |
| **i18n**       | `translatePerpsError.ts`, `perpsErrorHandler.ts`           |
| **Account**    | `accountUtils.ts`                                          |
| **Hooks**      | All `hooks/*.ts` files                                     |
| **Views**      | All `Views/*.tsx` files                                    |
| **Components** | All `components/*.tsx` files                               |

---

## Verification Plan

1. **Unit Tests**: Run existing tests with mock adapters
2. **Integration**: Test controller initialization with injected dependencies
3. **Mobile E2E**: Full perps flow (connect → trade → disconnect)
4. **Build**: `yarn build` in core monorepo succeeds
5. **Types**: `yarn lint:tsc` passes in both repos

---

## Preparation PRs (Mobile-Only)

These PRs can be merged independently to prepare the codebase for migration without any dependency on the core package.

### PR 1: Remove i18n from Core-Bound Files

**Status**: ✅ Complete | **Priority**: HIGH | **Effort**: Large

**Goal**: Make core-bound files i18n-agnostic by returning error codes instead of translated strings.

**Checklist**:

- [x] Define `PerpsErrorCode` enum in `perpsErrorCodes.ts`
- [x] Refactor `HyperLiquidProvider.ts` - replace `strings()` with error codes ✅
- [x] Refactor `hyperLiquidValidation.ts` - return `PerpsErrorCode` instead of strings
- [x] Refactor `orderCalculations.ts` - return `PerpsErrorCode` instead of strings
- [x] Refactor `orderUtils.ts` - return raw `'long'`/`'short'` strings
- [x] Refactor `formatUtils.ts` - return raw `'Today'`/`'Yesterday'` strings
- [x] Refactor `transactionTransforms.ts` - return raw `'long'`/`'short'` strings
- [x] Enhance `translatePerpsError.ts` - handle all validation error codes
- [x] Extract `ensureError` from `translatePerpsError.ts` to shared `app/util/errorUtils.ts`
- [x] Migrate time formatting strings in `HyperLiquidProvider.ts` ✅ (moved to `usePerpsWithdrawQuote`)
- [x] Add `translatePerpsError` to `usePerpsOrderValidation` ✅ (protocol errors now translated)
- [ ] Verify perps E2E flow works correctly

**All i18n removed from HyperLiquidProvider.ts** - time formatting now handled in UI hook (`usePerpsWithdrawQuote.ts`).

---

### PR 2: Add Dependency Injection to PerpsController

**Status**: 🔲 Not Started | **Priority**: MEDIUM | **Effort**: Medium

**Goal**: Make PerpsController accept optional injected dependencies while maintaining backward compatibility.

**Checklist**:

- [ ] Add `IPerpsLogger` interface to `types/index.ts`
- [ ] Add `IPerpsMetrics` interface to `types/index.ts`
- [ ] Add `IPerpsDebugLogger` interface to `types/index.ts`
- [ ] Add `IPerpsStreamManager` interface to `types/index.ts`
- [ ] Update `PerpsControllerOptions` to accept optional deps
- [ ] Refactor `Logger.error()` calls to use `(this.options.logger ?? Logger).error()`
- [ ] Refactor `MetaMetrics` calls to use `this.options.metrics?.trackEvent()`
- [ ] Refactor `DevLogger` calls to use `this.options.debugLogger?.log()`
- [ ] Refactor `getStreamManagerInstance()` calls to use `this.options.streamManager`
- [ ] Verify perps works with no injected deps (backward compatibility)

---

### PR 3: Abstract RewardsController Access

**Status**: 🔲 Not Started | **Priority**: LOW | **Effort**: Small | **Depends on**: PR 2

**Goal**: Replace direct `Engine.context.RewardsController` access with injected callback.

**Checklist**:

- [ ] Add `getFeeDiscount?: (accountId: string) => Promise<number>` to options
- [ ] Replace all `Engine.context.RewardsController.getPerpsDiscountForAccount()` calls
- [ ] Wire `getFeeDiscount` callback in Engine setup
- [ ] Verify fee discounts still work correctly

---

### PR 4: Create Mobile Adapters

**Status**: 🔲 Not Started | **Priority**: LOW | **Effort**: Small | **Depends on**: PR 2

**Goal**: Create adapter implementations that wrap mobile-specific services.

**Checklist**:

- [ ] Create `adapters/MobilePerpsLogger.ts` implementing `IPerpsLogger`
- [ ] Create `adapters/MobilePerpsMetrics.ts` implementing `IPerpsMetrics`
- [ ] Create `adapters/MobilePerpsDebugLogger.ts` implementing `IPerpsDebugLogger`
- [ ] Create `adapters/MobileStreamManager.ts` implementing `IPerpsStreamManager`
- [ ] Wire adapters in Engine/controller setup
- [ ] Verify functionality unchanged

---

### Recommended PR Order

```
PR 1 (i18n removal) ─────────────────────────────────┐
                                                      ├──► PR 3 (RewardsController) ──┐
PR 2 (dependency injection) ─────────────────────────┘                                 ├──► Migration to Core
                                                                                       │
                                                      PR 4 (adapters) ─────────────────┘
```

**Notes**:

- PRs 1 and 2 can be worked on in parallel
- PRs 3 and 4 depend on PR 2
- PR 4 can wait until core package exists

---

## Related Documentation

- [Perps Architecture](./perps-architecture.md) - Overall architecture overview
- [Connection Architecture](./perps-connection-architecture.md) - Connection lifecycle and warmup process
- [HyperLiquid Init Flow](./hyperliquid/init-flow.md) - API calls during initialization
