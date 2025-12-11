# MetaMask Mobile State Management Flow

This document describes the complete state management flow in MetaMask Mobile, from app initialization through migrations, Redux persist, sagas, Engine initialization, and the new early messenger subscription persistence system.

## 🔄 Complete Application State Flow

```
┌─────────────────┐
│   App Starts    │
└─────────┬───────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ Redux Store Created with persistReducer │
└─────────┬───────────────────────────────┘
          │
          ├──────────────────────────────┐
          │                              │
          ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ Sagas Started   │          │  persistStore()     │
│ sagaMiddleware  │          │  Called             │
│ .run(rootSaga)  │          └─────────┬───────────┘
└─────────┬───────┘                    │
          │                            │
          │                            ▼
          │                  ┌─────────────────────┐
          │                  │ Rehydration Begins  │
          │                  └─────────┬───────────┘
          │                            │
          │                            ▼
          │                      ┌──────────┐
          │                      │Migration │
          │                      │Needed?   │ ──── No ────┐
          │                      └────┬─────┘             │
          │                           │ Yes               │
          │                           ▼                   │
          │                  ┌─────────────────────┐      │
          │                  │  Run Migrations     │      │
          │                  │  000-108            │      │
          │                  └─────────┬───────────┘      │
          │                            │                  │
          │                            ▼                  │
          │                  ┌─────────────────────┐      │
          │                  │ Migration 104+:     │      │
          │                  │ Inflate from        │      │
          │                  │ Controller Files    │      │
          │                  │ → Transform State   │      │
          │                  │ → Deflate back to   │      │
          │                  │ Controller Files    │      │
          │                  └─────────┬───────────┘      │
          │                            │                  │
          │                            └──────┬───────────┘
          │                                   │
          │                                   ▼
          │                  ┌─────────────────────────────┐
          │                  │ Redux Store Rehydrated      │
          │                  │ (engine slice blacklisted)  │
          │                  └─────────┬───────────────────┘
          │                            │
          │                            ▼
          │                  ┌─────────────────────────────┐
          │                  │ dispatch(                   │
          │                  │   onPersistedDataLoaded()   │
          │                  │ )                           │
          │                  └─────────┬───────────────────┘
          │                            │
          ▼                            │
┌─────────────────────┐                │
│ startAppServices    │                │
│ Saga Listening      │                │
└─────────┬───────────┘                │
          │                            │
          │◄───────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ WAIT FOR BOTH:                  │
│ • ON_PERSISTED_DATA_LOADED ✅   │
│ • ON_NAVIGATION_READY ✅        │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ EngineService.start()           │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Load State from:                │
│ • ControllerStorage (prod)      │
│ • Redux (E2E only)              │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ ⭐ PHASE 1:                     │
│ Engine.getOrCreateMessenger()   │
│ → Create messenger early        │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ ⭐ PHASE 2:                     │
│ setupPersistenceSubscriptions() │
│ → Subscribe BEFORE init         │
│ → Listeners ready, waiting      │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ ⭐ PHASE 3:                     │
│ Engine.init(state)              │
│ → Use pending messenger         │
│ → Initialize controllers        │
└─────────┬───────────────────────┘
          │
          ├─> Controllers Initialize
          │   └─> SnapController, etc.
          │       └─> Emit state changes ⚡
          │           └─> Subscriptions catch! ✅
          │               └─> Persist to FileSystem ✅
          │
          ▼
┌─────────────────────────────────┐
│ ⭐ PHASE 4:                     │
│ initializeControllers(engine)   │
│ → Setup Redux subscriptions     │
│ → dispatch(INIT_BG_STATE)       │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ dispatch(setAppServicesReady()) │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 🔄 Runtime Loop:                │
│                                 │
│ Controller State Change         │
│         ↓                       │
│ Emit Event via Messenger        │
│         ↓                       │
│ ┌─────────────┬──────────────┐  │
│ ↓             ↓              ↓  │
│ Redux     Persistence    (Other)│
│ Update    to FileSystem  Subs   │
│         ↓                       │
│ UI Re-renders + State Saved     │
└─────────────────────────────────┘
```

## Detailed Step-by-Step Flow

### 1. **Redux Store Creation & Saga Initialization Phase**

```typescript
// Location: app/store/index.ts
const pReducer = persistReducer(persistConfig, rootReducer);
store = configureStore({ reducer: pReducer, middleware: [sagaMiddleware, thunk], ... });

sagaMiddleware.run(rootSaga); // Start sagas
persistor = persistStore(store, null, onPersistComplete);
```

**What happens:**

- **Redux store is created FIRST** with `persistReducer` wrapper (but empty/default state)
- **Redux Sagas are started** immediately via `sagaMiddleware.run(rootSaga)`
- **Sagas begin listening** for actions (e.g., `ON_PERSISTED_DATA_LOADED`, `ON_NAVIGATION_READY`)
- **`persistStore()` is called** which triggers rehydration process
- **During rehydration**: Migrations run if version mismatch detected
- **Migration 104+** splits legacy `engine.backgroundState` into individual controller files
- **After migrations**: The migrated state is used to rehydrate the Redux store
- **`onPersistComplete` callback fires** when rehydration is done

**Important Files:**

- `app/store/index.ts` - Store creation, saga initialization, and persistence setup
- `app/store/sagas/index.ts` - Root saga and `startAppServices` saga
- `app/store/migrations/index.ts` - Migration orchestration with inflate/deflate
- `app/store/migrations/104.ts` - **CRITICAL MIGRATION** that splits persistence to individual controller files
- `app/store/persistConfig/index.ts` - Redux-persist configuration (engine slice blacklisted)

### 2. **Redux Rehydration & Saga Coordination**

```typescript
// Location: app/store/sagas/index.ts - startAppServices()
yield all([
  take(UserActionType.ON_PERSISTED_DATA_LOADED),
  take(NavigationActionType.ON_NAVIGATION_READY),
]);
```

**What happens:**

- Redux store is populated with migrated/loaded state
- `onPersistComplete` callback dispatches `onPersistedDataLoaded()` action
- **`startAppServices` saga waits for TWO signals:**
  - `ON_PERSISTED_DATA_LOADED` - Redux rehydration complete
  - `ON_NAVIGATION_READY` - Navigation stack ready
- **Both must complete** before Engine initialization begins
- This ensures proper initialization order and prevents race conditions

### 3. **Engine Service Startup (Triggered by Sagas)**

```typescript
// Location: app/store/sagas/index.ts
yield call(EngineService.start);
```

**What happens:**

```typescript
// Location: app/core/EngineService/EngineService.ts - start()
const reduxState = ReduxService.store.getState();
const persistedState = await ControllerStorage.getAllPersistedState();

const state = isE2E
  ? reduxState?.engine?.backgroundState
  : (persistedState?.backgroundState ?? {});
```

- **Gets state from TWO sources:**
  - Redux store (for E2E tests only)
  - New ControllerStorage (production: controller-per-file system)
- **Combines the states** to initialize Engine

### 4. **PHASE 1: Early Messenger Creation** ⭐ NEW

```typescript
// Location: app/core/EngineService/EngineService.ts - start()
const messenger = Engine.getOrCreateMessenger();
```

**What happens:**

- **Creates messenger BEFORE Engine.init()** is called
- Messenger stored in `Engine.pendingMessenger` static property
- This allows subscriptions to be set up before controllers exist
- **Critical fix**: Enables capturing init-time state changes

### 5. **PHASE 2: Early Persistence Subscription Setup** ⭐ NEW

```typescript
// Location: app/core/EngineService/EngineService.ts
this.setupPersistenceSubscriptions(messenger);
```

**What happens:**

```typescript
messenger.subscribe(eventName, async (controllerState) => {
  // Get metadata at EVENT TIME (controllers now exist)
  const controllerMetadata = UntypedEngine.context?.[controllerName]?.metadata;

  if (!hasPersistedState(controllerMetadata)) {
    return; // Skip controllers without persistent state
  }

  const filteredState = getPersistentState(controllerState, controllerMetadata);
  await persistController(filteredState, controllerName);
});
```

- **Subscribes to ALL controller events** BEFORE controllers are created
- Subscriptions are **event listeners waiting for events**
- **Metadata check happens at event time** (after controllers exist)
- **Captures state changes during Engine.init()** ✅ (fixes PermissionController loss bug)

### 6. **PHASE 3: Engine Initialization**

```typescript
// Location: app/core/Engine/Engine.ts - init()
Engine.init(state, null, metaMetricsId);
```

**What happens:**

```typescript
// In Engine constructor:
this.controllerMessenger =
  Engine.pendingMessenger ?? getRootExtendedMessenger();
Engine.pendingMessenger = null; // Clear pending messenger
```

- **Engine uses the pending messenger** created in Phase 1
- **All controllers get created** and populated with their respective state
- **Controllers emit state changes during init** (e.g., SnapController → PermissionController)
- **Early subscriptions catch these events** and persist them immediately ✅
- Engine context is populated with controller instances
- Controllers are now live and functional

### 7. **PHASE 4: Redux Subscriptions Setup**

```typescript
// Location: app/core/EngineService/EngineService.ts - initializeControllers()
engine.controllerMessenger.subscribeOnceIf(
  'ComposableController:stateChange',
  () => {
    this.updateBatcher.add(INIT_BG_STATE_KEY);
    this.updateBatcher.flush(); // Initial Redux sync
    this.engineInitialized = true;
  },
);
```

**What happens:**

- **Waits for first controller state change** (indicates controllers are ready)
- **Pushes initial controller state to Redux** via updateBatcher
- **Marks engine as initialized** - UI can now safely access controller data
- **Sets up Redux update subscriptions** for all controllers
- Note: Persistence subscriptions already set up in Phase 2

### 8. **Runtime State Management Loop**

**When any controller state changes:**

1. **Controller updates its internal state**
2. **Controller emits state change event** via messenger
3. **TWO subscribers catch the event in parallel:**
   - **Redux subscriber** (from Phase 4): Queues Redux update via updateBatcher
   - **Persistence subscriber** (from Phase 2): Persists to FileSystem (debounced 200ms)
4. **Redux store gets updated** → UI re-renders
5. **File storage gets updated** → State persisted

## Architecture Overview

### **Evolution of Persistence**

#### **Legacy System (Pre-Migration 104)**

- Single large Redux-persist file
- Engine state stored in `engine.backgroundState`
- Single point of failure
- Persistence happened AFTER Engine.init() → **Lost init-time state changes**

#### **Current System (Post-Migration 104 + Early Messenger Fix)**

- **Dual Persistence**: Redux + Individual controller files
- **Controller-per-file**: Each controller has its own storage file
- **Early Messenger Subscription**: Persistence set up BEFORE Engine.init()
- **Resilient**: Failure in one controller doesn't affect others
- **Performance**: Smaller, focused file operations
- **Bug Fix**: Captures init-time state changes (e.g., SnapController → PermissionController)

### **Key Components**

| Component                         | Purpose                                                | Location                      |
| --------------------------------- | ------------------------------------------------------ | ----------------------------- |
| **Migration System**              | Version management & state transformation              | `app/store/migrations/`       |
| **Redux-Persist**                 | Redux state hydration (engine slice blacklisted)       | `app/store/persistConfig/`    |
| **Redux Sagas**                   | Orchestrates async flows & Engine startup              | `app/store/sagas/`            |
| **EngineService**                 | Orchestrates Engine lifecycle with early subscriptions | `app/core/EngineService/`     |
| **Engine**                        | Controller management & business logic                 | `app/core/Engine/`            |
| **Controller Messenger**          | Event bus for controller communication                 | `Engine.controllerMessenger`  |
| **ControllerStorage**             | File-based persistence (per-controller files)          | `app/store/persistConfig/`    |
| **updateBatcher**                 | Efficient batched Redux updates                        | `EngineService.updateBatcher` |
| **setupPersistenceSubscriptions** | Early subscription setup (before init)                 | `EngineService` method        |

### **Critical Innovation: Early Messenger Subscription** ⭐

```
┌─────────────────────────────────────────────────────────────────┐
│         EARLY SUBSCRIPTION PATTERN (The Key Innovation)         │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────────────┐
   │ Create Messenger │  (BEFORE controllers exist)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │Subscribe to Events│ (Listeners ready, waiting)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │  Init Controllers│ (Controllers created)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │Controllers Emit  │ (Events fired during init)
   │  State Changes   │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Subscriptions    │ ✅ Events caught!
   │  Catch Events    │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Persist State    │ ✅ Changes saved!
   │    Changes       │
   └──────────────────┘
```

**BEFORE FIX (Broken):**

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Init Controllers│ --> │  Subscribe   │ --> │ Miss Init Events│ ❌
│  (Events Emit)  │     │ (Too Late)   │     │  (State Lost)   │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

**AFTER FIX (Working):**

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Subscribe   │ --> │ Init Controllers│ --> │ Catch All Events │ ✅
│ (Ready Early)│     │  (Events Emit)  │     │  (State Saved)   │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

## Real-World Example: PermissionController State Loss Bug Fix

### The Problem

When SnapController initialized preinstalled snaps during `Engine.init()`, it would update PermissionController with snap permissions:

```typescript
// During Engine.init():
SnapController.init()
  → SnapController.installPreinstalledSnaps()
    → PermissionController.grantPermissions() // ⚡ State change event emitted
      → Event emitted but NO SUBSCRIBERS YET ❌
        → State change LOST
          → Next app restart: PermissionController empty
            → Snaps broken 💥
```

### The Fix

Early messenger subscription captures these init-time events:

```
┌────────────────────────────────────────────────────────────────────────┐
│                 HOW THE FIX CAPTURES INIT-TIME EVENTS                  │
└────────────────────────────────────────────────────────────────────────┘

EngineService                 Messenger              SnapController
     │                            │                        │
     │ setupPersistenceSubscriptions()                     │
     ├──────────────────────────>│                        │
     │ Subscribe to               │                        │
     │ PermissionController:      │                        │
     │ stateChange                │                        │
     │                            │                        │
     │                     [LISTENER READY]                │
     │                      Waiting for events...          │
     │                            │                        │
     │ Engine.init()              │                        │
     │                            │                        │
     ├────────────────────────────┼───────────────────────>│
     │                            │  Initialize            │
     │                            │  SnapController        │
     │                            │        │               │
     │                            │        │ Install       │
     │                            │        │ preinstalled  │
     │                            │        │ snaps         │
     │                            │        │               │
     │                            │        ▼               │
     │                            │  PermissionController  │
     │                            │  .grantPermissions()   │
     │                            │        │               │
     │                            │        │ Update state  │
     │                            │        │               │
     │                            │        ▼               │
     │                            │  Emit stateChange ⚡   │
     │                            │<───────┘               │
     │                            │                        │
     │  ✅ Event caught!          │                        │
     │<───────────────────────────┤                        │
     │                            │                        │
     │ Check metadata             │                        │
     │ (controllers exist now)    │                        │
     │                            │                        │
     │ getPersistentState()       │                        │
     │                            │                        │
     │ persistController()        │                        │
     └──────────────────────────> FileSystem              │
              │                                             │
              │ ✅ State saved!                             │
              │                                             │
              │                                             │
        [NEXT APP RESTART]                                 │
              │                                             │
              │ Load PermissionController from FileSystem   │
              │ → Full state with permissions ✅            │
              │ → Snaps work perfectly! 🎉                 │
              │                                             │
```

### State Flow Comparison

**Before (Broken):**

```typescript
// Phase 1: Engine.init()
SnapController → PermissionController.grantPermissions()
// PermissionController state = { subjects: { 'npm:@metamask/...': {...} } }
// Event emitted, but no persistence listeners yet

// Phase 2: setupEnginePersistence() - TOO LATE
messenger.subscribe('PermissionController:stateChange', persist)

// Phase 3: App restart
// Load PermissionController from FileSystem → Empty state ❌
// Result: Snaps broken
```

**After (Fixed):**

```typescript
// Phase 1: setupPersistenceSubscriptions()
messenger.subscribe('PermissionController:stateChange', persist)
// Listener ready ✅

// Phase 2: Engine.init()
SnapController → PermissionController.grantPermissions()
// Event emitted → Listener catches it → Persists immediately ✅

// Phase 3: App restart
// Load PermissionController from FileSystem → Full state with permissions ✅
// Result: Snaps work perfectly 🎉
```

## Redux Sagas Integration

### Sagas in the Initialization Flow

Redux Sagas provide the orchestration layer that coordinates async operations and ensures proper initialization order:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SAGAS ORCHESTRATION FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

    App Starts
        │
        ▼
    Redux Store Created
        │
        ├──────────────────────────────┬─────────────────────────────┐
        │                              │                             │
        ▼                              ▼                             ▼
    Sagas Started              persistStore()              Other Sagas Running
    sagaMiddleware.run              │                           │
        │                           │                           ├─> authStateMachine
        │                           ▼                           ├─> handleDeeplinkSaga
        │                     Migrations Run                    └─> handleSnapsRegistry
        │                           │
        │                           ▼
        │                     Redux Rehydrated
        │                           │
        │                           ▼
        │                dispatch(onPersistedDataLoaded) ✅
        │                           │
        ▼                           │
    startAppServices Saga           │
        │                           │
        │ ┌─────────────────────────┘
        │ │
        ▼ ▼
    ┌─────────────────────────────────────┐
    │  WAITING FOR BOTH CONDITIONS:       │
    │  • ON_PERSISTED_DATA_LOADED ✅      │  ← From Redux rehydration
    │  • ON_NAVIGATION_READY ✅           │  ← From navigation stack
    └──────────────┬──────────────────────┘
                   │
                   │ [BOTH CONDITIONS MET]
                   │
                   ▼
            EngineService.start() ⚡
                   │
                   ├─> Phase 1: Create Messenger
                   ├─> Phase 2: Setup Subscriptions
                   ├─> Phase 3: Engine.init()
                   └─> Phase 4: Redux Subscriptions
                   │
                   ▼
            Engine Initialized ✅
                   │
                   ▼
        dispatch(setAppServicesReady) ✅
                   │
                   ▼
            App Ready for Use 🎉
```

### Key Sagas

| Saga                    | Purpose                                               | Triggers On                                                  |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| **startAppServices**    | Orchestrates Engine startup after Redux rehydration   | Waits for `ON_PERSISTED_DATA_LOADED` + `ON_NAVIGATION_READY` |
| **authStateMachine**    | Manages authentication state and app lock             | `LOGIN` action                                               |
| **handleDeeplinkSaga**  | Processes deeplinks after wallet is unlocked          | `LOGIN`, `CHECK_FOR_DEEPLINK`, `SET_COMPLETED_ONBOARDING`    |
| **handleSnapsRegistry** | Updates Snaps registry when user completes onboarding | `LOGIN`, `SET_COMPLETED_ONBOARDING`                          |

### startAppServices Saga (Critical for Engine Init)

```typescript
// Location: app/store/sagas/index.ts
export function* startAppServices() {
  // Wait for BOTH signals before starting Engine
  yield all([
    take(UserActionType.ON_PERSISTED_DATA_LOADED), // Redux rehydration complete
    take(NavigationActionType.ON_NAVIGATION_READY), // Navigation stack ready
  ]);

  // Only now is it safe to start the Engine
  yield call(EngineService.start);

  // Start other services
  DeeplinkManager.start();
  AppStateEventProcessor.start();
  yield call(applyVaultInitialization);

  // Signal that app services are ready
  yield put(setAppServicesReady());
}
```

**Why This Matters:**

- **Prevents race conditions**: Engine won't start until Redux state is loaded
- **Ensures UI is ready**: Navigation must be initialized before Engine starts
- **Coordinated startup**: All async dependencies resolved before Engine.init()
- **Clean separation**: Sagas handle orchestration, EngineService handles Engine lifecycle

### Saga vs Engine Responsibilities

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURAL LAYERS                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     REDUX SAGAS LAYER                               │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ Orchestration │  │ Async Coordination│  │Action Dispatching│     │
│  └───────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                     │
│  • Coordinates startup sequence                                    │
│  • Waits for multiple async signals                                │
│  • Dispatches actions to Redux                                     │
│  • Manages high-level app state machine                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Triggers
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ENGINESERVICE LAYER                               │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │Engine Lifecycle│  │ Controller Setup │  │ Persistence Setup│     │
│  └───────────────┘  └──────────────────┘  └──────────────────┘     │
│                                                                     │
│  • Manages Engine initialization lifecycle                         │
│  • Sets up early messenger subscriptions                            │
│  • Coordinates persistence and Redux updates                        │
│  • Bridges between Sagas and Engine                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Initializes
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ENGINE LAYER                                   │
│  ┌───────────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │Controller Management│ │Business Logic│  │ State Management │     │
│  └───────────────────┘  └──────────────┘  └──────────────────┘     │
│                                                                     │
│  • Manages all blockchain controllers                               │
│  • Handles wallet business logic                                   │
│  • Maintains controller state                                      │
│  • Emits state change events                                       │
└─────────────────────────────────────────────────────────────────────┘

RESPONSIBILITIES SUMMARY:
═══════════════════════════════════════════════════════════════════════

Sagas         → WHAT to do and WHEN (orchestration)
EngineService → HOW to initialize and wire everything (lifecycle)
Engine        → WHAT data to manage and process (business logic)
```
