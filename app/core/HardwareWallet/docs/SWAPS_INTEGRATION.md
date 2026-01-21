# Swaps Flow Hardware Wallet Integration

This document explains how the HardwareWallet error system integrates with the swaps confirmation flow.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Swaps Confirmation UI                        │
│                                                                       │
│  User clicks "Confirm Swap" button                                   │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ useConfirmActions.onConfirm()                            │        │
│  │   - Checks if ledgerSigningInProgress === true           │        │
│  │   - If true, calls openLedgerSignModal()                 │        │
│  └─────────────────────────────────────────────────────────┘        │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ LedgerContextProvider                                    │        │
│  │   - Renders LedgerSignModal when modal is open           │        │
│  │   - Provides deviceId, error state, modal controls       │        │
│  └─────────────────────────────────────────────────────────┘        │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ LedgerSignModal → LedgerConfirmationModal               │        │
│  │   - Uses useLedgerBluetooth hook                         │        │
│  │   - Shows connection/signing steps                       │        │
│  │   - Calls showError() from HardwareWallet context        │        │
│  └─────────────────────────────────────────────────────────┘        │
│         │                                                             │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ HardwareWalletProvider (at Root level)                   │        │
│  │   - Receives errors via showError()                      │        │
│  │   - Renders HardwareWalletErrorBottomSheet              │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. LedgerContextProvider

**Location**: `app/components/Views/confirmations/context/ledger-context/ledger-context.tsx`

The context provider includes:

- `hardwareWalletError`: Current structured error from the HardwareWallet system
- `clearHardwareWalletError()`: Function to clear errors

```typescript
interface LedgerContextType {
  deviceId?: string;
  isLedgerAccount: boolean;
  ledgerSigningInProgress: boolean;
  openLedgerSignModal: () => void;
  closeLedgerSignModal: () => void;
  hardwareWalletError?: HardwareWalletError;
  clearHardwareWalletError: () => void;
}
```

### 2. LedgerSignModal + LedgerConfirmationModal

**Location**:

- `app/components/Views/confirmations/components/modals/ledger-sign-modal/ledger-sign-modal.tsx`
- `app/components/UI/LedgerModals/LedgerConfirmationModal.tsx`

`LedgerSignModal` is a wrapper that renders `LedgerConfirmationModal` which provides:

- Connection management via `useLedgerBluetooth` hook
- Step-based UI (Searching, OpenETHApp, Confirmation)
- Error handling via `useHardwareWallet` context
- Retry/dismiss handler registration

### 3. HardwareWalletProvider (at Root level)

**Location**: `app/core/HardwareWallet/HardwareWalletContext.tsx`

The provider at root level:

- Receives errors via `showError()`
- Renders `HardwareWalletErrorBottomSheet` when error is present
- Manages retry/dismiss handlers

## Error Flow

```
1. User initiates swap confirmation
       │
       ▼
2. Connection attempt via useLedgerBluetooth in LedgerConfirmationModal
       │
       ├── Success → Continue to signing step
       │
       └── Error → showError(error, HardwareWalletType.Ledger)
                        │
                        ▼
                   HardwareWalletContext receives error
                        │
                        ▼
3. HardwareWalletErrorBottomSheet displays:
   - User-friendly error message (localized)
   - Action buttons based on error type:
     • Retry button for recoverable errors
     • Cancel button to reject transaction
     • Settings button for permission issues
```

## Error Categories

| Category       | Description            | Example Codes                                      |
| -------------- | ---------------------- | -------------------------------------------------- |
| `device-state` | Physical device issues | `DEVICE_STATE_LOCKED`, `DEVICE_STATE_DISCONNECTED` |
| `app-state`    | Ethereum app issues    | `APP_STATE_NOT_OPEN`, `APP_STATE_WRONG_APP`        |
| `connection`   | Bluetooth issues       | `CONN_TIMEOUT`, `CONN_FAILED`                      |
| `user-action`  | User rejected          | `USER_REJECTED_ON_DEVICE`                          |
| `permission`   | Permission denied      | `PERM_BLUETOOTH_DENIED`                            |

## Migration from Old Error Handling

The old `LedgerConfirmationModal` used a giant switch statement to map `LedgerCommunicationErrors` to title/subtitle pairs. The new system:

1. **Before**: ~110 lines of switch/case in `LedgerConfirmationModal.tsx`
2. **After**:
   - `parseErrorByType()` automatically classifies errors
   - `HardwareWalletErrorBottomSheet` renders appropriate UI
   - Localized strings in `hardware_wallet.error.*`

## Backward Compatibility

The original `LedgerSignModal` is preserved for any code that may still import it directly. The `LedgerContextProvider` uses the enhanced version internally.

## Testing

Tests are available at:

- `ledger-sign-modal-enhanced.test.tsx` - Unit tests for the enhanced modal
- Integration with existing confirmation flow tests

## Future Enhancements

1. **Trezor Support**: Add `TrezorAdapter` following the same pattern
2. **QR Hardware Wallets**: Integrate Keystone/similar via adapter pattern
3. **Error Analytics Dashboard**: Track error frequencies by code
