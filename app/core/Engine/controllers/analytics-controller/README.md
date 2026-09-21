# Braze Analytics Integration

## Overview

MetaMask Mobile integrates with Braze via a custom Segment destination plugin that:

- Uses MetaMask `profileId` for user identification (not Segment's `deviceId`)
- Operates in device-mode (direct Braze SDK calls) while still allowing cloud-mode destinations

## Architecture

```
Segment Event Pipeline
  ↓
MetaMetricsPrivacySegmentPlugin (enrichment)
  ↓
BrazePlugin (destination, device-mode)
  ├─ profileId guard (no-op if undefined)
  └─ Braze SDK calls (Braze.logCustomEvent, Braze.setCustomUserAttribute)
  ↓
Segment Cloud (for cloud-mode destinations & Destination Filters)
```

## Files

| File                           | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `BrazePlugin.ts`               | Segment destination plugin                    |
| `BrazePlugin.test.ts`          | Unit tests                                    |
| `app/core/Braze/index.ts`      | Public API (`setBrazeUser`, `clearBrazeUser`) |
| `analytics-controller-init.ts` | Wires up plugin on init                       |

## Event Flow

### Track Events

```typescript
analytics.track('Swap Completed', { amount: 100 });
  ↓
BrazePlugin.track()
  ↓ profileId set? YES → Braze.logCustomEvent('Swap Completed', { amount: 100 })
  ↓ NO  → no-op
  ↓ ALWAYS → return event (continues to Segment cloud)
```

### Identify Traits

```typescript
analytics.identify({ has_marketing_consent: true });
  ↓
BrazePlugin.identify()
  ↓ profileId set? YES → Braze.setCustomUserAttribute(...)
  ↓ NO  → no-op
  ↓ ALWAYS → return event (continues to Segment cloud)
```

### Flush / Screen Events

- **`flush()`** — no-op. Braze batches `/data` uploads on its own interval; calling `requestImmediateDataFlush()` here raced Segment's 20-event / 30s policies and burned SDK request tokens. Banner dismiss still flushes explicitly.
- **`screen()`** — not forwarded to Braze (passes through unchanged)

## User Identity Management

Handled via `useBrazeIdentity` hook in `app/core/Braze/`:

- **On sign-in**: `setBrazeUser()` → reads `canonicalProfileId` from `AuthenticationController.state.srpSessionData` → `Braze.changeUser(canonicalProfileId)` only when the ID is new on this plugin instance. Native Braze already no-ops a same-ID `changeUser` after a cold start. A new identity refreshes banners; repeating the same identity only registers placement IDs once per process. Repeat identifies skip `changeUser` and only send traits whose values changed.
- **On sign-out**: `clearBrazeUser()` → clears plugin identity + `Braze.wipeData()` → plugin becomes a no-op. The banner placement registry is cleared so the next identified user can fetch campaigns.

## Testing

Run tests:

```bash
yarn jest app/core/Engine/controllers/analytics-controller/BrazePlugin.test.ts
yarn jest app/core/Braze/index.test.ts
```
