# Refactoring Prompt for LLM Comparison

## Context

I have a TypeScript controller file (`PerpsController.ts`) that has grown too large and needs refactoring:

- **Current Size**: 3,360 lines of code
- **Test File Size**: 1,627 lines
- **Framework**: React Native mobile app using Redux-style BaseController
- **Language**: TypeScript
- **Architecture**: Currently monolithic controller pattern

### Existing Architecture (Must Be Respected)

The controller is part of a larger layered architecture that **must not be replaced**:

```
UI Components → usePerpsConnection hook
              → PerpsConnectionProvider (React Context, polls state)
              → PerpsConnectionManager (Singleton, handles lifecycle/reconnection)
              → PerpsController (Redux, manages providers & data) ← THIS IS TOO LARGE
              → HyperLiquidProvider (Exchange-specific REST + WebSocket)
```

**What Already Exists and Works Well**:

- ✅ `PerpsConnectionManager`: Singleton that orchestrates connection lifecycle, handles reconnection, grace periods (20s), reference counting, account/network change monitoring via Redux subscriptions
- ✅ Redux State Management: All application state stored in Redux via BaseController
- ✅ `HyperLiquidProvider`: Exchange-specific implementation (REST API + WebSocket)
- ✅ Clear layer boundaries with one-way dependency flow

**Constraints**:

- ❌ Cannot introduce new state management (Redux already handles it)
- ❌ Cannot add managers that overlap with ConnectionManager
- ❌ Cannot create new provider abstractions (HyperLiquidProvider exists)
- ❌ Controller must remain compatible with ConnectionManager API (`initializeProviders()`, `disconnect()`)
- ✅ Can extract business logic from Controller while keeping it as orchestration layer

## Current Responsibilities (Mixed Concerns)

1. Provider Management (initialization, switching networks)
2. Trading Operations (place/edit/cancel orders, close positions)
3. Account Management (deposits, withdrawals, balances)
4. Data Fetching (positions, orders, markets, funding)
5. Live Data Subscriptions (WebSocket price/position updates)
6. Fee & Rewards Calculations
7. Geo-blocking & Eligibility
8. Analytics & Error Tracking
9. User State Management (tutorials, first-time user)

## Requirements

1. **Backward Compatibility**: Must maintain existing public API
2. **Testability**: Need to improve unit test isolation
3. **Gradual Migration**: Cannot rewrite all at once
4. **Performance**: No regression in operation latency
5. **Team Constraints**: 3-4 week timeline, 2 developers
6. **Tech Stack**: Must work with existing TypeScript/React Native setup

## Task

Please provide:

1. **Analysis of 3 different refactoring strategies** with:

   - Architecture pattern name
   - Pros and cons
   - Implementation effort (weeks)
   - Risk assessment
   - Expected file structure
   - **Compatibility assessment** (how it works with existing ConnectionManager/Redux)

2. **Your recommended approach** with:

   - Why you chose it
   - Migration order (which parts first)
   - How extracted components interact with existing layers
   - Test strategy
   - **Explicit confirmation** it doesn't duplicate existing architecture

3. **Code structure outline** showing:
   - File organization
   - Dependency flow
   - Interface boundaries
   - How Controller remains as orchestration layer for ConnectionManager

## Constraints

- Keep response concise (under 300 lines)
- Focus on practical implementation over theory
- Consider mobile app constraints (bundle size, memory)
- Assume team has intermediate TypeScript skills

## Common Anti-Patterns to Avoid

Based on previous analysis attempts, do NOT recommend:

❌ **New State Management Layer** (e.g., "PerpsStateManager", "EventEmitter")

- Redux already handles all state via BaseController

❌ **New Lifecycle Managers** (e.g., "ConnectionManager", "LifecycleManager")

- PerpsConnectionManager singleton already orchestrates lifecycle

❌ **New Provider Abstractions** (e.g., "WebSocketProvider", "APIProvider")

- HyperLiquidProvider already abstracts REST + WebSocket

❌ **Parallel Manager Architecture**

- Don't create managers at same level as Controller
- Controller must remain orchestration layer for ConnectionManager

✅ **Instead, focus on**:

- Extracting business logic INTO services BELOW Controller
- Services should be stateless (receive provider from Controller)
- Controller stays as Redux integration + orchestration layer
- Services delegate to existing provider, don't create new ones

## Refactoring Target Visualization

**BEFORE** (Current - Too Large):

```
PerpsController (3,360 lines)
├── Provider lifecycle management
├── Trading logic (validation, formatting, execution)
├── Account operations (deposits, withdrawals, balances)
├── Market data fetching/caching
├── Fee calculations
├── Eligibility checks
├── WebSocket subscriptions
├── Redux state updates
├── Analytics tracking
└── Error handling
```

**AFTER** (Goal - Extract Business Logic):

```
PerpsController (~500 lines) - Orchestration + Redux + Provider lifecycle
├── initializeProviders() - Called by ConnectionManager
├── disconnect() - Called by ConnectionManager
├── Public API methods (delegate to services)
├── Redux state updates
├── Analytics tracking
├── WebSocket subscriptions (tightly coupled to provider)
└── Uses services for business logic:
    ├── TradingService (validation, formatting, order logic)
    ├── AccountService (deposit/withdrawal logic)
    ├── MarketDataService (fetching, caching, parsing)
    ├── FeeCalculationService (pure calculation logic)
    └── EligibilityService (geo-blocking checks)
```

**Key**: Services receive `provider` from Controller, don't manage it.

## Output Format

Please structure your response as a markdown document with clear sections and include your model name/version in the header for comparison purposes.

---

_Note: This is for comparing different LLM architectural recommendations. Please provide your unique perspective rather than a generic solution._
