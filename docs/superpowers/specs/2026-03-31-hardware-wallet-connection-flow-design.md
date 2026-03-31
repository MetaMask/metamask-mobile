# Hardware Wallet Connection Flow — Wallet-Agnostic Design

## Problem

The hardware wallet connection flow is hardcoded for Ledger. Error components, wallet type selection, and account unlocking are all Ledger-specific. Adding a new hardware wallet type requires modifying the main connection flow, duplicating error logic, and creating parallel screens.

## Goals

1. Wire up the full connection flow end-to-end for Ledger using the new adapter pattern
2. Make error handling wallet-type-agnostic via an error component registry
3. Replace `LedgerSelectAccount` with the new `AccountSelectionFlow`
4. Ensure adding a new hardware wallet type requires only: adapter + error components + registry entry

## Non-Goals

- Multi-chain account creation (EVM only for now; multi-chain later with a "switch app" screen)
- Supporting hardware wallets beyond Ledger in this iteration
- Changing the `HardwareWalletProvider` or adapter interface

## Architecture

### Error Component Registry

Resolution order for a given `(walletType, errorCode)`:

1. **Wallet-specific** — check the wallet-type-specific error map first
2. **Shared fallback** — transport/permission errors that apply to all BLE wallets
3. **Generic fallback** — `GenericError` using SDK error messages

```
errors/
  registry.ts                ← resolveErrorComponent(walletType, errorCode)
  shared/
    TransportError.tsx       ← BLE denied, location denied, bluetooth disabled, connection failed
    DeviceNotFoundError.tsx  ← device not found
    DeviceUnresponsiveError.tsx ← timeout/unresponsive
    GenericError.tsx         ← fallback for unknown errors
  ledger/
    LedgerAppClosedError.tsx
    LedgerBlindSigningDisabledError.tsx
  [future: trezor/, keystone/, etc.]
```

Error component props (standardized):

```ts
type ErrorComponentProps = {
  errorCode: ErrorCode;
  error?: HardwareWalletError;
  onRetry: () => void;
  onContinue: () => void;
  onExit: () => void;
  onOpenSettings: () => void;
  onOpenBluetoothSettings: () => void;
};
```

### Connection Flow

Single screen (`hardware-wallet/index.tsx`) with state-driven rendering. No changes to the screen structure — only to how wallet type and errors are resolved.

```
Entry → navigate with walletType route param
  │
  ├─ setTargetWalletType(walletType)
  ├─ ensureDeviceReady()
  │
  ▼
STATE: Scanning
  └ LookingForDeviceState + OnboardingTips
  └ If transport unavailable → ERROR (shared transport)
  │
  ├─ device(s) found
  ▼
STATE: Device Found
  └ DeviceFoundState
  └ Multiple? → SelectDeviceSheet
  └ Tap to connect → connectToDevice(id)
  │
  ├─ success → navigate to Account Selection
  └─ error → resolveErrorComponent(walletType, errorCode)
```

Changes to `index.tsx`:

| What               | Before                                           | After                                          |
| ------------------ | ------------------------------------------------ | ---------------------------------------------- |
| Wallet type        | `setTargetWalletType(HardwareWalletType.Ledger)` | `setTargetWalletType(route.params.walletType)` |
| Error rendering    | 50-line switch with hardcoded Ledger cases       | `resolveErrorComponent(walletType, errorCode)` |
| Success navigation | `Routes.HW.LEDGER_CONNECT`                       | Wallet-type-aware account selection route      |

### Account Selection

New screen wrapping `AccountSelectionFlow` component. Replaces `LedgerSelectAccount`.

```
Entry → navigated from connection success
  │
  ├─ fetch accounts via adapter
  ├─ load existing accounts
  │
  ▼
AccountSelectionFlow
  └ Account cards with multi-chain asset display
  └ Pagination: prev / next
  └ Settings: HD path selector
  │
  ├─ continue
  │   └ ensureDeviceReady(deviceId)
  │   └ unlock selected accounts
  │   └ pop(2) → wallet home
  │
  └─ forget
      └ disconnect + remove accounts
      └ pop(2) → wallet home
```

The data-fetching logic (account fetching, unlocking) is wallet-type-aware but the `AccountSelectionFlow` UI component is shared.

### Adding a New Wallet Type

1. Create adapter: `adapters/NewWalletAdapter.ts` (implements `HardwareWalletAdapter`)
2. Register in factory: `factory.ts` switch case
3. Add error components: `errors/newwallet/` directory
4. Register errors in the registry
5. Connection flow and account selection screen are unchanged

## Scope of Changes

### Files to modify

- `app/components/Views/hardware-wallet/index.tsx` — wallet type from route params, registry-based error rendering
- `app/components/Views/hardware-wallet/errors/` — restructure into registry + shared + wallet-specific
- `app/components/Views/hardware-wallet/hardwareWallet.testIds.ts` — update test IDs if needed
- `app/constants/navigation/Routes.ts` — add generic account selection route
- Navigation config — wire up new account selection screen

### Files to create

- `app/components/Views/hardware-wallet/errors/registry.ts`
- `app/components/Views/hardware-wallet/errors/shared/` — shared error components
- New account selection screen (wrapping `AccountSelectionFlow`)

### Files to keep (no changes)

- `app/core/HardwareWallet/HardwareWalletProvider.tsx`
- `app/core/HardwareWallet/contexts/HardwareWalletContext.tsx`
- `app/core/HardwareWallet/adapters/` — adapter interface unchanged
- `app/core/HardwareWallet/errors/mappings.ts` — SDK error mappings unchanged
- `app/components/Views/hardware-wallet/components/AccountSelectionFlow.tsx` — UI component unchanged

### Files to deprecate

- `app/components/Views/LedgerSelectAccount/` — replaced by new account selection screen

## Error Bucket Classification

| Bucket           | Examples                                        | Resolution                                       |
| ---------------- | ----------------------------------------------- | ------------------------------------------------ |
| Shared transport | BLE denied, location denied, bluetooth disabled | Shared `TransportError` component                |
| Shared concept   | Device not found, unresponsive, timeout         | Shared component, wallet-type-aware illustration |
| Wallet-specific  | App closed (Ledger), blind signing (Ledger)     | Wallet-specific component                        |
| Generic fallback | Unknown errors, unhandled codes                 | `GenericError` with SDK message                  |
