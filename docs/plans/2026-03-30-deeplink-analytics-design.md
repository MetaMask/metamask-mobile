# Deeplink Protocol Analytics — Design

## Problem

The wallet-side analytics events (`wallet_connection_request_received`, `wallet_action_received`, etc.) only fire for the socket relay path. The deeplink protocol path (`comm=deeplinking`) produces zero wallet-side events. Additionally, `DEEP_LINK_USED` never fires for SDK deeplinks (`CONNECT`, `MMSDK`, `ANDROID_SDK`) because `handleUniversalLink.ts` early-exits before reaching analytics code.

## Design

### Part A: Fire DEEP_LINK_USED for SDK deeplinks

Uses the existing MetaMetrics `AnalyticsEventBuilder` / `createDeepLinkUsedEventBuilder` pattern.

| #   | File                         | Change                                                                                                                                                                                                        |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `deepLink.types.ts`          | Add `ACTIONS.CONNECT`, `ACTIONS.MMSDK`, `ACTIONS.ANDROID_SDK` to `SUPPORTED_ACTIONS`                                                                                                                          |
| 2   | `deepLinkAnalytics.types.ts` | Add `SDK_CONNECT` and `SDK_MMSDK` to `DeepLinkRoute` enum                                                                                                                                                     |
| 3   | `deepLinkAnalytics.ts`       | Add cases in `mapSupportedActionToRoute`: `CONNECT` → `SDK_CONNECT`, `MMSDK` → `SDK_MMSDK`, `ANDROID_SDK` → `SDK_CONNECT`                                                                                     |
| 4   | `handleUniversalLink.ts`     | Before the early-exit return (~line 220), fire `DEEP_LINK_USED` via `createDeepLinkUsedEventBuilder`. Set `interstitial: 'not shown'`. Reuse already-fetched branch params, signature status, and UTM params. |

### Part B: Wallet-side events for deeplink protocol path

Uses `analytics.track()` from `@metamask/sdk-analytics` — same system as the existing socket-relay wallet events, so events land in the same table and are directly comparable.

Events fire at the **service layer** (`DeeplinkProtocolService`), not in `handleMetaMaskDeeplink.ts`, to avoid double-fires and because the service has full context (new vs reconnect, parsed RPC method, stored `originatorInfo`).

| #   | File / Method                                     | Event                                | Properties                                                                                                  | Guard         |
| --- | ------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------- |
| 5   | `DeeplinkProtocolService.handleConnection()`      | `wallet_connection_request_received` | `anon_id`, `transport: 'deeplink_protocol'`, `connection_type: 'new_session' \| 'reconnect'`, `sdk_version` | `if (anonId)` |
| 6   | `DeeplinkProtocolService.processDappRpcRequest()` | `wallet_action_received`             | `anon_id`, `transport: 'deeplink_protocol'`, `rpc_method`                                                   | `if (anonId)` |
| 7   | `DeeplinkProtocolService.handleMessage()`         | `wallet_action_received`             | `anon_id`, `transport: 'deeplink_protocol'`, `rpc_method`                                                   | `if (anonId)` |

### Key decisions

- **Reuse existing event names** with a new `transport` property rather than inventing new names. Existing socket-relay events implicitly have `transport: undefined` (or could be backfilled to `'socket'`).
- **`anon_id`** comes from `originatorInfo.anonId`, which is base64-decoded from the deeplink URL on connect and stored in `this.connections[channelId].originatorInfo`. Available in all three service methods.
- **No PII**: `rpc_method` only (e.g. `eth_sendTransaction`), never RPC params or addresses.
- **`connection_type`** distinguishes new sessions from reconnects using the existing `isSessionExists` check in `handleConnection()`.

### Files touched

- `app/core/DeeplinkManager/types/deepLink.types.ts`
- `app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.types.ts`
- `app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts`
- `app/core/DeeplinkManager/handlers/handleUniversalLink.ts`
- `app/core/SDKConnect/SDKDeeplinkProtocol/DeeplinkProtocolService.ts`
