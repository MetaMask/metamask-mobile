# Hardware Wallet Module

Centralized error handling for hardware wallet operations (Ledger, QR) in MetaMask Mobile.

## Features

- **Structured Error Handling**: Uses `@metamask/hw-wallet-sdk` for error codes with Mobile-specific extensions
- **Localized Messages**: User-friendly error messages with i18n support
- **Bottom Sheet UI**: Consistent error presentation via `HardwareWalletErrorBottomSheet`
- **Error Context**: Simple React context for error state management

## Quick Start

### Using the Error Context

```typescript
import {
  useHardwareWalletError,
  HardwareWalletType,
} from '@core/HardwareWallet';

function MyComponent() {
  const { parseAndShowError, clearError } = useHardwareWalletError();

  const handleOperation = async () => {
    try {
      await performLedgerOperation();
    } catch (error) {
      // Parses error and shows bottom sheet automatically
      parseAndShowError(error, HardwareWalletType.Ledger);
    }
  };
}
```

### Manual Error Parsing

```typescript
import {
  parseErrorByType,
  HardwareWalletType,
  isUserCancellation,
} from '@core/HardwareWallet';

try {
  await connectToLedger();
} catch (error) {
  const hwError = parseErrorByType(error, HardwareWalletType.Ledger);

  console.log(hwError.code); // ErrorCode enum value
  console.log(hwError.category); // e.g., Category.DeviceState
  console.log(hwError.userMessage); // Localized user-friendly message

  if (!isUserCancellation(hwError)) {
    // Show error UI (user didn't cancel)
  }
}
```

## Module Structure

```
app/core/HardwareWallet/
├── index.ts                           # Public exports
├── types.ts                           # Type definitions
├── HardwareWalletErrorContext.tsx     # React context for error state
├── README.md
├── errors/
│   ├── index.ts                       # Error module exports
│   ├── HardwareWalletError.ts         # Re-exports from @metamask/hw-wallet-sdk
│   ├── errorDefinitions.ts            # Mobile-specific error extensions (icons, localized messages)
│   └── errorParser.ts                 # Error parsing utilities
├── components/
│   ├── index.ts
│   └── HardwareWalletErrorBottomSheet/
│       ├── index.ts
│       └── HardwareWalletErrorBottomSheet.tsx
└── docs/
    └── SWAPS_INTEGRATION.md           # Swaps flow integration guide
```

## Key Exports

### From `@core/HardwareWallet`

| Export                        | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `HardwareWalletErrorProvider` | Wrap app to enable error context                        |
| `useHardwareWalletError`      | Hook for `parseAndShowError`, `showError`, `clearError` |
| `parseErrorByType`            | Parse any error into `HardwareWalletError`              |
| `createHardwareWalletError`   | Create error from `ErrorCode`                           |
| `ErrorCode`                   | SDK error code enum                                     |
| `HardwareWalletError`         | Error class with structured info                        |
| `isUserCancellation`          | Check if user cancelled                                 |
| `RecoveryAction`              | Enum for recovery button actions                        |
| `getIconForErrorCode`         | Get icon for error code                                 |

## Integration Points

### Key Files Using This Module

- `Root/index.tsx` - Wraps app with `HardwareWalletErrorProvider`
- `LedgerConfirmationModal.tsx` - Uses context for transaction signing errors
- `LedgerMessageSignModal.tsx` - Uses context for message signing errors
- `LedgerConnect/index.tsx` - Uses context for connection errors
- `LedgerSelectAccount/index.tsx` - Uses context for account selection errors

## Error Flow

1. **Error Occurs**: Ledger operation throws an error
2. **Parse**: `parseErrorByType()` converts to `HardwareWalletError`
3. **Show**: Context's `showError()` sets state and opens bottom sheet
4. **Display**: `HardwareWalletErrorBottomSheet` shows localized message with icon
5. **Action**: User taps Retry or Dismiss
6. **Clear**: `clearError()` clears state and closes sheet
