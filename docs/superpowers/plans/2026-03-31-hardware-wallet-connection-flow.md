# Hardware Wallet Connection Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the hardware wallet connection flow to be wallet-type-agnostic using an error component registry, and replace `LedgerSelectAccount` with a new `AccountSelection` screen.

**Architecture:** Error component registry resolves `(walletType, errorCode)` → error component with three-layer fallback (wallet-specific → shared → generic). Connection flow reads wallet type from route params. New `AccountSelection` screen wraps the existing `AccountSelectionFlow` UI component with wallet-type-aware data logic.

**Tech Stack:** React Native, TypeScript, `@metamask/hw-wallet-sdk`, `@metamask/design-system-react-native`, React Navigation

**Spec:** `docs/superpowers/specs/2026-03-31-hardware-wallet-connection-flow-design.md`

---

## File Structure

### Files to create

| File                                                                             | Responsibility                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `app/components/Views/hardware-wallet/errors/registry.ts`                        | Error component registry — `resolveErrorComponent(walletType, errorCode)` |
| `app/components/Views/hardware-wallet/errors/shared/TransportError.tsx`          | Shared BLE/permission transport errors                                    |
| `app/components/Views/hardware-wallet/errors/shared/DeviceNotFoundError.tsx`     | Shared device not found error                                             |
| `app/components/Views/hardware-wallet/errors/shared/DeviceUnresponsiveError.tsx` | Shared timeout/unresponsive error                                         |
| `app/components/Views/hardware-wallet/errors/shared/GenericError.tsx`            | Fallback for unknown errors                                               |
| `app/components/Views/hardware-wallet/errors/shared/index.ts`                    | Barrel export for shared errors                                           |
| `app/components/Views/hardware-wallet/errors/ledger/index.ts`                    | Barrel export for Ledger errors                                           |
| `app/components/Views/hardware-wallet/AccountSelection.tsx`                      | New screen wrapping `AccountSelectionFlow`                                |

### Files to modify

| File                                                                               | Change                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `app/components/Views/hardware-wallet/errors/LedgerErrorState.tsx`                 | Rename to `ErrorState.tsx`, generic props                     |
| `app/components/Views/hardware-wallet/errors/index.ts`                             | Update exports for new structure                              |
| `app/components/Views/hardware-wallet/errors/LedgerAppClosedError.tsx`             | Accept `ErrorComponentProps`                                  |
| `app/components/Views/hardware-wallet/errors/LedgerBlindSigningDisabledError.tsx`  | Accept `ErrorComponentProps`                                  |
| `app/components/Views/hardware-wallet/errors/LedgerGenericError.tsx`               | Accept `ErrorComponentProps`                                  |
| `app/components/Views/hardware-wallet/errors/LedgerDeviceUnresponsiveError.tsx`    | Accept `ErrorComponentProps`                                  |
| `app/components/Views/hardware-wallet/errors/connection/LedgerConnectionError.tsx` | Accept `ErrorComponentProps`                                  |
| `app/components/Views/hardware-wallet/index.tsx`                                   | Wallet type from route params, registry-based error rendering |
| `app/components/Views/hardware-wallet/hardwareWallet.testIds.ts`                   | Add new test IDs                                              |
| `app/components/Views/hardware-wallet/components/LookingForDeviceState.tsx`        | Accept illustration prop                                      |
| `app/components/Views/hardware-wallet/components/DeviceNotFoundState.tsx`          | Accept illustration prop                                      |
| `app/components/Views/hardware-wallet/components/index.ts`                         | Export new components                                         |
| `app/constants/navigation/Routes.ts`                                               | Add `ACCOUNT_SELECTION` route                                 |
| `app/components/Views/LedgerSelectAccount/index.test.tsx`                          | Migrate to cover `AccountSelection`                           |

### Files to keep (no changes)

- `app/core/HardwareWallet/HardwareWalletProvider.tsx`
- `app/core/HardwareWallet/contexts/HardwareWalletContext.tsx`
- `app/core/HardwareWallet/adapters/` — adapter interface unchanged
- `app/core/HardwareWallet/errors/mappings.ts` — SDK error mappings unchanged
- `app/components/Views/hardware-wallet/components/AccountSelectionFlow.tsx` — UI component unchanged

---

## Task 1: Rename LedgerErrorState to ErrorState

**Goal:** Make the base error layout component wallet-type-agnostic.

**Files:**

- Rename: `app/components/Views/hardware-wallet/errors/LedgerErrorState.tsx` → `ErrorState.tsx`
- Modify: `app/components/Views/hardware-wallet/errors/index.ts`
- Modify: all files importing `LedgerErrorState`

- [ ] **Step 1: Rename the file**

```bash
git mv app/components/Views/hardware-wallet/errors/LedgerErrorState.tsx app/components/Views/hardware-wallet/errors/ErrorState.tsx
```

- [ ] **Step 2: Update the component name inside the file**

In `ErrorState.tsx`, rename the type `LedgerErrorAction` to `ErrorAction` and `LedgerErrorStateProps` to `ErrorStateProps`. Rename the component function from `LedgerErrorState` to `ErrorState`. Export `ErrorState` as default.

- [ ] **Step 3: Update `errors/index.ts` export**

Replace `LedgerErrorState` export with `ErrorState` export. Keep `LedgerErrorState` as a re-export alias for backward compatibility during migration:

```ts
export { default as ErrorState } from './ErrorState';
/** @deprecated Use ErrorState */
export { default as LedgerErrorState } from './ErrorState';
```

- [ ] **Step 4: Update all imports of `LedgerErrorState`**

Files that import `LedgerErrorState`:

- `app/components/Views/hardware-wallet/errors/LedgerAppClosedError.tsx`
- `app/components/Views/hardware-wallet/errors/LedgerBlindSigningDisabledError.tsx`
- `app/components/Views/hardware-wallet/errors/LedgerGenericError.tsx`
- `app/components/Views/hardware-wallet/errors/LedgerDeviceUnresponsiveError.tsx`

Update each import to use `ErrorState` instead of `LedgerErrorState`. Update the JSX usage from `<LedgerErrorState .../>` to `<ErrorState .../>`.

- [ ] **Step 5: Verify no remaining references to `LedgerErrorState`**

Run: `grep -r "LedgerErrorState" app/components/Views/hardware-wallet/`
Expected: Only the `@deprecated` alias in `errors/index.ts`

- [ ] **Step 6: Run existing tests**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add app/components/Views/hardware-wallet/errors/
git commit -m "refactor: rename LedgerErrorState to ErrorState"
```

---

## Task 2: Define ErrorComponentProps type and registry

**Goal:** Create the standardized error props type and the registry resolver function.

**Files:**

- Create: `app/components/Views/hardware-wallet/errors/types.ts`
- Create: `app/components/Views/hardware-wallet/errors/registry.ts`
- Create: `app/components/Views/hardware-wallet/errors/registry.test.ts`

- [ ] **Step 1: Create `errors/types.ts` with standardized props**

```ts
import type { ComponentType } from 'react';
import type { ErrorCode, HardwareWalletError } from '@metamask/hw-wallet-sdk';

export type ErrorComponentProps = {
  errorCode: ErrorCode;
  error?: HardwareWalletError;
  isBusy: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onExit: () => void;
  onOpenSettings: () => void;
  onOpenBluetoothSettings: () => void;
};

export type ErrorRenderer = ComponentType<ErrorComponentProps>;

export type ErrorRendererMap = Partial<Record<ErrorCode, ErrorRenderer>>;
```

- [ ] **Step 2: Write the failing test for registry**

In `errors/registry.test.ts`:

```ts
import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { resolveErrorComponent } from './registry';
import type { ErrorRenderer } from './types';

// Mock components for testing
const MockWalletSpecific: ErrorRenderer = (() =>
  null) as unknown as ErrorRenderer;
const MockShared: ErrorRenderer = (() => null) as unknown as ErrorRenderer;
const MockGeneric: ErrorRenderer = (() => null) as unknown as ErrorRenderer;

describe('resolveErrorComponent', () => {
  it('returns wallet-specific component when registered for that wallet type', () => {
    // Wallet-specific error should take priority
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.DeviceStateEthAppClosed,
    );
    expect(result).toBeDefined();
  });

  it('returns shared transport component for BLE permission errors', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.PermissionBluetoothDenied,
    );
    expect(result).toBeDefined();
  });

  it('returns shared DeviceNotFoundError for DeviceNotFound code', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.DeviceNotFound,
    );
    expect(result).toBeDefined();
  });

  it('returns DeviceNotFoundError when errorCode is undefined', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      undefined as unknown as ErrorCode,
    );
    expect(result).toBeDefined();
  });

  it('returns GenericError for Unknown error code', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.Unknown,
    );
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest app/components/Views/hardware-wallet/errors/registry.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 4: Create `errors/registry.ts`**

```ts
import type { ComponentType } from 'react';
import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { ErrorComponentProps, ErrorRendererMap } from './types';

// Wallet-specific error maps (imported in Step later when components exist)
// For now, use empty maps — will be populated in Tasks 3-5
const WALLET_ERROR_MAPS: Partial<Record<HardwareWalletType, ErrorRendererMap>> =
  {};

// Shared error map (populated in Task 3)
let SHARED_ERROR_MAP: ErrorRendererMap = {};

// Generic fallback (set in Task 3)
let GENERIC_FALLBACK: ComponentType<ErrorComponentProps> | null = null;

export function registerSharedErrors(
  map: ErrorRendererMap,
  fallback: ComponentType<ErrorComponentProps>,
): void {
  SHARED_ERROR_MAP = map;
  GENERIC_FALLBACK = fallback;
}

export function registerWalletErrors(
  walletType: HardwareWalletType,
  map: ErrorRendererMap,
): void {
  WALLET_ERROR_MAPS[walletType] = map;
}

export function resolveErrorComponent(
  walletType: HardwareWalletType | null,
  errorCode: ErrorCode | undefined,
): ComponentType<ErrorComponentProps> {
  // 1. Wallet-specific
  if (walletType && errorCode) {
    const walletMap = WALLET_ERROR_MAPS[walletType];
    if (walletMap && walletMap[errorCode]) {
      return walletMap[errorCode]!;
    }
  }

  // 2. Shared
  if (errorCode && SHARED_ERROR_MAP[errorCode]) {
    return SHARED_ERROR_MAP[errorCode]!;
  }

  // 3. DeviceNotFound for undefined error code
  if (errorCode === undefined && SHARED_ERROR_MAP[ErrorCode.DeviceNotFound]) {
    return SHARED_ERROR_MAP[ErrorCode.DeviceNotFound]!;
  }

  // 4. Generic fallback
  if (GENERIC_FALLBACK) {
    return GENERIC_FALLBACK;
  }

  throw new Error(
    `No error component registered for walletType=${walletType} errorCode=${errorCode}`,
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest app/components/Views/hardware-wallet/errors/registry.test.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/components/Views/hardware-wallet/errors/types.ts app/components/Views/hardware-wallet/errors/registry.ts app/components/Views/hardware-wallet/errors/registry.test.ts
git commit -m "feat: add error component registry with resolver"
```

---

## Task 3: Create shared error components

**Goal:** Build the shared error components for transport, device not found, device unresponsive, and generic fallback.

**Files:**

- Create: `app/components/Views/hardware-wallet/errors/shared/TransportError.tsx`
- Create: `app/components/Views/hardware-wallet/errors/shared/DeviceNotFoundError.tsx`
- Create: `app/components/Views/hardware-wallet/errors/shared/DeviceUnresponsiveError.tsx`
- Create: `app/components/Views/hardware-wallet/errors/shared/GenericError.tsx`
- Create: `app/components/Views/hardware-wallet/errors/shared/index.ts`

- [ ] **Step 1: Create `TransportError.tsx`**

This replaces the Ledger-specific `LedgerConnectionError` for BLE/permission errors. Uses the same `ConnectionErrorIllustration` and `ConnectionErrorState` from `connection/` but with standardized props.

```tsx
import React from 'react';
import { ErrorCode } from '@metamask/hw-wallet-sdk';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { ErrorComponentProps } from '../types';

// Transport error handles: BLE denied, location denied, nearby devices denied,
// bluetooth disabled, bluetooth connection failed
// It uses ConnectionErrorIllustration and ConnectionErrorState from connection/
// For the initial implementation, delegate to existing LedgerConnectionError
// which already handles all these cases. Will be refactored to be wallet-type-aware
// when a second BLE wallet type is added.
import LedgerConnectionError from '../connection/LedgerConnectionError';

const TransportError = (props: ErrorComponentProps) => {
  const {
    errorCode,
    isBusy,
    onRetry,
    onExit,
    onOpenSettings,
    onOpenBluetoothSettings,
  } = props;
  return (
    <LedgerConnectionError
      errorCode={
        errorCode as Parameters<typeof LedgerConnectionError>[0]['errorCode']
      }
      onRetry={onRetry}
      onContinue={onExit}
      onOpenSettings={onOpenSettings}
      onOpenBluetoothSettings={onOpenBluetoothSettings}
    />
  );
};

export default TransportError;
```

Note: Initially delegates to `LedgerConnectionError`. When a second BLE wallet is added, the illustration and strings will be made wallet-type-aware here.

- [ ] **Step 2: Create `DeviceNotFoundError.tsx`**

```tsx
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { ErrorComponentProps } from '../types';
import DeviceNotFoundState from '../../components/DeviceNotFoundState';

const DeviceNotFoundError = ({ onRetry }: ErrorComponentProps) => {
  return <DeviceNotFoundState onRetry={onRetry} />;
};

export default DeviceNotFoundError;
```

- [ ] **Step 3: Create `DeviceUnresponsiveError.tsx`**

```tsx
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { ErrorComponentProps } from '../types';
import LedgerDeviceUnresponsiveError from '../LedgerDeviceUnresponsiveError';

const DeviceUnresponsiveError = ({ isBusy, onRetry }: ErrorComponentProps) => {
  return <LedgerDeviceUnresponsiveError isBusy={isBusy} onRetry={onRetry} />;
};

export default DeviceUnresponsiveError;
```

Note: Initially delegates to `LedgerDeviceUnresponsiveError`. Illustration will be made wallet-type-aware when a second wallet type is added.

- [ ] **Step 4: Create `GenericError.tsx`**

```tsx
import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { ErrorComponentProps } from '../types';
import HardwareWalletTestIds from '../../hardwareWallet.testIds';
import ErrorState from '../ErrorState';

const GenericError = ({ error, onRetry, onExit }: ErrorComponentProps) => {
  const description =
    error?.userMessage ??
    strings('hardware_wallet.errors.unknown_error', {
      device: strings('hardware_wallet.device_names.ledger'),
    });

  return (
    <ErrorState
      testID={HardwareWalletTestIds.ERROR_GENERIC}
      title={strings('hardware_wallet.error.something_went_wrong')}
      description={description}
      primaryAction={{
        label: strings('hardware_wallet.error.retry'),
        onPress: onRetry,
        testID: HardwareWalletTestIds.RETRY_BUTTON,
        variant: ButtonVariant.Primary,
      }}
      secondaryAction={{
        label: strings('hardware_wallet.common.continue'),
        onPress: onExit,
        testID: HardwareWalletTestIds.CONTINUE_BUTTON,
        variant: ButtonVariant.Secondary,
      }}
    />
  );
};

export default GenericError;
```

- [ ] **Step 5: Create `shared/index.ts` barrel export**

```ts
export { default as TransportError } from './TransportError';
export { default as DeviceNotFoundError } from './DeviceNotFoundError';
export { default as DeviceUnresponsiveError } from './DeviceUnresponsiveError';
export { default as GenericError } from './GenericError';
```

- [ ] **Step 6: Register shared errors in registry**

Update `registry.ts` to import and register shared errors:

```ts
import {
  TransportError,
  DeviceNotFoundError,
  DeviceUnresponsiveError,
  GenericError,
} from './shared';
import { ErrorCode } from '@metamask/hw-wallet-sdk';

const INITIAL_SHARED_MAP: ErrorRendererMap = {
  [ErrorCode.PermissionBluetoothDenied]: TransportError,
  [ErrorCode.PermissionLocationDenied]: TransportError,
  [ErrorCode.PermissionNearbyDevicesDenied]: TransportError,
  [ErrorCode.BluetoothDisabled]: TransportError,
  [ErrorCode.BluetoothConnectionFailed]: TransportError,
  [ErrorCode.DeviceNotFound]: DeviceNotFoundError,
  [ErrorCode.DeviceUnresponsive]: DeviceUnresponsiveError,
  [ErrorCode.ConnectionTimeout]: DeviceUnresponsiveError,
};

registerSharedErrors(INITIAL_SHARED_MAP, GenericError);
```

- [ ] **Step 7: Run tests**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/components/Views/hardware-wallet/errors/shared/ app/components/Views/hardware-wallet/errors/registry.ts
git commit -m "feat: add shared error components and register in registry"
```

---

## Task 4: Update Ledger-specific error components to accept ErrorComponentProps

**Goal:** Make existing Ledger error components accept the standardized props interface.

**Files:**

- Modify: `app/components/Views/hardware-wallet/errors/LedgerAppClosedError.tsx`
- Modify: `app/components/Views/hardware-wallet/errors/LedgerBlindSigningDisabledError.tsx`

- [ ] **Step 1: Update `LedgerAppClosedError.tsx`**

Change the props type to accept `ErrorComponentProps`. The component only uses `onContinue`.

```tsx
import type { ErrorComponentProps } from './types';

const LedgerAppClosedError = ({ onContinue }: ErrorComponentProps) => {
  // existing rendering logic unchanged
};
```

- [ ] **Step 2: Update `LedgerBlindSigningDisabledError.tsx`**

Same pattern — accept `ErrorComponentProps`, use `onContinue`.

- [ ] **Step 3: Create `errors/ledger/index.ts` and register Ledger errors**

```ts
import { ErrorCode } from '@metamask/hw-wallet-sdk';
import { registerWalletErrors } from '../registry';
import LedgerAppClosedError from './LedgerAppClosedError';
import LedgerBlindSigningDisabledError from './LedgerBlindSigningDisabledError';
import type { ErrorRendererMap } from '../types';

const LEDGER_ERROR_MAP: ErrorRendererMap = {
  [ErrorCode.DeviceStateEthAppClosed]: LedgerAppClosedError,
  [ErrorCode.DeviceMissingCapability]: LedgerAppClosedError,
  [ErrorCode.DeviceStateBlindSignNotSupported]: LedgerBlindSigningDisabledError,
};

// Auto-register when imported
registerWalletErrors(HardwareWalletType.Ledger, LEDGER_ERROR_MAP);

export { LedgerAppClosedError, LedgerBlindSigningDisabledError };
```

- [ ] **Step 4: Update `errors/index.ts` to import the ledger registration**

Add: `import './ledger';` — this triggers the auto-registration side effect.

- [ ] **Step 5: Run tests**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/components/Views/hardware-wallet/errors/
git commit -m "refactor: update Ledger errors to accept ErrorComponentProps and register in registry"
```

---

## Task 5: Refactor connection flow `index.tsx`

**Goal:** Replace hardcoded Ledger references and error switch with wallet-type-agnostic flow + registry.

**Files:**

- Modify: `app/components/Views/hardware-wallet/index.tsx`
- Modify: `app/components/Views/hardware-wallet/index.test.tsx`

- [ ] **Step 1: Read current `index.tsx` and understand the exact changes needed**

Key changes:

1. Get `walletType` from route params instead of hardcoding `HardwareWalletType.Ledger`
2. Replace `renderErrorState()` switch with `resolveErrorComponent(walletType, errorCode)`
3. Replace `Routes.HW.LEDGER_CONNECT` with `Routes.HW.ACCOUNT_SELECTION` (or wallet-type-aware route)
4. Handle `AwaitingApp` state as part of the state machine

- [ ] **Step 2: Update wallet type initialization**

Replace:

```ts
setTargetWalletType(HardwareWalletType.Ledger);
```

With:

```ts
const walletType = (route.params?.walletType ??
  HardwareWalletType.Ledger) as HardwareWalletType;
setTargetWalletType(walletType);
```

Add route param type at the top of the file or in a shared navigation types file.

- [ ] **Step 3: Replace `renderErrorState()` with registry call**

Replace the entire `renderErrorState()` function with:

```ts
const ErrorComponent = resolveErrorComponent(walletType, errorCode);
```

And in the JSX, replace `{renderErrorState()}` with:

```tsx
{isErrorState ? (
  <ErrorComponent
    errorCode={errorCode ?? ErrorCode.Unknown}
    error={connectionError}
    isBusy={isBusy}
    onRetry={handleRetry}
    onContinue={handleContinue}
    onExit={handleExitErrorFlow}
    onOpenSettings={handleOpenSettings}
    onOpenBluetoothSettings={handleOpenBluetoothSettings}
  />
) : /* ... existing non-error states ... */}
```

- [ ] **Step 4: Update success navigation**

Replace `Routes.HW.LEDGER_CONNECT` with the new account selection route.

- [ ] **Step 5: Update the test file**

In `index.test.tsx`:

- Update navigation mock to include `walletType` route param
- Update error rendering tests to verify the registry-resolved component renders
- Remove tests that check for specific Ledger error component names, replace with generic error state assertions

- [ ] **Step 6: Run tests**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/components/Views/hardware-wallet/index.tsx app/components/Views/hardware-wallet/index.test.tsx
git commit -m "refactor: use error registry and route params in connection flow"
```

---

## Task 6: Create AccountSelection screen

**Goal:** New screen wrapping `AccountSelectionFlow` with Ledger data logic. Replaces `LedgerSelectAccount`.

**Files:**

- Create: `app/components/Views/hardware-wallet/AccountSelection.tsx`
- Modify: `app/constants/navigation/Routes.ts`
- Modify: Navigation registration (find where `Routes.HW.LEDGER_CONNECT` is registered)

- [ ] **Step 1: Add route to `Routes.ts`**

In `Routes.HW`, add:

```ts
ACCOUNT_SELECTION: 'HardwareAccountSelection',
```

- [ ] **Step 2: Create `AccountSelection.tsx`**

Port business logic from `LedgerSelectAccount/index.tsx`:

- Account fetching (`getLedgerAccountsByOperation`)
- Account unlocking (`unlockLedgerWalletAccount`)
- HD path management (`getHDPath`, `setHDPath`)
- Forget device (`forgetLedger`)
- Analytics events (use `walletType` from route params instead of hardcoded `HardwareDeviceTypes.LEDGER`)
- Render `AccountSelectionFlow` with computed props

The screen reads `walletType` from route params. For now, all business logic is Ledger-specific (matching current behavior). When a new wallet type is added, dispatch based on `walletType`.

Reference the existing `LedgerSelectAccount/index.tsx` closely — the logic is the same, just parameterized by wallet type and using `AccountSelectionFlow` instead of custom UI.

- [ ] **Step 3: Register the route in navigation config**

Find where `Routes.HW.LEDGER_CONNECT` -> `LedgerSelectAccount` is registered in `App.tsx` (or the navigation config file). Add:

```ts
<Stack.Screen
  name={Routes.HW.ACCOUNT_SELECTION}
  component={AccountSelection}
/>
```

- [ ] **Step 4: Update connection flow to navigate to new route**

In `index.tsx`, ensure success navigation goes to `Routes.HW.ACCOUNT_SELECTION` with `walletType` param.

- [ ] **Step 5: Migrate tests from `LedgerSelectAccount`**

Port test scenarios from `app/components/Views/LedgerSelectAccount/index.test.tsx` to `app/components/Views/hardware-wallet/AccountSelection.test.tsx`. Key scenarios:

- Renders account list
- Toggles account selection
- Unlock selected accounts
- Forget device
- Pagination (prev/next)
- Error handling during fetch

- [ ] **Step 6: Run tests**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/components/Views/hardware-wallet/AccountSelection.tsx app/constants/navigation/Routes.ts
git commit -m "feat: add AccountSelection screen replacing LedgerSelectAccount"
```

---

## Task 7: Make illustration components wallet-type-aware

**Goal:** `LookingForDeviceState` and `DeviceNotFoundState` accept illustration prop instead of importing Ledger illustration directly.

**Files:**

- Modify: `app/components/Views/hardware-wallet/components/LookingForDeviceState.tsx`
- Modify: `app/components/Views/hardware-wallet/components/DeviceNotFoundState.tsx`
- Modify: `app/components/Views/hardware-wallet/components/LedgerDeviceIllustration.tsx` (no rename, just reference)

- [ ] **Step 1: Update `LookingForDeviceState.tsx`**

Add optional `illustration` prop. Default to `LedgerDeviceIllustration` when not provided:

```tsx
type Props = {
  illustration?: ReactNode;
  // existing props...
};

const LookingForDeviceState = ({ illustration, ...rest }: Props) => {
  return (
    // ...existing layout...
    {illustration ?? <LedgerDeviceIllustration />}
    // ...
  );
};
```

- [ ] **Step 2: Update `DeviceNotFoundState.tsx`**

Same pattern — accept `illustration` prop, default to Ledger.

- [ ] **Step 3: Update `index.tsx` to pass wallet-type-aware illustration**

In the connection flow, look up the illustration for the current wallet type:

```ts
const illustration = getWalletIllustration(walletType);
// Pass to <LookingForDeviceState illustration={illustration} />
```

For now, `getWalletIllustration` returns `LedgerDeviceIllustration` for Ledger. Adding a new type means adding to this map.

- [ ] **Step 4: Run tests**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/Views/hardware-wallet/components/ app/components/Views/hardware-wallet/index.tsx
git commit -m "refactor: make device state illustrations wallet-type-aware"
```

---

## Task 8: Final integration test and cleanup

**Goal:** Verify the full flow works end-to-end, clean up deprecated files.

**Files:**

- Verify: full `hardware-wallet/` test suite
- Verify: navigation works end-to-end
- Optional: deprecate `LedgerSelectAccount/` (mark as unused, don't delete yet)

- [ ] **Step 1: Run full test suite for hardware wallet views**

Run: `npx jest app/components/Views/hardware-wallet/ --no-coverage`
Expected: All tests pass

- [ ] **Step 2: Run the existing LedgerSelectAccount tests to confirm they still pass (they should since we haven't removed it yet)**

Run: `npx jest app/components/Views/LedgerSelectAccount/ --no-coverage`
Expected: PASS (old screen is still there, just not navigated to)

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "hardware-wallet"`
Expected: No errors related to hardware-wallet files

- [ ] **Step 4: Update `errors/index.ts` to clean up deprecated aliases**

Remove the `@deprecated` aliases added in Task 1 if all consumers are updated.

- [ ] **Step 5: Commit**

```bash
git add app/components/Views/hardware-wallet/
git commit -m "chore: cleanup deprecated aliases and verify integration"
```

---

## Summary

| Task | Description                           | Key Files                               |
| ---- | ------------------------------------- | --------------------------------------- |
| 1    | Rename LedgerErrorState → ErrorState  | `errors/ErrorState.tsx`                 |
| 2    | Create ErrorComponentProps + registry | `errors/types.ts`, `errors/registry.ts` |
| 3    | Create shared error components        | `errors/shared/*.tsx`                   |
| 4    | Update Ledger errors + register       | `errors/ledger/index.ts`                |
| 5    | Refactor connection flow              | `index.tsx`                             |
| 6    | Create AccountSelection screen        | `AccountSelection.tsx`, `Routes.ts`     |
| 7    | Wallet-type-aware illustrations       | `components/*State.tsx`                 |
| 8    | Integration test + cleanup            | All                                     |
