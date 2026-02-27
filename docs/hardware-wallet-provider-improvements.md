# HardwareWalletProvider — Improvement Plan

## Goal

Reduce the provider from ~710 lines of ref-heavy orchestration to a ~100-line **composition root** that wires hooks together. Each hook owns its own refs/state as private implementation details.

### Target state

```tsx
const HardwareWalletProvider = ({ children }) => {
  const { walletType, targetWalletType, deviceId, connectionState, setters } =
    useHardwareWalletStateManager();
  const effectiveWalletType = targetWalletType ?? walletType;

  const { handleDeviceEvent, handleError, clearError, updateConnectionState } =
    useDeviceEventHandlers({ ... });

  const adapter = useAdapterLifecycle(effectiveWalletType, ...);
  const { createTransportError, checkTransportOrShowError } =
    useTransportMonitoring(adapter, connectionState, ...);
  const discovery = useDeviceDiscovery(adapter, connectionState, ...);
  const readyFlow = useBlockingReadyFlow(adapter, effectiveWalletType, ...);

  // ~30 lines: awaiting confirmation (simple enough to stay inline)
  // contextValue memo
  // render: Context.Provider + HardwareWalletBottomSheet
};
```

---

## Step 0. Create `hooks/` folder and reorganize

Move `HardwareWalletStateManager.tsx` and `HardwareWalletEventHandlers.tsx` into `app/core/HardwareWallet/hooks/`, renaming for consistency:

- `HardwareWalletStateManager.tsx` → `hooks/useHardwareWalletStateManager.ts`
- `HardwareWalletEventHandlers.tsx` → `hooks/useDeviceEventHandlers.ts`
- Add `hooks/index.ts` barrel export

New hooks from steps 1–4 will be created directly in `hooks/`.

**Context stays in `contexts/`.** `HardwareWalletContext.tsx` exports both the raw context object (used by the provider) and the `useHardwareWallet` consumer hook. These serve different audiences — the context is infrastructure, the hook is the public API. Mixing them into the internal `hooks/` folder would blur that boundary.

Resulting structure:

```
HardwareWallet/
├── hooks/
│   ├── useHardwareWalletStateManager.ts
│   ├── useDeviceEventHandlers.ts
│   ├── useAdapterLifecycle.ts
│   ├── useTransportMonitoring.ts
│   ├── useDeviceDiscovery.ts
│   ├── useBlockingReadyFlow.ts
│   └── index.ts
├── contexts/
│   └── HardwareWalletContext.tsx   (public consumer hook + context object)
├── adapters/
├── components/
├── HardwareWalletProvider.tsx      (composition root — ~100 lines)
└── ...
```

---

## Step 1. Extract `useAdapterLifecycle` hook

**What moves out:** `createAdapterWithCallbacks`, `initializeAdapter`, the adapter lifecycle `useEffect`, `transportCleanupRef`.

**Returns:** the current adapter (via ref, exposed as a getter or stable ref object).

**Why first:** every other hook depends on the adapter — extracting it first gives the others a clean input.

This also addresses **item 14** (TODO comment about non-hardware adapter) — the explanation will be a proper comment inside the new hook.

---

## Step 2. Extract `useTransportMonitoring` hook

**What moves out:** `isTransportAvailable` state, `previousTransportAvailableRef`, `createTransportError` (renamed `createTransportDisabledError`), the "transport went unavailable" `useEffect`, and a shared `checkTransportOrShowError()` helper.

**Returns:** `{ isTransportAvailable, createTransportDisabledError, checkTransportOrShowError }`.

The `checkTransportOrShowError` helper addresses the **duplicated transport-check pattern** that currently appears in 3 places (transport monitoring effect, `ensureDeviceReady`, `retryLastOperation`). After extraction, the effect uses it internally, and the other two call sites get it from the hook's return value.

---

## Step 3. Extract `useDeviceDiscovery` hook

**What moves out:** `deviceSelectionState` + `setDeviceSelectionState`, `discoveryCleanupRef`, `startDiscovery`, `stopDiscovery`, `selectDevice`, `rescan`, and the `useEffect` that ties discovery start/stop to `Scanning` status.

**Returns:** `{ deviceSelection, selectDevice, rescan, startDiscovery }`.

This also addresses **item 9** (`INITIAL_DEVICE_SELECTION_STATE` constant) — the default value will be defined once inside the hook.

---

## Step 4. Extract `useBlockingReadyFlow` hook

**What moves out:** `lastOperationRef`, `pendingReadyResolveRef`, `connectionSuccessCallbackRef`, and the logic currently spread across `ensureDeviceReady`, `connect`, `retryLastOperation`, `closeDeviceSelection`, and `handleConnectionSuccess`.

**Returns:** `{ ensureDeviceReady, connect, retryLastOperation, closeFlow, handleConnectionSuccess }`.

This is the highest-complexity extraction. It consolidates the 3 refs that implement the "blocking promise" pattern into a single hook, and subsumes several existing improvement items:

- **Item 6** (duplicated promise wiring) — the two `new Promise<boolean>` blocks become a single `createBlockingPromise(afterSetup)` helper inside the hook.
- **Item 7** (`ensureDeviceReady` too many responsibilities) — adapter resolution, transport checking, and promise wiring become separate internal functions within the hook.
- **Item 8** (inline IIFE for adapter creation) — becomes a named `resolveOrCreateAdapter(targetType)` function inside the hook.
- **Item 10** (`retryLastOperation` mixed control flow) — rewritten as a clean `switch` inside the hook.

---

## Step 5. Smaller improvements (apply during or after extraction)

### 5a. Remove trivial `clearErrorState` wrapper

Use `clearError` from `useDeviceEventHandlers` directly instead of wrapping it in another `useCallback`.

### 5b. Move connection tips to a utility

Create `getConnectionTipsForWalletType(walletType): string[]` in `helpers.ts` and call it directly in `ConnectingContent` (which already has `deviceType`). This removes:

- `connectionTips` state from the provider
- `connectionTips` prop from `HardwareWalletBottomSheet` and its props interface
- `getConnectionTips()` from the `HardwareWalletAdapter` interface and both adapter implementations

### 5c. Make `onClose` required on `HardwareWalletBottomSheet`

The provider always passes it and dismissing without cleanup would break the state machine. Remove the `?` and simplify `onClose?.()` calls to `onClose()`.

### 5d. Consolidate locale duplication

`"Ledger"` exists in `accounts.ledger`, `ledger.*` namespace, and `hardware_wallet.device_names.ledger`. Migrate old usages to the canonical `hardware_wallet.device_names` namespace. _(Deferred to cleanup PR.)_

### 5e. Replace TODO with real comment (adapter lifecycle)

The `// TODO: add explanation about why we're creating a non-hardware adapter` becomes a real comment explaining the null-object pattern: the provider always needs an adapter so consumers don't null-check, and `NonHardwareAdapter` is a passthrough where all methods are no-ops or return "ready" immediately.

---

## Execution order

| Step | What                                   | Risk                                               | Validates with              |
| ---- | -------------------------------------- | -------------------------------------------------- | --------------------------- |
| 0    | Create `hooks/`, move 2 existing hooks | None (file moves only)                             | Imports resolve, tests pass |
| 1    | Extract `useAdapterLifecycle`          | Low — adapter is input to everything               | Provider tests pass         |
| 2    | Extract `useTransportMonitoring`       | Low — self-contained reactive effect               | Provider tests pass         |
| 3    | Extract `useDeviceDiscovery`           | Low — self-contained state + effects               | Provider tests pass         |
| 4    | Extract `useBlockingReadyFlow`         | Medium — most complex, touches `ensureDeviceReady` | Provider tests pass         |
| 5    | Smaller improvements (5a–5e)           | Trivial each                                       | Tests + lints pass          |

Each step produces a working intermediate state. Tests should pass after every step.
