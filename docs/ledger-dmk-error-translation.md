# Ledger DMK Error Translation

## Problem

When using the Ledger Device Management Kit (DMK) integration, signature operations fail with a generic **"Something went wrong"** error instead of a descriptive, actionable message (e.g., "Device disconnected" or "Bluetooth connection failed").

## Root Cause

The `LedgerDMKBridge` (in `@metamask/eth-ledger-bridge-keyring`) has a gap in its error handling:

```
LedgerKeyring.signPersonalMessage()
  → LedgerDMKBridge.deviceSignMessage()
    → LedgerMobileDMKTransportMiddleware.getEthSigner().signMessage()
      → Observable<DeviceActionState>
        → waitForDeviceAction()
```

`waitForDeviceAction` translates errors that arrive through the `DeviceActionStatus.Error` state via `translateDmkError()`. However, when the RxJS observable itself errors out (session invalidation, transport failure, BLE disconnect during signing), the raw error bypasses `translateDmkError` entirely.

The unhandled error propagates as a plain JavaScript `Error`:

```
Error (raw DMK error)
  → handleLedgerTransportError()          // in eth-ledger-bridge-keyring
    → error instanceof TransportStatusError?  → NO
    → error instanceof HardwareWalletError?    → NO
    → error instanceof Error?                  → YES
      → new HardwareWalletError(message, { code: ErrorCode.Unknown })
        → "Something went wrong"
```

## Error Flow Diagram

```
                          DMK Signer Observable
                                   │
                    ┌──────────────┼──────────────┐
                    │              │               │
            DeviceActionStatus   RxJS Error    Observable
              .Error state       (raw throw)   completes empty
                    │              │               │
                    ▼              ▼               ▼
            translateDmkError   raw Error     EmptyError
                    │              │               │
                    ▼              ▼               ▼
            TransportStatusError  ┌┴───────────────┘
                    │             │
                    ▼             ▼
            handleLedgerTransportError
                    │
            ┌───────┴────────┐
            │                │
     TransportStatus   Plain Error
       Error path       path (BUG)
            │                │
            ▼                ▼
     Proper error       ErrorCode.Unknown
     code (e.g.         → "Something went
     DeviceUnresponsive)    wrong"
```

## Fix

Two-pronged error translation in the mobile error parser (`app/core/HardwareWallet/errors/`):

### 1. DMK `_tag`-based error name mappings (`mappings.ts`)

DMK errors identify themselves via `_tag` instead of `name`. Added mappings for common DMK `_tag` values:

| DMK `_tag` | Error Code | User Message |
|---|---|---|
| `DeviceSessionNotFound` | `DeviceDisconnected` | Device disconnected |
| `ConnectionOpeningError` | `BluetoothConnectionFailed` | Bluetooth connection failed |
| `DeviceDisconnectedWhileSendingError` | `DeviceDisconnected` | Device disconnected |
| `DeviceDisconnectedBeforeSendingApdu` | `DeviceDisconnected` | Device disconnected |
| `DeviceLockedError` | `AuthenticationDeviceLocked` | Device is locked |
| `DeviceNotConnectedError` | `DeviceDisconnected` | Device disconnected |
| `SessionRefresherError` | `DeviceDisconnected` | Device disconnected |

### 2. DMK message pattern matching (`parser.ts`)

Added fallback message patterns for errors that lack both `name` and `_tag`:

| Message Pattern | Error Code |
|---|---|
| `session not found` | `DeviceDisconnected` |
| `sessionid is not initialized` | `DeviceDisconnected` |
| `invalid session` | `DeviceDisconnected` |
| `device action ended without completion` | `DeviceUnresponsive` |
| `ledger command failed` | `DeviceNotReady` |

### 3. Extended `parseErrorByName` to check `_tag` (`parser.ts`)

The function previously only checked `error.name`. It now also checks `error._tag` (used by DMK errors), falling back to `_tag` when `name` is absent.

## Files Changed

| File | Change |
|---|---|
| `app/core/HardwareWallet/errors/mappings.ts` | Added DMK `_tag` values to `ERROR_NAME_MAPPINGS` |
| `app/core/HardwareWallet/errors/parser.ts` | Extended `parseErrorByName` to check `_tag`; added DMK message patterns to `parseErrorByMessage` |
| `app/core/HardwareWallet/errors/parser.test.ts` | Added 8 test cases covering `_tag`-based and message-based DMK error translation |

## Recommended Upstream Fix

The root cause should be fixed in `@metamask/eth-ledger-bridge-keyring`'s `LedgerDMKBridge.waitForDeviceAction` by adding a `catchError` operator:

```typescript
// ledger-dmk-bridge.ts (upstream package)
const state = await firstValueFrom(
  observable.pipe(
    catchError((error) => {
      throw translateDmkError(error);
    }),
    filter(
      ({ status }) =>
        status === DeviceActionStatus.Completed ||
        status === DeviceActionStatus.Error,
    ),
  ),
);
```

This ensures all DMK errors (both `DeviceActionStatus.Error` states and RxJS observable errors) are translated to `TransportStatusError`, which the keyring's `handleLedgerTransportError` can properly classify.

## Testing

```bash
yarn jest app/core/HardwareWallet/errors/ --no-coverage
```

227 tests pass, including 8 new DMK-specific tests covering:
- `_tag`-based error detection (`DeviceSessionNotFound`, `ConnectionOpeningError`, etc.)
- Message-based error detection (`session not found`, `device action ended without completion`)
- Priority of `name` over `_tag` when both are present
