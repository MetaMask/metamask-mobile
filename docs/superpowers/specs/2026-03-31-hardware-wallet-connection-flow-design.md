# Hardware Wallet Connection Flow — Wallet-Agnostic Design

## Problem

The hardware wallet connection flow is hardcoded for Ledger. Error components, wallet type selection, and account unlocking are all Ledger-specific. Adding a new hardware wallet type requires modifying the main connection flow, duplicating error logic, and creating parallel screens.

## Goals

1. Wire up the full connection flow end-to-end for Ledger using the new adapter pattern
2. Make error handling wallet-type-agnostic via an error component registry
3. Replace `LedgerSelectAccount` with a new screen wrapping `AccountSelectionFlow`
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

File structure:

```
errors/
  registry.ts                <- resolveErrorComponent(walletType, errorCode)
  ErrorState.tsx             <- generic error layout (renamed from LedgerErrorState)
  shared/
    TransportError.tsx       <- BLE denied, location denied, bluetooth disabled, connection failed
    DeviceNotFoundError.tsx  <- device not found
    DeviceUnresponsiveError.tsx <- timeout/unresponsive
    GenericError.tsx         <- fallback for unknown errors
  ledger/
    LedgerAppClosedError.tsx
    LedgerBlindSigningDisabledError.tsx
  [future: trezor/, keystone/, etc.]
```

**Standardized error props:**

All error components accept the same props. Callbacks that a component doesn't use are simply not rendered. This keeps the registry lookup clean — no per-component prop gymnastics.

```ts
import type { HardwareWalletError } from '@metamask/hw-wallet-sdk';

type ErrorComponentProps = {
  errorCode: ErrorCode;
  error?: HardwareWalletError;
  isBusy: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onExit: () => void;
  onOpenSettings: () => void;
  onOpenBluetoothSettings: () => void;
};
```

Each component picks the callbacks it needs:

| Component               | onRetry | onContinue | onExit | onOpenSettings | onOpenBluetoothSettings |
| ----------------------- | ------- | ---------- | ------ | -------------- | ----------------------- |
| TransportError          | yes     | -          | yes    | yes            | yes                     |
| DeviceNotFoundError     | yes     | -          | -      | -              | -                       |
| DeviceUnresponsiveError | yes     | -          | -      | -              | -                       |
| GenericError            | yes     | -          | yes    | -              | -                       |
| LedgerAppClosedError    | -       | yes        | -      | -              | -                       |
| LedgerBlindSigningError | -       | yes        | -      | -              | -                       |

**Base layout component:**

The existing `LedgerErrorState` is renamed to `ErrorState`. It accepts `testID`, `title`, `description`, `illustration`, `primaryAction`, `secondaryAction` — same props, generic name. All error components (shared and wallet-specific) compose this layout.

**Wallet-type-aware illustrations:**

`LookingForDeviceState`, `DeviceNotFoundState`, and `DeviceFoundState` currently import `LedgerDeviceIllustration` directly. These components will accept an `illustration` prop (or look it up from a wallet-type-to-illustration map). For now, Ledger illustration is the default. Adding a new wallet type means providing its illustration component — the states themselves don't change.

### Connection Flow

Single screen (`hardware-wallet/index.tsx`) with state-driven rendering.

```
Entry -> navigate with walletType route param
  |
  +- setTargetWalletType(walletType)
  +- ensureDeviceReady()
  |
  v
STATE: Scanning
  + LookingForDeviceState (wallet-type-aware illustration)
  + OnboardingTips
  + If transport unavailable -> ERROR (shared transport)
  |
  +- device(s) found
  v
STATE: Device Found
  + DeviceFoundState
  + Multiple? -> SelectDeviceSheet
  + Tap to connect -> connectToDevice(id)
  |
  +- connected, awaiting app
  v
STATE: AwaitingApp
  + AwaitingAppContent (wallet-type-aware: "Open [App] on your [Device]")
  + If app not detected within timeout -> ERROR (wallet-specific: app closed)
  |
  +- app open, device ready
  v
STATE: Connected
  -> navigate to Account Selection screen

STATE: Error (any point above)
  + resolveErrorComponent(walletType, errorCode)
     1. Wallet-specific?     -> e.g. LedgerAppClosedError
     2. Shared transport?    -> TransportError
     3. Shared concept?      -> DeviceNotFoundError / DeviceUnresponsiveError
     4. Fallback             -> GenericError (SDK message)
  + retry -> back to Scanning
  + exit -> goBack()
```

Changes to `index.tsx`:

| What               | Before                                           | After                                                               |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| Wallet type        | `setTargetWalletType(HardwareWalletType.Ledger)` | `setTargetWalletType(route.params.walletType)`                      |
| Error rendering    | 50-line switch with hardcoded Ledger cases       | `resolveErrorComponent(walletType, errorCode)`                      |
| Success navigation | `Routes.HW.LEDGER_CONNECT`                       | `Routes.HW.ACCOUNT_SELECTION`                                       |
| AwaitingApp state  | Rendered inline before error switch              | Part of the state machine, error from timeout goes through registry |

**Edge case: undefined error code in Error state.** The current code treats `errorCode === undefined` as device not found (renders `DeviceNotFoundState`). The registry will handle this: when `errorCode` is undefined, `resolveErrorComponent` returns `DeviceNotFoundError`.

### Account Selection

New screen at `app/components/Views/hardware-wallet/AccountSelection.tsx`. Replaces `LedgerSelectAccount`.

Route: `Routes.HW.ACCOUNT_SELECTION = 'HardwareAccountSelection'`

`AccountSelectionFlow` (the UI component) is already wallet-type-agnostic — it takes props and renders. The new screen is the **data wrapper** that provides those props.

```
Entry -> navigated from connection success
  |
  +- fetch accounts via Ledger API (wallet-type-aware in future)
  +- load existing accounts from keyring
  |
  v
AccountSelectionFlow (UI component, unchanged)
  + Account cards with multi-chain asset display
  + Pagination: prev / next
  + Settings: HD path selector
  |
  +- continue
  |   +- ensureDeviceReady(deviceId)
  |   +- unlock selected accounts via Ledger API
  |   +- pop(2) -> wallet home
  |
  +- forget
      +- forgetLedger() / disconnect + remove accounts
      +- pop(2) -> wallet home
```

**Ledger-specific business logic** (`getLedgerAccounts`, `unlockLedgerWalletAccount`, `forgetLedger`, `setHDPath`, etc.) moves into the new screen. These calls remain Ledger-specific for now. When a new wallet type is added, the screen dispatches to the right API based on `walletType` (or the adapter provides account management methods).

**Navigation registration:** Replace the `Routes.HW.LEDGER_CONNECT` -> `LedgerSelectAccount` registration in `App.tsx` with `Routes.HW.ACCOUNT_SELECTION` -> `AccountSelection`.

### Analytics

Existing analytics events are preserved but made wallet-type-aware:

| Event                                   | Current `device_type`                    | New `device_type`       |
| --------------------------------------- | ---------------------------------------- | ----------------------- |
| `HARDWARE_WALLET_ACCOUNT_SELECTOR_OPEN` | `HardwareDeviceTypes.LEDGER` (hardcoded) | From `walletType` param |
| `HARDWARE_WALLET_ADD_ACCOUNT`           | `HardwareDeviceTypes.LEDGER` (hardcoded) | From `walletType` param |
| `HARDWARE_WALLET_ERROR`                 | `HardwareDeviceTypes.LEDGER` (hardcoded) | From `walletType` param |
| `HARDWARE_WALLET_FORGOTTEN`             | `HardwareDeviceTypes.LEDGER` (hardcoded) | From `walletType` param |

### Adding a New Wallet Type

1. Create adapter: `adapters/NewWalletAdapter.ts` (implements `HardwareWalletAdapter`)
2. Register in factory: `factory.ts` switch case
3. Add error components: `errors/newwallet/` directory
4. Register in error registry
5. Provide illustration component
6. Add wallet-type-specific account logic to `AccountSelection.tsx` (if different from default)
7. Connection flow + account selection UI are unchanged

### Error Bucket Classification

| Bucket                   | Error Codes                                                                                                                                | Resolution                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Shared transport         | `PermissionBluetoothDenied`, `PermissionLocationDenied`, `PermissionNearbyDevicesDenied`, `BluetoothDisabled`, `BluetoothConnectionFailed` | `TransportError` component                                            |
| Shared concept           | `DeviceNotFound`, `undefined` (null error code), `DeviceUnresponsive`, `ConnectionTimeout`                                                 | Shared component, wallet-type-aware illustration                      |
| Wallet-specific (Ledger) | `DeviceStateEthAppClosed`, `DeviceMissingCapability`, `DeviceStateBlindSignNotSupported`                                                   | Ledger-specific component                                             |
| Generic fallback         | `Unknown`, unhandled codes                                                                                                                 | `GenericError` with SDK message via `HardwareWalletError.userMessage` |

## Scope of Changes

### Files to modify

- `app/components/Views/hardware-wallet/index.tsx` — wallet type from route params, registry-based error rendering, AwaitingApp state handling
- `app/components/Views/hardware-wallet/errors/` — restructure into registry + shared + wallet-specific
- `app/components/Views/hardware-wallet/errors/LedgerErrorState.tsx` — rename to `ErrorState.tsx`
- `app/components/Views/hardware-wallet/components/DeviceNotFoundState.tsx` — accept illustration prop
- `app/components/Views/hardware-wallet/components/LookingForDeviceState.tsx` — accept illustration prop
- `app/components/Views/hardware-wallet/hardwareWallet.testIds.ts` — update test IDs
- `app/constants/navigation/Routes.ts` — add `ACCOUNT_SELECTION` route
- Navigation config (`app/App.tsx` or equivalent) — wire new account selection screen

### Files to create

- `app/components/Views/hardware-wallet/errors/registry.ts`
- `app/components/Views/hardware-wallet/errors/shared/` — shared error components
- `app/components/Views/hardware-wallet/AccountSelection.tsx` — new screen wrapping `AccountSelectionFlow`

### Files to keep (no changes)

- `app/core/HardwareWallet/HardwareWalletProvider.tsx`
- `app/core/HardwareWallet/contexts/HardwareWalletContext.tsx`
- `app/core/HardwareWallet/adapters/` — adapter interface unchanged
- `app/core/HardwareWallet/errors/mappings.ts` — SDK error mappings unchanged
- `app/components/Views/hardware-wallet/components/AccountSelectionFlow.tsx` — UI component unchanged (already wallet-type-agnostic, takes props)

### Files to deprecate

- `app/components/Views/LedgerSelectAccount/` — replaced by `AccountSelection.tsx`. Tests in `index.test.tsx` will be migrated to cover the new screen.

## Test Plan

- Migrate existing `LedgerSelectAccount` tests to cover new `AccountSelection.tsx`
- Add tests for `registry.ts` — verify resolution order (wallet-specific > shared > generic)
- Add tests for each shared error component
- Verify existing `LedgerSelectAccount.test.tsx` scenarios all pass against the new screen
- Manual E2E: connect Ledger, select accounts, unlock, forget
