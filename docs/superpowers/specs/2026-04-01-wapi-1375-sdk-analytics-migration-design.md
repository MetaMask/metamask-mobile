# WAPI-1375: Remove @metamask/sdk-analytics and migrate SDKv1 events to MetaMetrics

## Problem

The mobile app imports `@metamask/sdk-analytics` to fire wallet-side SDKv1 events. This bypasses the MetaMetrics opt-in/opt-out pipeline:

- `Analytics.enable()` is called unconditionally in `SDKConnect.init()` with no MetaMetrics preference check
- The `Analytics` class has no `disable()` method
- None of the 6 `track()` call sites check opt-in — events fire regardless of user consent
- Events are sent to a separate SDK analytics API (`mm-sdk-analytics.api.cx.metamask.io`), not through MetaMetrics
- Additionally, `SendAnalytics` from `@metamask/sdk-communication-layer` POSTs to `socketServerUrl/evt` — a third separate pipe, also with no consent check

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event naming | Property-based (keep existing names + add properties) | More flexible for future v2/MWP unification; aligns with MetaMetrics patterns. May rename to MetaMetrics style later pending upstream spec change. |
| `SendAnalytics` calls | Remove, port useful properties to MetaMetrics events | Redundant with the `analytics.track()` replacements; richer data folded into MetaMetrics events |
| RPC method gating | Keep, inline the 11-method list locally | Dropping gating would change semantics and inflate volume — out of scope |
| `transport_type` value | Provisional (`socket_relay`) — may change | Flagged as subject to revision |

## Event Definitions

Add 6 events to `MetaMetrics.events.ts`, keeping existing snake_case names:

### Connection events

| Event | Properties | Sensitive Properties |
|-------|-----------|---------------------|
| `wallet_connection_request_received` | `transport_type`, `sdk_version` | `anon_id` |
| `wallet_connection_user_approved` | `transport_type`, `sdk_version` | `anon_id` |
| `wallet_connection_user_rejected` | `transport_type`, `sdk_version` | `anon_id` |

### Action events

| Event | Properties | Sensitive Properties |
|-------|-----------|---------------------|
| `wallet_action_received` | `transport_type`, `sdk_version`, `rpc_method`, `wallet_version` | `anon_id` |
| `wallet_action_user_approved` | `transport_type`, `sdk_version`, `rpc_method`, `wallet_version` | `anon_id` |
| `wallet_action_user_rejected` | `transport_type`, `sdk_version`, `rpc_method`, `wallet_version` | `anon_id` |

`anon_id` goes in `sensitiveProperties` (anonymized by the privacy Segment plugin). All other properties go in regular `properties`.

Action events are gated by the tracked RPC method list (same 11 methods as today).

## Migration by file

### `SDKConnect.ts`
- Remove `analytics.setGlobalProperty('platform', 'mobile')` and `analytics.enable()` from `init()`
- Remove `import { analytics } from '@metamask/sdk-analytics'`

### `connectToChannel.ts`
- Replace 3 `analytics.track()` calls with `AnalyticsEventBuilder` + `analytics.trackEvent()` from MetaMetrics
- Remove `SendAnalytics(TrackingEvents.REJECTED, ...)` call
- Remove imports: `analytics` from `@metamask/sdk-analytics`, `SendAnalytics`/`TrackingEvents` from `@metamask/sdk-communication-layer`

### `handleConnectionMessage.ts`
- Replace `analytics.track('wallet_action_received', ...)` with MetaMetrics equivalent
- Port `rpc_method`, `sdk_version`, `wallet_version` from the removed `SendAnalytics` call as event properties
- Inline the RPC method gating list locally (import from shared constant), replacing both `isAnalyticsTrackedRpcMethod` and `lcLogguedRPCs`
- Remove imports: `analytics` from `@metamask/sdk-analytics`, `SendAnalytics`/`TrackingEvents`/`isAnalyticsTrackedRpcMethod` from `@metamask/sdk-communication-layer`

### `handleSendMessage.ts`
- Replace both `analytics.track()` calls with MetaMetrics equivalents
- Use the same shared RPC method gating list, replacing `isAnalyticsTrackedRpcMethod`
- Remove import: `analytics` from `@metamask/sdk-analytics`, `isAnalyticsTrackedRpcMethod` from `@metamask/sdk-communication-layer`

### Shared constant
- Define `ANALYTICS_TRACKED_RPC_METHODS` in `SDKConnectConstants.ts` with the 11 methods:
  `eth_sendTransaction`, `eth_signTransaction`, `personal_sign`, `eth_signTypedData`, `eth_signTypedData_v3`, `eth_signTypedData_v4`, `wallet_requestPermissions`, `wallet_switchEthereumChain`, `metamask_connectSign`, `metamask_connectWith`, `metamask_batch`
- Consumed by `handleConnectionMessage.ts` and `handleSendMessage.ts`

## Test updates

3 test files need updating:
- `connectToChannel.test.ts` — remove `@metamask/sdk-analytics` mock, add MetaMetrics mock/assertions
- `handleConnectionMessage.test.ts` — remove `@metamask/sdk-analytics` and `SendAnalytics` mocks, add MetaMetrics mock/assertions
- `handleSendMessage.test.ts` — remove `@metamask/sdk-analytics` mock, add MetaMetrics mock/assertions

## Cleanup

- Remove `@metamask/sdk-analytics` from `package.json`
- Run `yarn` to update lockfile
- `@metamask/sdk-communication-layer` stays — only analytics-specific imports removed (`SendAnalytics`, `TrackingEvents`, `isAnalyticsTrackedRpcMethod`)

## Out of scope

- Renaming events to MetaMetrics title-case style — pending upstream spec decision
- Changing RPC method gating behavior — same 11 methods as before
- Removing `@metamask/sdk-communication-layer` — only dropping analytics imports
- Adding new events beyond the existing 6
- SDKv2/MWP wallet-side analytics
