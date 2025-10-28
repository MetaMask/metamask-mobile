# MetaMask Mobile State Management Flow

This document describes the complete state management flow in MetaMask Mobile, from app initialization through migrations, Redux persist, Engine initialization, and the new persistence system.

## 🔄 Complete Application State Flow

```
┌─────────────────┐
│   App Starts    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Redux Store     │
│ Created with    │
│ persistReducer  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ persistStore()  │
│ Called →        │
│ Triggers        │
│ Rehydration     │
└─────────┬───────┘
          │
          ▼
      ┌───────┐
      │Migration│ ──── No ────┐
      │Needed? │              │
      └───┬───┘               │
          │ Yes               │
          ▼                   │
┌─────────────────┐           │
│ Run Migrations  │           │
│ 000-104         │           │
│ (During         │           │
│ Rehydration)    │           │
└─────────┬───────┘           │
          │                   │
          ▼                   │
    ┌──────────┐              │
    │Migration │              │
    │= 104?    │ ── No ──┐    │
    └────┬─────┘         │    │
         │ Yes           │    │
         ▼               ▼    │
┌─────────────────┐ ┌────────┼────┐
│ Migration 104:  │ │ Legacy │    │
│ Split Legacy    │ │Migration│    │
│ Engine State    │ │         │    │
│ Into Individual │ │         │    │
│ Controller Files│ │         │    │
└─────────┬───────┘ └────────┬────┘
          │                  │    │
          └──────┬───────────┘    │
                 │                │
                 ▼                │
          ┌─────────────────┐     │
          │ Redux Store     │◄────┘
          │ Rehydrated with │
          │ Migrated State  │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ onPersistComplete│
          │ Callback        │
          │ Executed        │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ EngineService   │
          │ .start()        │
          │ Called          │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Get Redux State │
          │ & Controller    │
          │ Storage Files   │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Engine.init     │
          │ Called with     │
          │ Combined State  │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Controllers     │
          │ Initialized     │
          │ in Engine       │
          │ Context         │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │initializeControllers│
          │ Subscribe to    │
          │ State Changes   │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │setupEnginePersistence│
          │ Setup New       │
          │ Persistence     │
          │ System          │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Subscribe to    │
          │ All Controller  │
          │ State Change    │
          │ Events          │
          └─────────┬───────┘
                    │
                    ▼
          ┌─────────────────┐
          │ 🔄 Runtime Loop │
          │ Controller      │
          │ Updates →       │
          │ Redux + File    │
          │ Storage         │
          └─────────────────┘
```

## Detailed Step-by-Step Flow

### 1. **Redux Store Creation & Rehydration Phase**

```typescript
// Location: app/store/index.ts
const pReducer = persistReducer(persistConfig, rootReducer);
store = configureStore({ reducer: pReducer, ... });
persistor = persistStore(store, null, onPersistComplete);
```

**What happens:**

- **Redux store is created FIRST** with `persistReducer` wrapper (but empty/default state)
- **`persistStore()` is called** which triggers rehydration process
- **During rehydration**: Migrations run if version mismatch detected
- **Migration 104** specifically splits legacy `engine.backgroundState` into individual controller files
- **After migrations**: The migrated state is used to rehydrate the Redux store
- **`onPersistComplete` callback fires** when rehydration is done

**Important Files:**

- `app/store/index.ts` - Store creation and persistence setup
- `app/store/migrations/index.ts` - Migration orchestration
- `app/store/migrations/104.ts` - **THE CRITICAL MIGRATION** that splits persistence from redux-persist to individual controller files
- `app/store/persistConfig/index.ts` - Redux-persist configuration

### 2. **Redux Rehydration**

```typescript
// The rehydrated state is now available in Redux store
const reduxState = ReduxService.store.getState();
```

**What happens:**

- Redux store is populated with migrated/loaded state
- State is available for UI components
- Engine initialization can begin

### 3. **Engine Service Startup**

```typescript
// Location: app/core/EngineService/EngineService.ts - start()
```

**What happens:**

```typescript
const reduxState = ReduxService.store.getState();
const persistedState = await ControllerStorage.getAllPersistedState();

// Choose state source based on environment
const state = isE2E
  ? reduxState?.engine?.backgroundState
  : persistedState?.backgroundState ?? {};
```

- **Gets state from TWO sources:**
  - Redux store (legacy/E2E)
  - New ControllerStorage (controller-per-file system)
- **Combines the states** to initialize Engine

### 4. **Engine Initialization**

```typescript
// Location: app/core/Engine/Engine.ts - init()
```

**What happens:**

```typescript
Engine.init(state, null, metaMetricsId);
```

- **Engine singleton gets initialized** with combined state
- **All controllers get created** and populated with their respective state
- Engine context is populated with controller instances
- Controllers are now live and functional

### 5. **Controller Integration Setup**

```typescript
// Location: app/core/EngineService/EngineService.ts - initializeControllers()
```

**What happens:**

```typescript
engine.controllerMessenger.subscribeOnceIf(
  'ComposableController:stateChange',
  () => {
    this.updateBatcher.add(INIT_BG_STATE_KEY);
    this.updateBatcher.flush(); // Initial Redux sync
    this.engineInitialized = true;
  },
);
```

- **Waits for first controller state change** (indicates controllers are ready)
- **Pushes initial controller state to Redux** via updateBatcher
- **Marks engine as initialized** - UI can now safely access controller data

### 6. **New Persistence System Setup**

```typescript
// Location: app/core/EngineService/EngineService.ts - setupEnginePersistence()
```

**What happens:**

```typescript
BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
  const controllerName = eventName.split(':')[0];
  const persistController = createPersistController(200);

  UntypedEngine.controllerMessenger.subscribe(
    eventName,
    async (controllerState) => {
      // 1. Update Redux store
      this.updateBatcher.add(controllerName);

      // 2. Persist to individual controller file
      await persistController(filteredState, controllerName);
    },
  );
});
```

- **Subscribes to ALL controller state changes**
- **Dual persistence**: Updates both Redux store AND individual controller files
- **Debounced file writes** (200ms) to prevent excessive disk I/O

### 7. **Runtime State Management Loop**

**When any controller state changes:**

1. **Controller updates its internal state**
2. **Controller emits state change event**
3. **EngineService listener catches the event**
4. **updateBatcher.add()** - Queues Redux update
5. **persistController()** - Saves to individual file storage
6. **Redux store gets updated** (UI re-renders)
7. **File storage gets updated** (persistence)

## Architecture Overview

### **Legacy System (Pre-Migration 103)**

- Single large Redux-persist file
- Engine state stored in `engine.backgroundState`
- Single point of failure

### **New System (Post-Migration 103+)**

- **Dual Persistence**: Redux + Individual controller files
- **Controller-per-file**: Each controller has its own storage file
- **Resilient**: Failure in one controller doesn't affect others
- **Performance**: Smaller, focused file operations

### **Key Components**

| Component             | Purpose                                   | Location                   |
| --------------------- | ----------------------------------------- | -------------------------- |
| **Migration System**  | Version management & state transformation | `app/store/migrations/`    |
| **Redux-Persist**     | Legacy state hydration                    | `app/store/persistConfig/` |
| **EngineService**     | Orchestrates Engine lifecycle             | `app/core/EngineService/`  |
| **Engine**            | Controller management & business logic    | `app/core/Engine/`         |
| **ControllerStorage** | New file-based persistence                | Controller Storage System  |
| **updateBatcher**     | Efficient Redux updates                   | Batching system            |
