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
           │ feature flag check
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
┌──────────────────────────┐
│  React hooks             │
│  useWalletCompliance     │
│  useComplianceGate       │
└──────────┬───────────────┘
           │
           ▼
    Consumer Flows
    (Send, Swap, Bridge, Perps, etc.)
```

## Feature Flag

Compliance is gated behind the `complianceEnabled` remote feature flag. When the flag is `false` (the default):

- The `ComplianceController` is still instantiated (so its state slot exists in Redux), but `init()` is not called -- no API requests are made.
- `useComplianceGate` returns `isBlocked: false` regardless of cached data.

To enable compliance:

1. Set `complianceEnabled: true` in LaunchDarkly (or via the local feature flag override screen in dev builds).
2. The controller will fetch the blocked wallets list on next app launch.

### Feature flag selector

```typescript
import { selectComplianceEnabled } from 'app/selectors/featureFlagController/compliance';

const isEnabled = useSelector(selectComplianceEnabled);
```

## Usage in Flows

### Option 1: `useComplianceGate` hook (recommended for flow guards)

This is the simplest way to gate a flow. It combines the feature flag check with the blocked status:

```tsx
import { useComplianceGate } from 'app/components/UI/Compliance/hooks/useWalletCompliance';

function SendConfirmation({ recipientAddress }: { recipientAddress: string }) {
  const { isComplianceEnabled, isBlocked } =
    useComplianceGate(recipientAddress);

  if (isComplianceEnabled && isBlocked) {
    return <BlockedWalletWarning />;
  }

  return <ConfirmSendUI />;
}
```

### Option 2: `useWalletCompliance` hook (for detailed control)

Use this when you need the imperative `checkCompliance` function for on-demand API checks:

```tsx
import { useWalletCompliance } from 'app/components/UI/Compliance/hooks/useWalletCompliance';

function AddressInput({ address }: { address: string }) {
  const { isBlocked, checkCompliance } = useWalletCompliance(address);

  const handleSubmit = async () => {
    // Force a fresh API check
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

### Option 3: Redux selectors (for non-component code)

```typescript
import { selectIsWalletBlocked } from 'app/selectors/complianceController';
import { store } from 'app/store';

const isBlocked = selectIsWalletBlocked('0x1234...')(store.getState());
```

### Option 4: Direct Engine access (for controller-to-controller or middleware code)

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

// For useComplianceGate:
mockUseSelector
  .mockReturnValueOnce(true) // selectComplianceEnabled
  .mockReturnValueOnce(true); // selectIsWalletBlocked
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

| File                                                                       | Purpose                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `app/constants/featureFlags.ts`                                            | `complianceEnabled` flag definition                 |
| `app/core/Engine/controllers/compliance/compliance-service-init.ts`        | Service initialization                              |
| `app/core/Engine/controllers/compliance/compliance-controller-init.ts`     | Controller initialization with feature flag gating  |
| `app/core/Engine/messengers/compliance/compliance-service-messenger.ts`    | Service messenger setup                             |
| `app/core/Engine/messengers/compliance/compliance-controller-messenger.ts` | Controller + init messenger setup                   |
| `app/selectors/complianceController.ts`                                    | Redux selectors                                     |
| `app/selectors/featureFlagController/compliance.ts`                        | Feature flag selector                               |
| `app/components/UI/Compliance/hooks/useWalletCompliance.ts`                | `useWalletCompliance` and `useComplianceGate` hooks |
| `app/components/UI/Compliance/AccessRestrictedModal/`                      | Access-restricted modal component                   |
| `app/components/UI/Compliance/contexts/AccessRestrictedContext.tsx`        | Provider and `useAccessRestrictedModal` hook        |
| `app/__mocks__/@metamask/compliance-controller.ts`                         | Manual mock for tests                               |
