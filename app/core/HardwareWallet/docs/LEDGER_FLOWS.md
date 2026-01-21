# Ledger Hardware Wallet Flows

This document describes all the Ledger-related user flows in MetaMask Mobile and where errors should be handled.

## Overview of Ledger Flows

| Flow               | Entry Point                 | Key Components                                      | Error Handling Status |
| ------------------ | --------------------------- | --------------------------------------------------- | --------------------- |
| Add Ledger Account | Settings → Connect Hardware | `LedgerConnect`, `LedgerSelectAccount`, `Scan`      | ✅ Integrated         |
| Send Transaction   | Send Flow → Confirm         | `LedgerSignModal`, `LedgerConfirmationModal`        | ✅ Integrated         |
| Swap               | Swaps → Confirm             | `LedgerSignModal`, `LedgerConfirmationModal`        | ✅ Integrated         |
| Sign Message       | dApp → Sign Request         | `LedgerSignModal`, `LedgerConfirmationModal`        | ✅ Integrated         |
| Sign Typed Data    | dApp → Sign Request         | `LedgerSignModal`, `LedgerConfirmationModal`        | ✅ Integrated         |
| Legacy Send        | Legacy Send Flow            | `LedgerMessageSignModal`, `LedgerConfirmationModal` | ✅ Integrated         |

## Flow 1: Add Ledger Account

### User Journey

1. User goes to Settings → Security & Privacy → Connect Hardware Wallet
2. Selects "Ledger"
3. App scans for Bluetooth devices
4. User selects their Ledger device
5. App connects and retrieves accounts
6. User selects accounts to import

### Components Involved

```
SelectHardwareWallet (entry)
    └── LedgerSelectAccount
            ├── LedgerConnect (if not connected)
            │       └── Scan (Bluetooth scanning)
            └── AccountSelector (after connected)
```

### Key Files

- `app/components/Views/LedgerSelectAccount/index.tsx` - Main flow controller
- `app/components/Views/LedgerConnect/index.tsx` - Connection UI
- `app/components/Views/LedgerConnect/Scan.tsx` - Bluetooth scanning

### Error Points

| Location                        | Error Type                       | Bottom Sheet?          |
| ------------------------------- | -------------------------------- | ---------------------- |
| `Scan.tsx`                      | Bluetooth off                    | ✅ Yes                 |
| `Scan.tsx`                      | Bluetooth permission denied      | ✅ Yes                 |
| `Scan.tsx`                      | Location permission denied       | ✅ Yes                 |
| `Scan.tsx`                      | Nearby devices permission denied | ✅ Yes                 |
| `Scan.tsx`                      | Device scan failed               | ✅ Yes                 |
| `LedgerConnect/index.tsx`       | Failed to open ETH app           | ✅ Yes                 |
| `LedgerConnect/index.tsx`       | Failed to close app              | ✅ Yes                 |
| `LedgerConnect/index.tsx`       | ETH app not installed            | ✅ Yes                 |
| `LedgerConnect/index.tsx`       | Device locked                    | ✅ Yes                 |
| `LedgerConnect/index.tsx`       | User refused confirmation        | Navigation only        |
| `LedgerConnect/index.tsx`       | Device disconnected              | ✅ Yes (after retries) |
| `LedgerSelectAccount/index.tsx` | Account fetch error              | ✅ Yes                 |
| `LedgerSelectAccount/index.tsx` | Unlock account error             | ✅ Yes                 |

---

## Flow 2: Send Transaction (New Confirmations)

### User Journey

1. User initiates a send transaction
2. Reaches confirmation screen
3. Clicks "Confirm"
4. `LedgerSignModal` opens
5. User confirms on Ledger device
6. Transaction is submitted

### Components Involved

```
Send Flow / Confirmations
    └── useConfirmActions.onConfirm()
            └── LedgerContextProvider
                    └── LedgerSignModal
                            └── LedgerConfirmationModal
                                    └── useLedgerBluetooth hook
```

### Key Files

- `app/components/Views/confirmations/context/ledger-context/ledger-context.tsx` - Ledger context
- `app/components/Views/confirmations/components/modals/ledger-sign-modal/ledger-sign-modal.tsx` - Sign modal wrapper
- `app/components/UI/LedgerModals/LedgerConfirmationModal.tsx` - Actual signing UI
- `app/components/hooks/Ledger/useLedgerBluetooth.ts` - Bluetooth connection hook

### Error Points

| Location                      | Error Type                  | Bottom Sheet?     |
| ----------------------------- | --------------------------- | ----------------- |
| `LedgerConfirmationModal.tsx` | Bluetooth off               | ✅ Yes            |
| `LedgerConfirmationModal.tsx` | Bluetooth permission errors | ✅ Yes            |
| `LedgerConfirmationModal.tsx` | Device locked               | ✅ Yes            |
| `LedgerConfirmationModal.tsx` | User rejected               | No (silent close) |
| `LedgerConfirmationModal.tsx` | Blind signing disabled      | ✅ Yes            |
| `ledger-sign-modal.tsx`       | RPC event error             | ✅ Yes            |
| `ledger-sign-modal.tsx`       | onConfirm catch             | ✅ Yes            |

---

## Flow 3: Swap Transaction

Same as Flow 2 - uses `LedgerSignModal` through `LedgerContextProvider`.

### Error Points

Same as Send Transaction flow.

---

## Flow 4: Message Signing (dApp)

### User Journey

1. dApp requests message signature
2. Sign request modal appears
3. User clicks "Sign"
4. `LedgerSignModal` opens
5. User confirms on Ledger device
6. Signature is returned to dApp

### Components Involved

Same as Flow 2.

### Error Points

Same as Flow 2.

---

## Flow 5: Legacy Send Flow

### User Journey

1. User uses legacy send flow
2. Reaches confirmation
3. `LedgerMessageSignModal` opens via navigation

### Components Involved

```
Legacy Send Confirm
    └── LedgerMessageSignModal (via navigation)
            └── LedgerConfirmationModal
                    └── useLedgerBluetooth hook
```

### Key Files

- `app/components/Views/confirmations/legacy/SendFlow/Confirm/index.js` - Legacy confirm
- `app/components/UI/LedgerModals/LedgerMessageSignModal.tsx` - Navigation-based modal

### Error Points

| Location                      | Error Type            | Bottom Sheet? |
| ----------------------------- | --------------------- | ------------- |
| `LedgerMessageSignModal.tsx`  | RPC event error       | ✅ Yes        |
| `LedgerMessageSignModal.tsx`  | executeOnLedger catch | ✅ Yes        |
| `LedgerConfirmationModal.tsx` | All errors            | ✅ Yes        |

---

## Error Integration Summary

### Files with `useHardwareWalletError` Integration

| File                            | parseAndShowError Usage                  |
| ------------------------------- | ---------------------------------------- |
| `LedgerConnect/Scan.tsx`        | Bluetooth errors                         |
| `LedgerConnect/index.tsx`       | Ledger communication errors              |
| `LedgerSelectAccount/index.tsx` | Account fetch/unlock errors              |
| `LedgerConfirmationModal.tsx`   | Signing flow errors                      |
| `ledger-sign-modal.tsx`         | RPC event errors, onConfirm errors       |
| `LedgerMessageSignModal.tsx`    | RPC event errors, executeOnLedger errors |

### Error Types and Recovery Actions

| Error Code                         | Recovery Action         | Button Text     |
| ---------------------------------- | ----------------------- | --------------- |
| `PermissionBluetoothDenied`        | Open App Settings       | "View Settings" |
| `PermissionLocationDenied`         | Open App Settings       | "View Settings" |
| `PermissionNearbyDevicesDenied`    | Open App Settings       | "View Settings" |
| `BluetoothDisabled`                | Open Bluetooth Settings | "View Settings" |
| `DeviceDisconnected`               | Retry                   | "Retry"         |
| `AuthenticationDeviceLocked`       | Retry                   | "Retry"         |
| `DeviceStateEthAppClosed`          | Retry                   | "Retry"         |
| `DeviceStateBlindSignNotSupported` | Dismiss                 | "Cancel"        |
| `UserRejected`                     | No bottom sheet         | (Silent close)  |
| `UserCancelled`                    | No bottom sheet         | (Silent close)  |
| `Unknown`                          | Retry                   | "Retry"         |

---

## Testing Checklist

### Account Addition Flow

- [ ] Bluetooth off → Bottom sheet with "View Settings"
- [ ] Bluetooth permission denied → Bottom sheet with "View Settings"
- [ ] Location permission denied → Bottom sheet with "View Settings"
- [ ] Nearby devices permission denied → Bottom sheet with "View Settings"
- [ ] Device scan failed → Bottom sheet with "Retry"
- [ ] Device disconnected during connection → Bottom sheet with "Retry"
- [ ] ETH app not open → Bottom sheet with "Retry"
- [ ] Device locked → Bottom sheet with "Retry"

### Transaction Signing Flow

- [ ] Bluetooth off during signing → Bottom sheet with "View Settings"
- [ ] Device disconnected during signing → Bottom sheet with "Retry"
- [ ] User rejected on device → Modal closes, no bottom sheet
- [ ] Blind signing disabled → Bottom sheet with "Cancel"

---

## Known Gaps and Recommended Fixes

### ✅ FIXED: Bridge Flow

**Location:** `app/components/UI/Bridge/BridgeView/index.tsx`
**Issue:** The Bridge flow calls `BridgeStatusController.submitTx()` directly, bypassing Ledger modals. Errors were shown as console errors only.
**Fix Applied:** Added `parseAndShowError(error)` call in the `handleContinue` catch block.

### ⚠️ POTENTIAL GAP: Swaps Flow (QuotesView.js)

**Location:** `app/components/UI/Swaps/QuotesView.js` (lines 1030-1040)
**Issue:** The swaps flow uses `addTransaction` through TransactionController. For hardware wallets, it subscribes to `TransactionController:transactionConfirmed`. However, if a Ledger error occurs, the catch blocks only log to console.
**Assessment:** This may NOT need fixing because:

1. Swaps uses the normal TransactionController flow
2. For hardware wallets (`isHardwareAccount`), transactions go through approval flows
3. Ledger signing happens through the Ledger modals which already have error handling

### ⚠️ NEEDS REVIEW: Legacy Alert.alert Locations

The following locations use `Alert.alert` for transaction errors instead of the centralized bottom sheet. These may show native alerts for Ledger errors if they bypass the Ledger modals:

| File                                  | Line      | Context                     |
| ------------------------------------- | --------- | --------------------------- |
| `RootRPCMethodsUI.js`                 | 149       | RPC handler errors          |
| `legacy/Approve/index.js`             | 619       | Approval transaction errors |
| `legacy/SendFlow/Confirm/index.js`    | 527, 1093 | Send confirmation errors    |
| `legacy/Send/index.js`                | 642       | Send flow errors            |
| `legacy/ApproveView/Approve/index.js` | 634       | Legacy approve errors       |
| `legacy/Approval/index.js`            | 618       | Legacy approval errors      |

**Assessment:** Most of these are LIKELY OK because:

1. Ledger transactions go through `createLedgerTransactionModalNavDetails` first
2. The `LedgerConfirmationModal` catches and handles Ledger-specific errors
3. The `Alert.alert` calls are for general transaction failures that happen AFTER Ledger signing succeeds

**Exception - May need fix:**

- If a transaction fails at `addTransaction` stage BEFORE Ledger modal opens
- If there's a race condition where Ledger error reaches the outer catch

### Flow-by-Flow Analysis

| Flow                          | Uses Ledger Modal?                  | Error Handling               | Status       |
| ----------------------------- | ----------------------------------- | ---------------------------- | ------------ |
| Add Ledger Account            | N/A (BLE scanning)                  | ✅ `useHardwareWalletError`  | ✅ Complete  |
| New Confirmations (Send/Sign) | ✅ `LedgerSignModal`                | ✅ `useHardwareWalletError`  | ✅ Complete  |
| Legacy Send (Ledger)          | ✅ `LedgerMessageSignModal`         | ✅ `useHardwareWalletError`  | ✅ Complete  |
| Bridge                        | ❌ Direct `submitTx()`              | ✅ `parseAndShowError` added | ✅ Fixed     |
| Swaps                         | ✅ `addTransaction` → approval flow | Via Ledger modals            | ✅ Likely OK |
| dApp Sign Message             | ✅ `LedgerSignModal`                | ✅ `useHardwareWalletError`  | ✅ Complete  |
| dApp Sign Typed Data          | ✅ `LedgerSignModal`                | ✅ `useHardwareWalletError`  | ✅ Complete  |

### Recommended Future Improvements

1. **Add Error Boundaries:** Consider wrapping Ledger flows in error boundaries to catch unexpected errors
2. **Unify Error Handling:** Consider making `parseAndShowError` available at a higher level so any transaction error could be parsed for Ledger-specific codes
3. **Add Telemetry:** Track which errors users see to identify any gaps in production
4. **Test E2E:** Add E2E tests for Ledger error scenarios (device locked, blind signing, disconnect)

- [ ] Device locked during signing → Bottom sheet with "Retry"

### Message Signing Flow

- [ ] Same as transaction signing flow

---

## Notes

1. **User Cancellation**: Errors where the user explicitly cancelled (e.g., `UserRejected`, `UserCancelled`) do NOT show the bottom sheet - the modal just closes silently.

2. **RPC Event Errors**: When `signingEvent.eventStage === RPCStageTypes.ERROR`, the error from `signingEvent.error` is parsed and shown in the bottom sheet.

3. **Legacy vs New Confirmations**: Both legacy (`LedgerMessageSignModal`) and new (`LedgerSignModal`) flows are integrated with the error bottom sheet.

4. **Provider Location**: `HardwareWalletErrorProvider` is wrapped at the Root level, so the bottom sheet can appear on any screen.
