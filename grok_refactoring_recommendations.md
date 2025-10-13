# Refactoring Recommendations for PerpsController.ts

**Model: Grok-4-0709**

## 1. Analysis of 3 Refactoring Strategies

### Strategy 1: Service Layer Extraction

**Pattern**: Extract business logic into stateless service classes (e.g., TradingService, AccountService) that receive the provider from the controller.

**Pros**:

- Improves modularity and testability by isolating concerns.
- Reduces controller size without altering Redux or lifecycle.
- Easy to unit test services independently.

**Cons**:

- Introduces new classes, potentially increasing bundle size slightly.
- Requires careful dependency injection to avoid tight coupling.

**Risk**: Low - Backward compatible; minimal changes to public API.

**File Structure**:

- `PerpsController.ts` (orchestration only).
- `services/TradingService.ts`, `services/AccountService.ts`, etc.
- Tests split: `PerpsController.test.ts` (integration), `TradingService.test.ts` (unit).

**Compatibility**: High - Controller remains orchestration layer, delegates to services while keeping `initializeProviders()` and `disconnect()` intact. Services use existing HyperLiquidProvider passed from Controller; no overlap with ConnectionManager.

### Strategy 2: Functional Decomposition

**Pattern**: Break logic into pure functions/modules (e.g., trading.ts with functions like `validateOrder()`), imported and called by the controller.

**Pros**:

- Lightweight (no classes, minimal overhead for mobile).
- Promotes pure functions for easier testing and reusability.
- Quick to implement with TypeScript's module system.

**Cons**:

- Less structured than classes; harder to enforce boundaries.
- Functions might grow large if not modularized well.

**Risk**: Medium - Potential for scattered logic if not organized; ensure functions remain stateless.

**File Structure**:

- `PerpsController.ts` (calls functions).
- `modules/trading.ts`, `modules/account.ts`, etc. (exported functions).
- Tests: `trading.test.ts` per module, integrated in `PerpsController.test.ts`.

**Compatibility**: High - Controller orchestrates by calling functions with provider as param. Fits one-way flow; no new managers/providers. ConnectionManager API unchanged.

### Strategy 3: Command Pattern with Handlers

**Pattern**: Extract operations into command handler classes (e.g., PlaceOrderHandler) that encapsulate logic and are invoked by the controller.

**Pros**:

- Encapsulates full operations (e.g., validation + execution) for clean isolation.
- Enhances extensibility for future commands.

**Cons**:

- More boilerplate (handlers with execute methods).
- Higher risk of over-engineering for a mobile app.

**Risk**: Medium-high - Handlers could inadvertently manage state if not careful; ensure they delegate to provider only.

**File Structure**:

- `PerpsController.ts` (invokes handlers).
- `handlers/PlaceOrderHandler.ts`, `handlers/DepositHandler.ts`, etc.
- Tests: Per-handler unit tests + controller integration.

**Compatibility**: Medium - Controller acts as invoker, passing provider to handlers. Compatible with ConnectionManager, but handlers must not introduce lifecycle logic to avoid duplication.

## 2. Recommended Approach

**Chosen Strategy**: Service Layer Extraction.

**Why Chosen**: It balances modularity with simplicity, directly addressing mixed concerns by extracting into services while keeping the controller as a thin orchestration layer. This avoids anti-patterns (no new state/lifecycle/provider layers), respects existing architecture, and improves test isolation without bundle bloat.

**Migration Order**:

1. Extract low-risk, pure logic first: FeeCalculationService and EligibilityService.
2. Then data-related: MarketDataService.
3. Core operations: TradingService and AccountService, updating controller methods to delegate.
4. Finally, refactor WebSocket subscriptions to use services where possible, and migrate tests gradually.

**Interactions with Existing Layers**:

- Controller receives calls from ConnectionManager (e.g., `initializeProviders()` sets up HyperLiquidProvider).
- Controller passes provider instance to services (e.g., `tradingService.placeOrder(provider, params)`).
- Services perform logic (validation, formatting) and delegate to provider for API/WS calls.
- Controller handles Redux updates and analytics post-service calls.
- No direct service access from upper layers (e.g., ConnectionManager → Controller only).

**Test Strategy**:

- Unit test services in isolation (mock provider, focus on logic).
- Update existing controller tests to integration-style (mock services initially, then end-to-end).
- Aim for 80% coverage; run on device simulators for performance checks.
- Limit to 3 fix attempts per file; consult team if needed.

**Explicit Confirmation**: This does not duplicate existing architecture - no new state management (uses Redux), no overlapping managers (services are below Controller, stateless), no new providers (reuses HyperLiquidProvider).

## 3. Code Structure Outline

### File Organization

```
app/core/perps/
├── PerpsController.ts          // ~500 lines: Orchestration, Redux, public API delegates
├── services/                   // Extracted business logic
│   ├── TradingService.ts       // Order placement, editing, cancellation
│   ├── AccountService.ts       // Deposits, withdrawals, balances
│   ├── MarketDataService.ts    // Fetching positions, orders, markets
│   ├── FeeCalculationService.ts // Pure fee/rewards calcs
│   └── EligibilityService.ts   // Geo-blocking, user eligibility
├── tests/                      // Split tests
│   ├── PerpsController.test.ts // Integration tests
│   └── services/               // Unit tests per service
└── (existing) HyperLiquidProvider.ts // Unchanged
```

### Dependency Flow

- ConnectionManager → PerpsController (lifecycle calls like initialize/disconnect)
- PerpsController → Services (passes provider, receives results for Redux updates)
- Services → HyperLiquidProvider (API/WS delegation only)
- One-way: No upward dependencies; services are injected/imported in Controller.

### Interface Boundaries

- Controller public API unchanged (e.g., `placeOrder(params)` delegates to TradingService).
- Services expose methods like `TradingService.placeOrder(options: { provider: HyperLiquidProvider, params: OrderParams }): Promise<Result>`.
- Interfaces: Define `IPerpsService` if needed for mocking, but keep simple.

This keeps Controller as the central orchestration for ConnectionManager while offloading logic.
