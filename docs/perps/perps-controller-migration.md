# PerpsController Migration to Core Monorepo

## Overview

This document describes the architecture for migrating `PerpsController` from MetaMask Mobile to a standalone package (`@metamask/perps-controller`) in the MetaMask Core monorepo for reuse across Mobile and Extension.

### Goals

- **Reusability**: Same controller for Mobile and Extension
- **API compatibility**: Method signatures preserved; dependencies injected
- **Protocol agnosticity**: `IPerpsProvider` abstraction supports future protocols
- **Observability**: Sentry/MetaMetrics via injectable interfaces

---

## Architecture

### Platform-Specific Layer (Stays in Mobile)

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE-ONLY LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  PerpsConnectionManager - Redux subscriptions, BackgroundTimer│
│  PerpsConnectionProvider - React Context, app visibility     │
│  PerpsStreamManager - WebSocket caching, component throttling│
│  Hooks Layer - useLivePrices, usePerpsTrading, etc.         │
│  Views Layer - All UI components                             │
│  translatePerpsError.ts - i18n error translation            │
│  adapters/mobileInfrastructure.ts - Engine access wrapper   │
└─────────────────────────────────────────────────────────────┘
```

### Core Package Layer (@metamask/perps-controller)

```
┌─────────────────────────────────────────────────────────────┐
│                   CORE PACKAGE LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  PerpsController - State management, trading orchestration   │
│  HyperLiquidProvider - REST/WebSocket clients                │
│  Services - Trading, Account, Market, Deposit, etc.          │
│  Types & Interfaces - IPerpsProvider, IPerpsPlatformDeps    │
│  Constants - perpsConfig, hyperLiquidConfig                 │
│  Pure Utilities - Calculations, validation, formatting      │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependency Injection Architecture

All platform-specific functionality is injected via `IPerpsPlatformDependencies`:

```typescript
interface IPerpsPlatformDependencies {
  // Observability (stateless utilities)
  logger: IPerpsLogger;
  debugLogger: IPerpsDebugLogger;
  metrics: IPerpsMetrics;
  tracer: IPerpsTracer;
  performance: IPerpsPerformance;

  // Platform services
  streamManager: IPerpsStreamManager;

  // Controller access (consolidated)
  controllers: IPerpsControllerAccess;
}
```

### Controller Access Pattern

All controller dependencies are accessed via `deps.controllers.*`:

```typescript
interface IPerpsControllerAccess {
  accounts: IPerpsAccountUtils; // getSelectedEvmAccount, formatAccountToCaipId
  keyring: IPerpsKeyringController; // signTypedMessage
  network: IPerpsNetworkOperations; // getChainIdForNetwork, findNetworkClientIdForChain
  transaction: IPerpsTransactionOperations; // submit
  rewards?: IPerpsRewardsOperations; // getFeeDiscount (optional)
}

// Usage in services
this.deps.controllers.accounts.getSelectedEvmAccount();
this.deps.controllers.keyring.signTypedMessage(params, 'V4');
this.deps.controllers.network.getChainIdForNetwork(networkClientId);
this.deps.controllers.transaction.submit(txParams, options);
this.deps.controllers.rewards?.getFeeDiscount(caipAccountId);
```

---

## Service Architecture

Services use instance-based classes with constructor injection:

```typescript
class TradingService {
  private readonly deps: IPerpsPlatformDependencies;

  constructor(deps: IPerpsPlatformDependencies) {
    this.deps = deps;
  }

  async placeOrder(params: OrderParams, context: ServiceContext): Promise<OrderResult> {
    this.deps.debugLogger.log('Placing order', params);
    // ... business logic
    this.deps.metrics.trackPerpsEvent(PerpsAnalyticsEvent.ORDER_PLACED, { ... });
  }
}
```

### TradingService Controller Dependencies

TradingService requires additional controller-level dependencies set lazily:

```typescript
interface TradingServiceControllerDeps {
  controllers: IPerpsControllerAccess;
  messenger: PerpsControllerMessenger;
}

// Set after PerpsController construction
tradingService.setControllerDependencies({ controllers, messenger });
```

---

## Files Ready for Core

```
controllers/
  ├── PerpsController.ts
  ├── PerpsController.test.ts
  ├── perpsErrorCodes.ts
  ├── types/index.ts
  ├── providers/
  │   └── HyperLiquidProvider.ts (+test)
  └── services/
      ├── AccountService.ts (+test)
      ├── DataLakeService.ts (+test)
      ├── DepositService.ts (+test)
      ├── EligibilityService.ts (+test)
      ├── FeatureFlagConfigurationService.ts (+test)
      ├── MarketDataService.ts (+test)
      ├── RewardsIntegrationService.ts (+test)
      ├── ServiceContext.ts
      └── TradingService.ts (+test)

services/
  ├── HyperLiquidClientService.ts (+test)
  ├── HyperLiquidSubscriptionService.ts (+test)
  └── HyperLiquidWalletService.ts (+test)

utils/
  ├── accountUtils.ts (+test) - pure functions only
  ├── amountConversion.ts (+test)
  ├── hyperLiquidValidation.ts (+test)
  ├── orderCalculations.ts (+test)
  └── orderUtils.ts (+test)
```

## Files Staying in Mobile

```
adapters/
  └── mobileInfrastructure.ts  # Engine bridge adapter

utils/
  └── translatePerpsError.ts   # i18n translation layer (UI)

providers/
  └── PerpsStreamManager.tsx   # React context (UI)
```

---

## Verification

```bash
# Verify no Engine imports in core-bound files (excluding tests)
grep -r "from '.*core/Engine'" app/components/UI/Perps/controllers/*.ts | grep -v ".test.ts"

# Verify no i18n imports in core-bound files
grep -r "from '.*locales/i18n'" app/components/UI/Perps/controllers/
grep -r "strings(" app/components/UI/Perps/controllers/

# Run tests
yarn jest app/components/UI/Perps/ --no-coverage

# ESLint check
npx eslint app/components/UI/Perps/controllers/
```

---

## Next Steps

1. **Core Package**: Create `packages/perps-controller/` in core monorepo
2. **Mobile Update**: Import from `@metamask/perps-controller`
3. **Extension**: Create extension adapters and integrate

---

## Related Documentation

- [Perps Architecture](./perps-architecture.md)
- [Connection Architecture](./perps-connection-architecture.md)
- [HyperLiquid Init Flow](./hyperliquid/init-flow.md)
