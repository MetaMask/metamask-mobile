# Braze Analytics Integration

## Overview

MetaMask Mobile integrates with Braze via a custom Segment destination plugin that:

- Uses MetaMask `profileId` for user identification (not Segment's `deviceId`)
- Filters events and traits via an allowlist loaded from remote feature flags
- Operates in device-mode (direct Braze SDK calls) while still allowing cloud-mode destinations

## Architecture

```
Segment Event Pipeline
  ↓
MetaMetricsPrivacySegmentPlugin (enrichment)
  ↓
BrazePlugin (destination, device-mode)
  ├─ Allowlist check (event name / trait key)
  ├─ profileId guard (no-op if undefined)
  └─ Braze SDK calls (Braze.logCustomEvent, Braze.setCustomUserAttribute)
  ↓
Segment Cloud (for cloud-mode destinations & Destination Filters)
```

## Files

| File                           | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `BrazePlugin.ts`               | Segment destination plugin with allowlist filtering                  |
| `BrazePlugin.test.ts`          | Unit tests (18 tests)                                                |
| `braze-allowed-events.json`    | Default allowlists (hardcoded fallback)                              |
| `app/core/Braze/index.ts`      | Public API (`setBrazeUser`, `clearBrazeUser`, `syncBrazeAllowlists`) |
| `analytics-controller-init.ts` | Wires up remote config sync on init + flag updates                   |

## Remote Configuration

### Backend Setup

Add a new feature flag to the `client-config` API (`https://client-config.api.cx.metamask.io`) with key **`brazeAllowedConfig`**:

```json
{
  "allowedEvents": [
    "Wallet Opened",
    "Swap Completed",
    "On-ramp Purchase Completed"
  ],
  "allowedTraits": [
    "has_marketing_consent",
    "has_rewards_opted_in",
    "authentication_type"
  ]
}
```

### How It Works

1. **Initial load**: `BrazePlugin` starts with allowlists from `braze-allowed-events.json`
2. **First sync**: `syncBrazeAllowlists()` called after `AnalyticsController.init()` via `initMessenger.call('RemoteFeatureFlagController:getState')`
3. **Periodic updates**: Subscribed to `RemoteFeatureFlagController:stateChange` (fires every 15 minutes in production, 1 second in dev)
4. **Graceful fallback**: If flag is missing or malformed, local defaults remain in effect

### Updating Allowlists at Runtime

From backend (via remote feature flags):

```json
// POST to client-config API to update brazeAllowedConfig
{
  "allowedEvents": ["New Event"],
  "allowedTraits": ["new_trait"]
}
```

For testing/debugging:

```typescript
import { getBrazePlugin } from 'app/core/Braze';

getBrazePlugin().setAllowedEvents(['Event A', 'Event B']);
getBrazePlugin().setAllowedTraits(['trait_x', 'trait_y']);
```

## Event Flow

### Track Events (filtered)

```typescript
analytics.track('Swap Completed', { amount: 100 });
  ↓
BrazePlugin.track()
  ↓ Check: is "Swap Completed" in allowedEvents?
  ↓ YES → Braze.logCustomEvent('Swap Completed', { amount: 100 })
  ↓ NO  → silently dropped
  ↓ ALWAYS → return event (continues to Segment cloud)
```

### Identify Traits (filtered)

```typescript
analytics.identify({ has_marketing_consent: true, random_trait: 'x' });
  ↓
BrazePlugin.identify()
  ↓ For each trait:
    ├─ "has_marketing_consent" in allowedTraits? YES → Braze.setCustomUserAttribute(...)
    └─ "random_trait" in allowedTraits? NO → skip
  ↓ ALWAYS → return event (continues to Segment cloud)
```

### Flush / Screen Events (not filtered)

- **`identify()`** — all traits in the allowlist are forwarded
- **`flush()`** — always calls `Braze.requestImmediateDataFlush()` when `profileId` is set
- **`screen()`** — not forwarded to Braze (passes through unchanged)

## User Identity Management

Handled via `useBrazeIdentity` hook in `app/core/Braze/`:

- **On sign-in**: `setBrazeUser()` → reads `profileId` from `AuthenticationController` → `Braze.changeUser(profileId)`
- **On sign-out**: `clearBrazeUser()` → `Braze.changeUser(undefined)` → plugin becomes no-op

## Testing

Run tests:

```bash
yarn jest app/core/Engine/controllers/analytics-controller/BrazePlugin.test.ts
yarn jest app/core/Braze/index.test.ts
```

## Adding Events to the Allowlist

1. **Temporary (for testing)**: Add to `braze-allowed-events.json` in the codebase
2. **Production**: Update the `brazeAllowedConfig` feature flag on the backend
3. **Event names must match exactly** — use values from `app/core/Analytics/MetaMetrics.events.ts`

### Example Event Names

From `MetaMetrics.events.ts`:

- `"App Opened"`
- `"Wallet Opened"`
- `"Swap Completed"`
- `"Dapp Transaction Completed"`
- `"Token Added"`

### Example Trait Names

From `UserProfileProperty` enum:

- `"has_marketing_consent"`
- `"has_rewards_opted_in"`
- `"authentication_type"`
- `"theme"`
- `"primary_currency"`
- `"chain_id_list"`
