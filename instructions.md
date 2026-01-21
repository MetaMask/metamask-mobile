# Hardware Wallet Error Handling - Mobile Implementation Guide

This document describes how to port the hardware wallet error handling system from MetaMask Extension (PR #39038 - https://github.com/MetaMask/metamask-extension/pull/39038) to MetaMask Mobile.

---

## Architecture Overview

Build a **React Context-based system** for managing hardware wallet connections with:

1. **Structured error handling** - Parse raw device errors into user-friendly messages
2. **Connection state machine** - Track device state through connection lifecycle
3. **Auto-reconnection** - Detect device plug/unplug events
4. **Device verification** - Ensure device is ready before signing operations

---

## Core Components to Create

### 1. Types (`types.ts`)

```typescript
export enum HardwareWalletType {
  Ledger = 'ledger',
  Trezor = 'trezor',
  // Add others as needed
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Ready = 'ready',
  AwaitingConfirmation = 'awaiting_confirmation',
  AwaitingApp = 'awaiting_app',
  ErrorState = 'error',
}

export type HardwareWalletConnectionState =
  | { status: ConnectionStatus.Disconnected }
  | { status: ConnectionStatus.Connecting }
  | { status: ConnectionStatus.Connected }
  | { status: ConnectionStatus.Ready }
  | { status: ConnectionStatus.AwaitingConfirmation }
  | { status: ConnectionStatus.AwaitingApp; reason: string; appName?: string }
  | { status: ConnectionStatus.ErrorState; reason: string; error: Error };
```

### 2. Error System (`errors/`)

**Error Codes** - Define specific error codes:

```typescript
export enum ErrorCode {
  // Device State
  DEVICE_STATE_001 = 'DEVICE_STATE_001', // Device locked
  DEVICE_STATE_002 = 'DEVICE_STATE_002', // Device disconnected
  DEVICE_STATE_003 = 'DEVICE_STATE_003', // Device not found

  // App State (Ledger-specific)
  APP_STATE_001 = 'APP_STATE_001', // Wrong app open
  APP_STATE_002 = 'APP_STATE_002', // App not open
  APP_STATE_003 = 'APP_STATE_003', // Blind signing disabled

  // Connection
  CONN_CLOSED_001 = 'CONN_CLOSED_001', // Connection closed
  CONN_TIMEOUT_001 = 'CONN_TIMEOUT_001', // Connection timeout

  // User Actions
  USER_CANCEL_001 = 'USER_CANCEL_001', // User rejected

  // Permission
  PERM_DENIED_001 = 'PERM_DENIED_001', // Permission denied
  PERM_WEBHID_001 = 'PERM_WEBHID_001', // WebHID not available
}
```

**Error Class:**

```typescript
export class HardwareWalletError extends Error {
  code: ErrorCode;
  severity: 'warning' | 'error' | 'critical';
  category: 'device' | 'app' | 'connection' | 'user' | 'permission';
  retryStrategy: 'none' | 'immediate' | 'reconnect' | 'user_action';
  userActionable: boolean;
  userMessage: string;

  constructor(message: string, options: HardwareWalletErrorOptions) {
    super(message);
    Object.assign(this, options);
  }
}
```

**Error Parser** - Map raw Ledger errors to structured errors:

```typescript
// Key Ledger status codes to handle:
// 0x6b0c - Device locked
// 0x6511 - Wrong app / app not open
// 0x6985 - User rejected / Blind signing disabled
// 0x6a15 - Wrong app open
// 0x5515 - Locked device (alternate)

export function parseErrorByType(
  error: unknown,
  walletType: HardwareWalletType,
): HardwareWalletError {
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = extractStatusCode(error);

  // Match patterns and return appropriate HardwareWalletError
  if (
    statusCode === 0x6b0c ||
    statusCode === 0x5515 ||
    message.includes('locked')
  ) {
    return createHardwareWalletError(
      ErrorCode.DEVICE_STATE_001,
      walletType,
      'Device is locked',
    );
  }
  // ... more mappings
}
```

### 3. Connection State Helper (`connectionState.ts`)

```typescript
export const ConnectionState = {
  disconnected: () => ({ status: ConnectionStatus.Disconnected }),
  connecting: () => ({ status: ConnectionStatus.Connecting }),
  connected: () => ({ status: ConnectionStatus.Connected }),
  ready: () => ({ status: ConnectionStatus.Ready }),
  awaitingConfirmation: () => ({
    status: ConnectionStatus.AwaitingConfirmation,
  }),
  awaitingApp: (reason: string, appName?: string) => ({
    status: ConnectionStatus.AwaitingApp,
    reason,
    appName,
  }),
  error: (reason: string, error: Error) => ({
    status: ConnectionStatus.ErrorState,
    reason,
    error,
  }),
};

// Map HardwareWalletError to ConnectionState
export function getConnectionStateFromError(
  error: HardwareWalletError,
): HardwareWalletConnectionState {
  switch (error.code) {
    case ErrorCode.DEVICE_STATE_001: // Locked
      return ConnectionState.error('locked', error);
    case ErrorCode.APP_STATE_001:
    case ErrorCode.APP_STATE_002:
      return ConnectionState.awaitingApp('not_open', 'Ethereum');
    case ErrorCode.USER_CANCEL_001:
      return ConnectionState.error('user_rejected', error);
    default:
      return ConnectionState.error('connection_failed', error);
  }
}
```

### 4. Main Context Provider

**State to track:**

- `connectionState: HardwareWalletConnectionState`
- `walletType: HardwareWalletType | null`
- `deviceId: string | null`
- `isHardwareWalletAccount: boolean`
- `currentAppName: string | null`

**Key methods to expose:**

- `connect()` - Initiate connection
- `disconnect()` - Clean disconnect
- `clearError()` - Reset error state
- `ensureDeviceReady(deviceId?)` - **Critical** - Verify device is ready before signing

**ensureDeviceReady flow:**

1. Connect if not connected
2. Call `getAppNameAndVersion()` to check Ledger app
3. Return `true` if Ethereum app is open, else set error state and return `false`

### 5. Adapter Pattern (Optional but Recommended)

Create wallet-specific adapters:

```typescript
interface HardwareWalletAdapter {
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  destroy(): void;
  verifyDeviceReady?(deviceId: string): Promise<boolean>;
}
```

**LedgerAdapter** implementation calls:

- `attemptLedgerTransportCreation()` for connect
- `getAppNameAndVersion()` for verification

---

## Backend Changes Required

### 1. Expose `getAppNameAndVersion()` method

In the controller that manages Ledger keyring:

```typescript
async getAppNameAndVersion(): Promise<{ appName: string; version: string }> {
  return await this.withKeyringForDevice(
    { name: 'ledger' },
    async (keyring) => await keyring.getAppNameAndVersion()
  );
}
```

This requires `@metamask/eth-ledger-bridge-keyring` to expose this method (may need package update).

### 2. Update Error Handling in Bridge

In Ledger bridge/offscreen code, use `handleLedgerTransportError` from `@metamask/eth-ledger-bridge-keyring` to convert raw errors to `LedgerHardwareWalletError`.

---

## Integration Points

### 1. Transaction Confirmation Screen

Before submitting transaction:

```typescript
const { isHardwareWalletAccount, deviceId } = useHardwareWalletConfig();
const { ensureDeviceReady } = useHardwareWalletActions();

const onSubmit = async () => {
  if (isHardwareWalletAccount) {
    const isReady = await ensureDeviceReady(deviceId);
    if (!isReady) {
      // Error modal will be shown automatically by ErrorMonitor
      return;
    }
  }
  // Proceed with transaction
};
```

### 2. Show "Connect Device" Button When Disconnected

```tsx
{
  isHardwareWalletAccount && !isDeviceReady ? (
    <Button onPress={onSubmit}>Connect {walletType} device</Button>
  ) : (
    <ConfirmButton onSubmit={onSubmit} />
  );
}
```

### 3. Error Monitor Component

Create a component that listens to `connectionState` and shows modal on error:

```tsx
const HardwareWalletErrorMonitor = () => {
  const { connectionState, walletType, clearError } = useHardwareWallet();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (connectionState.status === ConnectionStatus.ErrorState) {
      setModalVisible(true);
    }
  }, [connectionState]);

  // Render modal with error details and recovery steps
};
```

---

## Localization Keys Needed

Add these key categories:

- `hardwareWalletErrorTitle*` - Error modal titles
- `hardwareWalletErrorDescription*` - Error descriptions
- `hardwareWalletErrorRecovery*` - Recovery step instructions
- `hardwareWalletConnectionRecovery*Steps` - Connection recovery checklist
- `hardwareWalletTransactionPending*` - Awaiting device confirmation
- `connectHardwareDevice` - "Connect $1" with device name placeholder

---

## Key Differences for Mobile

1. **No WebHID/WebUSB** - Mobile uses Bluetooth (Ledger) or different transport
2. **Permission handling** - Use mobile's Bluetooth permission system
3. **Device discovery** - Adapt to mobile's Bluetooth scanning
4. **Background state** - Handle app backgrounding gracefully

---

## Testing Checklist

- [ ] Device locked → Shows unlock prompt
- [ ] Wrong app open → Shows "Open Ethereum app" message
- [ ] User rejects on device → Shows rejection message with retry
- [ ] Device disconnected mid-operation → Shows reconnect prompt
- [ ] Blind signing disabled → Shows enable instruction
- [ ] Connection timeout → Shows retry option
- [ ] Successful connection → Proceeds to ready state

---

## Package Dependencies

May need preview/updated versions of:

- `@metamask/eth-ledger-bridge-keyring` (needs `getAppNameAndVersion`, `handleLedgerTransportError`)
- `@metamask/keyring-utils` (needs `HardwareWalletError` class)

Check if mobile already has `@metamask/keyring-utils` - it provides the base `HardwareWalletError` class and error handling utilities.
