# OFAC Compliance

MetaMask Mobile integrates the `@metamask/compliance-controller` package to enforce OFAC sanctions screening on wallet addresses. This document explains the architecture, feature flag setup, and how to use compliance checks in any flow.

## Architecture

The compliance system is composed of two Engine-level modules:

- **`ComplianceService`** -- Stateless HTTP client that communicates with the Compliance API (`compliance.api.cx.metamask.io` in production, `compliance.dev-api.cx.metamask.io` in development).
- **`ComplianceController`** -- Stateful controller that caches the blocked wallets list and per-address compliance results. It persists its state across app restarts.

```
┌──────────────────────────┐
│  RemoteFeatureFlagCtrl   │
│  (complianceEnabled)     │
└──────────┬───────────────┘
           │ feature flag check (actions only)
           ▼
┌──────────────────────────┐     messenger     ┌──────────────────────────┐
│  ComplianceController    │ ───────────────►  │   ComplianceService      │
│  (state + cache)         │                   │   (HTTP client)          │
└──────────┬───────────────┘                   └──────────────────────────┘
           │ state sync via Redux
           ▼
┌──────────────────────────┐
│  Redux selectors         │
│  selectIsWalletBlocked   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  React hooks                             │
│  useWalletCompliance  (base layer)       │
│  useComplianceGate    (gate() wrapper)   │
└──────────┬───────────────────────────────┘
           │
           ▼
    Consumer Flows
    (Send, Swap, Bridge, Perps, etc.)
```

## Feature Flag

Compliance is gated behind the `complianceEnabled` remote feature flag. When the flag is `false` (the default):

- The `ComplianceController` is still instantiated (so its state slot exists in Redux), but `init()` is not called -- no API requests are made.
- `useComplianceGate` returns `isBlocked: false` and `gate()` skips the compliance check, executing the action directly.

To enable compliance:

1. Set `complianceEnabled: true` in LaunchDarkly (or via the local feature flag override screen in dev builds).
2. The controller will fetch the blocked wallets list on next app launch.

> **Version gating:** The feature flag uses `validatedVersionGatedFeatureFlag`, which compares against the **native binary version** reported by `react-native-device-info`'s `getVersion()` — not `package.json`. If your device has a stale build installed, the version check may fail even if the flag is enabled. Do a clean native rebuild to pick up the correct version.

### Feature flag selector

```typescript
import { selectComplianceEnabled } from 'app/selectors/featureFlagController/compliance';

const isEnabled = useSelector(selectComplianceEnabled);
```

## Usage in Flows

### Option 1: `gate()` from `useComplianceGate` (recommended for action guards)

`gate(action)` is the primary pattern for gating any user-initiated action. It:

1. Skips the check entirely if compliance is disabled (fast path).
2. Calls `checkCompliance()` and reads the **API return value** directly (avoids stale Redux closure).
3. If blocked: shows `AccessRestrictedModal` automatically and returns `undefined`.
4. If not blocked: executes `action` and returns its result.

```tsx
import { useComplianceGate } from 'app/components/UI/Compliance';
import { selectSelectedInternalAccountAddress } from 'app/selectors/accountsController';

function MyFlow() {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { gate } = useComplianceGate(selectedAddress ?? '');

  const handleDeposit = useCallback(
    () =>
      gate(async () => {
        // compliance is guaranteed to have passed here
        await performDeposit();
      }),
    [gate],
  );

  return <Button onPress={handleDeposit} label="Deposit" />;
}
```

Existing geo-eligibility or other guards belong **inside** the `gate` callback -- the compliance check runs first, then your existing logic:

```tsx
const handleTrade = useCallback(
  () =>
    gate(async () => {
      if (!isGeoEligible) {
        showGeoBlockModal();
        return;
      }
      navigateToOrder();
    }),
  [gate, isGeoEligible],
);
```

### Option 2: `useComplianceGate` — reactive `isBlocked` (for conditional UI)

Use `isBlocked` directly when you need to conditionally render UI rather than gate an action:

```tsx
import { useComplianceGate } from 'app/components/UI/Compliance';

function SendConfirmation({ recipientAddress }: { recipientAddress: string }) {
  const { isBlocked } = useComplianceGate(recipientAddress);

  if (isBlocked) {
    return <BlockedWalletWarning />;
  }

  return <ConfirmSendUI />;
}
```

### Option 3: `useWalletCompliance` (base layer, detailed control)

Use this when you need the raw `checkCompliance` function without the feature flag guard or modal integration:

```tsx
import { useWalletCompliance } from 'app/components/UI/Compliance';

function AddressInput({ address }: { address: string }) {
  const { isBlocked, checkCompliance } = useWalletCompliance(address);

  const handleSubmit = async () => {
    const result = await checkCompliance();
    if (result.blocked) {
      // handle blocked
    }
  };

  return (
    <>
      {isBlocked && <WarningBanner />}
      <SubmitButton onPress={handleSubmit} />
    </>
  );
}
```

### Option 4: Redux selectors (for non-component code)

```typescript
import { selectIsWalletBlocked } from 'app/selectors/complianceController';
import { store } from 'app/store';

const isBlocked = selectIsWalletBlocked('0x1234...')(store.getState());
```

### Option 5: Direct Engine access (for controller-to-controller or middleware code)

```typescript
import Engine from 'app/core/Engine';

// Check a single wallet
const status =
  await Engine.context.ComplianceController.checkWalletCompliance('0x1234...');

// Check multiple wallets
const statuses =
  await Engine.context.ComplianceController.checkWalletsCompliance([
    '0xaaaa...',
    '0xbbbb...',
  ]);

// Force refresh the blocklist
await Engine.context.ComplianceController.updateBlockedWallets();
```

## How the Blocklist Works

1. On app launch (when compliance is enabled), `ComplianceController.init()` fetches the full blocked wallets list from the API if the cached list is stale (older than 1 hour by default).
2. The list is persisted to Redux state at `engine.backgroundState.ComplianceController.blockedWallets`.
3. `selectIsWalletBlocked(address)` performs a **synchronous** lookup against this cached list -- no API call at check time.
4. If the address is not in the cached blocklist, the selector falls back to the `walletComplianceStatusMap` which stores results from on-demand `checkWalletCompliance()` calls.
5. `gate()` reads `isBlocked` from the cached Redux state after awaiting any in-flight prefetch. A background `useEffect` in `useComplianceGate` fires `checkCompliance()` on mount and on address change, storing the promise in a ref. If the user taps a button before the prefetch resolves, `gate()` joins that single in-flight request (no duplicate calls). Once the prefetch has settled, `gate()` resolves instantly. Prefetch errors are swallowed silently; if the cache is empty, `isBlocked` defaults to `false` (fail-open).

## State Shape

```typescript
type ComplianceControllerState = {
  // Cached results from on-demand per-address checks
  walletComplianceStatusMap: Record<
    string,
    {
      address: string;
      blocked: boolean;
      checkedAt: string; // ISO-8601
    }
  >;

  // Full blocked wallets list from the API (null if not fetched)
  blockedWallets: {
    addresses: string[];
    sources: { ofac: number; remote: number };
    lastUpdated: string;
    fetchedAt: string;
  } | null;

  // Timestamp of last blocklist fetch (ms since epoch)
  blockedWalletsLastFetched: number;

  // ISO-8601 timestamp of last compliance check
  lastCheckedAt: string | null;
};
```

## Testing

### Mocking compliance state in unit tests

The package has a manual mock at `app/__mocks__/@metamask/compliance-controller.ts` that provides the full public API surface.

To test components that use compliance hooks:

```typescript
import { useSelector } from 'react-redux';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// For useComplianceGate (isBlocked + gate):
mockUseSelector
  .mockReturnValueOnce(true) // selectComplianceEnabled
  .mockReturnValueOnce(true); // selectIsWalletBlocked
```

To test `gate()` behaviour, also mock `AccessRestrictedContext` and the Engine:

```typescript
const mockShowAccessRestrictedModal = jest.fn();

jest.mock(
  'app/components/UI/Compliance/contexts/AccessRestrictedContext',
  () => ({
    useAccessRestrictedModal: () => ({
      showAccessRestrictedModal: mockShowAccessRestrictedModal,
      hideAccessRestrictedModal: jest.fn(),
      isAccessRestricted: false,
    }),
  }),
);

jest.mock('app/core/Engine', () => ({
  context: {
    ComplianceController: {
      checkWalletCompliance: jest.fn().mockResolvedValue({ blocked: true }),
    },
  },
}));
```

### Mocking in fixture-based tests

Add compliance state to your test fixture:

```typescript
new FixtureBuilder()
  .withComplianceController({
    walletComplianceStatusMap: {},
    blockedWallets: {
      addresses: ['0xBLOCKED'],
      sources: { ofac: 1, remote: 0 },
      lastUpdated: '2025-01-01T00:00:00Z',
      fetchedAt: '2025-01-01T00:00:00Z',
    },
    blockedWalletsLastFetched: Date.now(),
    lastCheckedAt: new Date().toISOString(),
  })
  .build();
```

## File Reference

### Core infrastructure

| File                                                                       | Purpose                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `app/constants/featureFlags.ts`                                            | `complianceEnabled` flag definition                     |
| `app/core/Engine/controllers/compliance/compliance-service-init.ts`        | Service initialization                                  |
| `app/core/Engine/controllers/compliance/compliance-controller-init.ts`     | Controller initialization (feature flag gates `init()`) |
| `app/core/Engine/messengers/compliance/compliance-service-messenger.ts`    | Service messenger setup                                 |
| `app/core/Engine/messengers/compliance/compliance-controller-messenger.ts` | Controller + init messenger setup                       |
| `app/selectors/complianceController.ts`                                    | Redux selectors                                         |
| `app/selectors/featureFlagController/compliance.ts`                        | Feature flag selector                                   |
| `app/__mocks__/@metamask/compliance-controller.ts`                         | Manual mock for tests                                   |

### Hooks and UI

| File                                                                | Purpose                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `app/components/UI/Compliance/hooks/useWalletCompliance.ts`         | `useWalletCompliance`, `useComplianceGate` (with `gate()`) |
| `app/components/UI/Compliance/AccessRestrictedModal/`               | Access-restricted modal component                          |
| `app/components/UI/Compliance/contexts/AccessRestrictedContext.tsx` | Provider and `useAccessRestrictedModal` hook               |
| `app/components/UI/Compliance/index.ts`                             | Public exports                                             |

### Consumer flows

| File                                                                              | Gated actions                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/components/UI/Perps/hooks/usePerpsHomeActions.ts`                            | `handleAddFunds`                                                                                                                                                         |
| `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx` | `handleTradeAction`, `handleClosePosition`, `handleModifyPress`, `handleAutoClosePress`, `handleMarginPress`, `handleAddMarginFromBanner`, `handleSetStopLossFromBanner` |
| `app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx`         | `handleLongPress`, `handleShortPress`, `handleClosePosition`, `handleModifyPress`                                                                                        |
| `app/components/UI/Perps/components/PerpsOpenOrderCard/PerpsOpenOrderCard.tsx`    | `handleCancelPress`                                                                                                                                                      |
| `app/components/UI/TokenDetails/components/AssetOverviewContent.tsx`              | `handleLongPress`, `handleShortPress`                                                                                                                                    |
