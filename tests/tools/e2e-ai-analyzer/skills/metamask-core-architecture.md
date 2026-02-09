---
name: metamask-core-architecture
description: Deep architectural knowledge of MetaMask Mobile's core Engine and controller patterns. Load this when you see changes to ANY file matching these patterns - *Controller.ts files (PerpsController, SwapsController, NetworkController, TransactionController, etc.), app/core/Engine/ directory, BaseController implementations, messenger configurations (app/core/Engine/messengers/), Engine.ts initialization, or controller state management. Provides critical context on controller dependencies, initialization order, breaking change patterns, and cascade effects.
---

# MetaMask Core Architecture Skill

This skill provides deep architectural knowledge to help interpret findings from your investigation of Engine and controller changes. Use this to understand what patterns mean, assess cascade effects, and recognize breaking change indicators.

## When This Skill Is Essential

Load this skill when analyzing changes to:

- `app/core/Engine/` directory (any file)
- ANY controller integrated into the Engine - check if there's a corresponding entry in:
  - `app/core/Engine/types.ts` (controller type definitions)
  - `app/core/Engine/messengers/` (restricted messenger configurations)
  - Examples: PerpsController (app/components/UI/Perps/controllers/), SwapsController, etc.
- Controller implementations that extend `BaseController` or use restricted messengers
- Controller initialization or messenger configuration
- State management or Redux integration
- Any change that could affect controller dependencies or initialization order

## Core Architecture Overview

### Engine.ts: The Central Orchestrator

**Pattern:** Singleton managing 70+ controllers via ComposableController wrapper

**Key Responsibilities:**

1. Controller initialization and dependency resolution
2. Messenger-based inter-controller communication
3. Redux state synchronization
4. Event coordination and subscriptions
5. Persistence management

**Critical Files:**

- `app/core/Engine/Engine.ts` - Main singleton class
- `app/core/Engine/types.ts` - All controller and messenger types
- `app/core/Engine/constants.ts` - State change events, configuration
- `app/core/EngineService/EngineService.ts` - Engine lifecycle & Redux integration

## Controller Initialization Order (CRITICAL)

**Why Order Matters:** Controllers cannot access dependencies that haven't been initialized yet. Requesting an uninitialized controller throws: `"Controller requested before it was initialized"`

### Initialization Phases

Understanding these phases helps assess impact magnitude:

**Phase 1 - Foundation (No Dependencies):**

- ErrorReportingService, StorageService, LoggingController, RemoteFeatureFlagController
- **Impact Scope:** Infrastructure only, minimal cascade

**Phase 2 - Network & Core Infrastructure:**

- **NetworkController** (CRITICAL: Required by most other controllers)
- **KeyringController** (CRITICAL: Required for all account/transaction operations)
- PreferencesController, PermissionController
- **Impact Scope:** Changes here cascade to 40+ dependent controllers

**Phase 3 - Account Management:**

- AccountsController, AccountTreeController, AccountTrackerController
- **Impact Scope:** All account-related features

**Phase 4 - Assets & Tokens:**

- AssetsContractController, TokensController, TokenListController, TokenDetectionController, TokenBalancesController, TokenRatesController, NftController, NftDetectionController
- **Impact Scope:** Token/NFT display, balances, detection

**Phase 5 - Transactions & Gas:**

- GasFeeController, **TransactionController** (CRITICAL: Depends on Network, Keyring, Gas)
- SignatureController, SmartTransactionsController
- **Impact Scope:** All transaction and signature operations

**Phase 6 - Business Logic & Features:**

- BridgeController, SwapsController, EarnController, DeFiPositionsController, plus 30+ specialized controllers
- **Impact Scope:** Specific features, more isolated

### Interpreting Phase Changes

**Phase 2 controller changes** → Expect wide impact (40+ dependencies)
**Phase 5-6 controller changes** → More isolated impact
**Cross-phase dependency violations** → Critical initialization failures

## Critical Dependency Chains

Understanding these chains helps predict cascade effects:

### Transaction Flow Chain

```
TransactionController
├─ NetworkController (provider, chainId)
├─ GasFeeController (gas estimates)
├─ KeyringController (transaction signing)
├─ ApprovalController (user confirmations)
└─ PreferencesController (user settings)
```

**What This Means:**

- Changes to **any** controller in this chain affect transaction functionality
- NetworkController changes cascade to TransactionController
- GasFeeController issues break transaction gas estimates
- KeyringController problems block all signing operations

**Test Coverage Implications:** Transaction changes require confirmation flow testing, wallet platform testing

### Gas Fee Estimation Chain

```
GasFeeController
├─ NetworkController (network provider)
└─ publishes to: TransactionController
```

**What This Means:**

- Gas estimation affects **all** transaction types
- NetworkController issues break gas fee display
- Changes here impact user experience in confirmations

### Token Management Chain

```
TokensController
├─ NetworkController (chainId for network-specific tokens)
├─ AssetsContractController (contract interactions)
└─ publishes to: TokenBalancesController, TokenRatesController
```

**What This Means:**

- Token functionality is network-dependent
- Changes affect token display across wallet views
- Asset detection and balances cascade from here

### Account Management Chain

```
AccountsController
├─ KeyringController (account data source)
├─ PreferencesController (account preferences)
└─ publishes to: UI via Redux
```

**What This Means:**

- All account UI depends on this chain
- KeyringController is the source of truth for accounts
- Changes cascade to all account-related features

## Architectural Patterns: What to Look For

### Pattern 1: Messenger-Based Communication (CRITICAL)

**Recognition Pattern:**

```typescript
// Look for this pattern (CORRECT):
await controllerMessenger.call('TransactionController:addTransaction', ...)
controllerMessenger.subscribe('TransactionController:incomingTransactionsReceived', ...)

// NOT this pattern (WRONG - indicates potential circular dependency):
import { TransactionController } from './TransactionController';
transactionController.addTransaction(...);
```

**What It Means:**

- **Messenger calls** = Loose coupling, safe
- **Direct imports between controllers** = Circular dependency risk, unsafe
- **Subscribe patterns** = Event consumers, indirect dependencies

**When You Find Direct Imports:**

- High risk of circular dependencies
- May break module loading
- Investigate if this creates mutual dependencies

### Pattern 2: Restricted Messengers

**Recognition Pattern:**

```typescript
// Look in Engine/messengers/{controller}-messenger.ts:
allowedActions: [
  'NetworkController:getState',
  'NetworkController:setActiveNetwork',
];
allowedEvents: [
  'NetworkController:stateChange',
  'NetworkController:networkDidChange',
];
```

**What It Means:**

- These lists define **explicit dependencies**
- Actions in this list = "This controller can call these methods on other controllers"
- Events in this list = "This controller can listen to these events"

**When Actions/Events Change:**

- Adding = Usually safe, extends functionality
- Removing = High risk, breaks existing integrations
- Must be reflected in messenger file or TypeScript errors occur

### Pattern 3: Redux State Synchronization

**Recognition Pattern:**

```typescript
// Look in Engine/constants.ts:
export const BACKGROUND_STATE_CHANGE_EVENT_NAMES = [
  'NetworkController:stateChange',
  'TransactionController:stateChange',
  // ... all controllers that sync to Redux
] as const;
```

**What It Means:**

- Controllers in this array → State changes reach Redux/UI
- Controllers NOT in this array → State changes don't update UI
- Missing entry = UI bugs, stale display

**When You Find State Changes:**

1. Check if controller is in BACKGROUND_STATE_CHANGE_EVENT_NAMES
2. If not there + controller has state → UI won't update
3. If added/removed from array → Review UI integration

### Pattern 4: Dependency Resolution

**Recognition Pattern in Controller Init Functions:**

```typescript
export const transactionControllerInit = ({ getController, ... }) => {
  const networkController = getController('NetworkController');  // ← Dependency!
  const keyringController = getController('KeyringController');  // ← Dependency!
  // ...
};
```

**What This Tells You:**

- Each `getController()` call = **Direct dependency**
- More `getController()` calls = More things that can break this controller
- If dependency isn't initialized yet → Runtime error

**Counting Dependencies:**

- 0-2 dependencies = Low coupling, isolated
- 3-5 dependencies = Moderate coupling
- 6+ dependencies = High coupling, many failure points

## Interpreting Investigation Findings

### Finding: "15 files call getController('NetworkController')"

**Interpretation:**

- NetworkController is a **critical dependency** for 15+ controllers
- Changes to NetworkController cascade to all 15+
- Breaking changes here have **wide blast radius**
- Test coverage must be comprehensive

### Finding: "Messenger subscriptions to TransactionController:transactionConfirmed"

**Interpretation:**

- Code subscribing to this event = **Event consumers**
- These are **indirect dependencies**
- Changing/removing this event breaks subscribers
- Need to test all features that react to transaction confirmations

### Finding: "Controller not in BACKGROUND_STATE_CHANGE_EVENT_NAMES"

**Interpretation:**

- State changes won't reach Redux
- UI won't update when this controller's state changes
- If this is intentional (stateless helper) → OK
- If unintentional → Bug, UI will be stale

### Finding: "Engine.ts controllerInitFunctions order changed"

**Interpretation:**

- **CRITICAL**: Initialization order changed
- Must verify dependencies still initialize before dependents
- Example: If TransactionController moved before NetworkController → BROKEN
- Check all `getController()` calls in affected controllers

### Finding: "Direct import between two controller files"

**Interpretation:**

- **HIGH RISK**: Potential circular dependency
- If mutual (A imports B, B imports A) → Guaranteed circular dependency
- Will cause module loading failures
- Must use messenger pattern instead

## Impact Amplification Patterns

### Pattern: Phase 2 Controller Changed

**Phase 2 = NetworkController, KeyringController**

**Impact Amplification:**

- Phase 3 depends on Phase 2 → 10+ controllers affected
- Phase 4 depends on Phase 2 → 20+ controllers affected
- Phase 5 depends on Phase 2 → 30+ controllers affected

**Total Cascade:** 40+ controllers potentially affected

**Risk Assessment:** Critical - requires comprehensive testing

### Pattern: Controller with Many getController() References

**Example: Found 20 files with `getController('NetworkController')`**

**Impact Amplification:**

- 20 controllers directly depend on this
- Each of those 20 has its own dependents
- Cascade can reach 50+ files

**Risk Assessment:** High - changes cascade widely

### Pattern: Messenger Event Has Many Subscribers

**Example: Found 8 subscriptions to `NetworkController:networkDidChange`**

**Impact Amplification:**

- 8 features react to network changes
- Each feature may trigger additional effects
- UI updates, state changes, refetches cascade

**Risk Assessment:** Medium-High - event changes affect 8+ features

### Pattern: State Property Used in Multiple Selectors

**Example: `state.engine.backgroundState.NetworkController.providerConfig` used in 15 selectors**

**Impact Amplification:**

- 15 UI components depend on this state
- Renaming breaks all 15 selectors
- Type changes break all consumers

**Risk Assessment:** High - UI impact is wide

## Breaking Change Indicators

### Indicator 1: Circular Dependency Risk

**Look For:**

- Direct imports between controller files
- Mutual dependencies (A → B, B → A)
- Import statements in controller init files

**Severity:** CRITICAL - Breaks app startup

**What Breaks:**

- Module loading fails
- "Cannot find module" errors
- Initialization crashes

### Indicator 2: Missing Redux Sync

**Look For:**

- New stateful controller
- Controller NOT in BACKGROUND_STATE_CHANGE_EVENT_NAMES
- State properties that should be in Redux

**Severity:** HIGH - UI bugs

**What Breaks:**

- UI doesn't update
- Stale data displayed
- User actions don't reflect

### Indicator 3: Initialization Order Violation

**Look For:**

- Controller moved earlier in controllerInitFunctions
- getController() calls to controllers initialized later
- Phase reordering

**Severity:** CRITICAL - App crashes on startup

**What Breaks:**

- "Controller requested before initialized" error
- App won't launch
- Hard crash

### Indicator 4: Messenger Misconfiguration

**Look For:**

- New action/event not in allowed lists
- Removed action/event still used elsewhere
- TypeScript errors about messenger

**Severity:** MEDIUM-HIGH - Prevents compilation or runtime errors

**What Breaks:**

- TypeScript compilation errors
- Runtime "Action not allowed" errors
- Features can't communicate

### Indicator 5: State Schema Breaking Change

**Look For:**

- Renamed state properties
- Changed property types
- Removed properties

**Severity:** HIGH - Data migration needed

**What Breaks:**

- Existing state doesn't match schema
- Migration errors on app update
- Data loss if not handled

## Domain-Specific Impact Patterns

### Network Domain (NetworkController changes)

**Affected Areas:**

- All chain-dependent operations
- RPC provider interactions
- Gas fee estimation
- Token detection (chain-specific)
- Transaction submission

**Typical Test Coverage:** SmokeNetworkAbstractions, SmokeNetworkExpansion, dependent features

### Transaction Domain (TransactionController, GasFeeController changes)

**Affected Areas:**

- Transaction confirmation flows
- Gas fee display
- Transaction history
- Signature requests
- Smart transactions

**Typical Test Coverage:** SmokeConfirmationsRedesigned, SmokeWalletPlatform

### Account Domain (KeyringController, AccountsController changes)

**Affected Areas:**

- Account creation/import
- Account switching
- Authentication
- Signing operations
- Account preferences

**Typical Test Coverage:** SmokeAccounts, SmokeIdentity

### Token Domain (TokensController, NftController changes)

**Affected Areas:**

- Token display
- Token balances
- Token detection
- NFT display
- Asset management

**Typical Test Coverage:** SmokeWalletPlatform, SmokeWalletUX

### Trading Domain (SwapsController, BridgeController changes)

**Affected Areas:**

- Token swaps
- Bridge operations
- Quote fetching
- Trade execution

**Typical Test Coverage:** SmokeTrade

### Snaps Domain (SnapController, PermissionController changes)

**Affected Areas:**

- Snap installation
- Snap permissions
- Snap RPC methods
- Flask build functionality

**Typical Test Coverage:** FlaskBuildTests

## Risk Assessment Framework

### Critical Risk Indicators

**Any of these = Critical:**

- Engine.ts initialization order changed
- Phase 2 controller (Network, Keyring) logic changed
- BACKGROUND_STATE_CHANGE_EVENT_NAMES modified
- Circular dependency detected
- Breaking messenger changes (removed actions/events)

**Assessment:** High impact, wide cascade, comprehensive testing required

### High Risk Indicators

**Any of these = High:**

- Phase 3-5 controller logic changed
- State schema modified
- New dependencies added to widely-used controller
- Event subscriptions in Engine.ts changed
- Messenger actions added/modified

**Assessment:** Moderate impact, targeted comprehensive testing

### Medium Risk Indicators

**Any of these = Medium:**

- Phase 6 controller changed
- New actions/events added (not removed)
- Helper methods modified
- Non-critical configuration changed

**Assessment:** Focused testing on affected domain

### Low Risk Indicators

**Any of these = Low:**

- Type definitions only (no runtime changes)
- Comments, documentation
- Test file changes
- Logging, debugging code

**Assessment:** Minimal E2E testing if unit tests cover

## Interpreting Test Coverage Needs

### Wide Cascade Pattern

**When You Find:**

- Phase 2 controller changed
- 10+ getController references
- 5+ messenger subscribers
- Changes to critical dependency chains

**Test Strategy:**

- Multiple tags covering affected domains
- Account + Transaction + Network features
- Conservative approach due to uncertainty

**Example Tags:** SmokeAccounts, SmokeConfirmationsRedesigned, SmokeWalletPlatform, SmokeNetworkAbstractions

### Isolated Change Pattern

**When You Find:**

- Phase 6 controller changed
- 0-2 getController references
- No messenger subscribers outside domain
- Isolated feature (Bridge, Earn, specific trading feature)

**Test Strategy:**

- 1-2 tags for specific domain
- Focused on changed functionality

**Example Tags:** SmokeTrade (for Bridge/Swap changes), SmokeCard (for card features)

### State-Only Change Pattern

**When You Find:**

- State property added (not removed/renamed)
- Controller in BACKGROUND_STATE_CHANGE_EVENT_NAMES
- No logic changes
- UI integration tests exist

**Test Strategy:**

- 1 tag for feature domain
- Verify UI updates correctly

### Infrastructure Change Pattern

**When You Find:**

- Messenger configuration changed
- Init function modified
- Engine.ts subscriptions changed
- Redux sync configuration changed

**Test Strategy:**

- Multiple tags for safety
- Focus on integration points
- Test that communication still works

## Key Architectural Principles

1. **Initialization order is sacred** - Dependencies must initialize before dependents
2. **Never import controllers directly** - Always use messenger or getController()
3. **Redux sync is automatic** - But only if controller is registered in constants
4. **Messenger restrictions are type-safe** - Enforce through restricted messengers
5. **Phase 2 controllers are critical** - Network and Keyring are foundational
6. **Dependency counts matter** - More getController() calls = wider impact
7. **Event subscriptions are dependencies** - Subscribers depend on event structure
8. **State schema changes cascade** - Properties used in selectors affect many components

## Applying This Knowledge

When you investigate core file changes:

1. **Identify what changed** - Controller, Engine, messenger, state
2. **Look for recognition patterns** - getController calls, messenger usage, subscriptions
3. **Count dependencies** - How many files reference this?
4. **Check initialization phase** - Phase 2 = critical, Phase 6 = more isolated
5. **Assess cascade potential** - Use dependency chains to predict impact
6. **Recognize breaking indicators** - Circular deps, missing Redux sync, order violations
7. **Map to domain impact** - Network changes affect X, Transaction changes affect Y
8. **Determine test coverage** - Wide cascade = comprehensive, isolated = focused

This architecture prioritizes **modularity** (independent controller updates), **type safety** (restricted messengers), and **extensibility** (easy to add controllers). Changes must preserve these principles.
