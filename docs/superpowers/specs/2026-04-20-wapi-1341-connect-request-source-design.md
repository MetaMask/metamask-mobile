# WAPI-1341 — Add `request_source` to Connect events

## Goal

Emit `request_source` on `Connect Request Started`, `Connect Request Completed`, and `Connect Request Cancelled` using the **same values** that sig/tx events already emit, so the dapp funnel joins natively on `request_source` in Mixpanel. Keep the existing `source` property untouched for historical continuity.

## Background

Today, connect events carry a `source` property (via `useOriginSource`), and sig/tx events carry a `request_source` property (via `AppConstants.REQUEST_SOURCES`). The two properties represent the same concept (connection transport) but have different names and different value vocabularies. This prevents clean joins across the connect → signature → transaction funnel.

The parent ticket (WAPI-1398) calls for `request_source` to become the canonical cross-funnel field. The WAPI-1341 ticket as written specified a new lowercase/hyphenated value vocabulary (`in-app-browser`, `walletconnect`, etc.) for the connect side, but that would still not match the existing sig/tx values — the join would still require downstream normalization. After PM clarification, the chosen approach is to emit the existing sig/tx values on connect events so joins work natively.

## Values emitted

`request_source` values (from `AppConstants.REQUEST_SOURCES`):

| Transport | `source` (unchanged) | `request_source` (new) |
|---|---|---|
| SDK v1 | `sdk` | `MetaMask-SDK-Remote-Conn` |
| MM Connect / MWP | `mm_connect` | `MetaMask-Connect` |
| WalletConnect | `walletconnect` | `WalletConnect` |
| In-app browser | `in-app browser` | `In-App-Browser` |

Note: `AppConstants.REQUEST_SOURCES` also defines `WC2: 'WalletConnectV2'`. We do not emit this — the sig/tx `getSource()` in `RPCMethodMiddleware.ts` returns `WC` (not `WC2`) for WalletConnect today, so aligning on `WalletConnect` preserves the native join.

## Changes

### 1. `app/components/hooks/useOriginSource.ts`

Extend the return type:

- **Before:** `SourceType | undefined`
- **After:** `{ source: SourceType; requestSource: RequestSource } | undefined`

`undefined` is returned only when `origin` is falsy (matches current semantics). When an origin resolves, both values are always present.

Internal implementation:

- Detection logic (SDK v2 → SDK v1 → WalletConnect → in-app browser) is **unchanged**.
- Add a 4-entry `SOURCE_TO_REQUEST_SOURCE` map inside the module:
  - `SourceType.SDK` → `AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN`
  - `SourceType.MM_CONNECT` → `AppConstants.REQUEST_SOURCES.MM_CONNECT`
  - `SourceType.WALLET_CONNECT` → `AppConstants.REQUEST_SOURCES.WC`
  - `SourceType.IN_APP_BROWSER` → `AppConstants.REQUEST_SOURCES.IN_APP_BROWSER`
- Export a `RequestSource` type derived from the four mapped values.

### 2. Call sites

Three components consume `useOriginSource` for connect-event analytics:

- `app/components/Approvals/PermissionApproval/PermissionApproval.tsx` — fires `CONNECT_REQUEST_STARTED`
- `app/components/Views/AccountConnect/AccountConnect.tsx` — fires `CONNECT_REQUEST_COMPLETED` and `CONNECT_REQUEST_CANCELLED`
- `app/components/Views/MultichainAccounts/MultichainAccountConnect/MultichainAccountConnect.tsx` — fires `CONNECT_REQUEST_COMPLETED` and `CONNECT_REQUEST_CANCELLED`

Each site updates the destructuring from:

```ts
const eventSource = useOriginSource({ origin });
// ...
.addProperties({ source: eventSource, ... })
```

to:

```ts
const originSource = useOriginSource({ origin });
// ...
.addProperties({
  source: originSource?.source,
  request_source: originSource?.requestSource,
  ...
})
```

### 3. Tests

- **`useOriginSource.test.ts`** — update assertions to the new return shape; add a case per branch proving `requestSource` is the correct `REQUEST_SOURCES` value.
- **`PermissionApproval.test.tsx`** — assert `request_source` appears in emitted event properties.
- **`AccountConnect.test.tsx`** — assert `request_source` appears on both COMPLETED and CANCELLED.
- **`MultichainAccountConnect.test.tsx`** — assert `request_source` appears on both COMPLETED and CANCELLED.

### 4. Segment schema

No changes required. `request_source` is already declared as free-form `string` (no enum) on `connect-request-started.yaml`, `connect-request-completed.yaml`, and `connect-request-cancelled.yaml` in the segment-schema repo. Mention this in the PR description.

## Out of scope

- **`app/components/UI/AccountApproval/index.js`** (legacy class-component WalletConnect approval path). Also fires the three connect events but doesn't currently add `source`. Per PM: this ticket is scoped to SDK/mm-connect events only.
- **`CONNECT_REQUEST_OTPFAILURE`** — not listed in the ticket.
- **Migrating sig/tx `request_source` casing.** Out of scope; the existing values are the target.

## Testing strategy

- **Unit:** `useOriginSource.test.ts` covers all four detection branches × both output fields.
- **Component:** the three call-site tests verify `request_source` is present in emitted analytics params.
- **Manual smoke:** connect a dapp via each transport and confirm `Connect Request Completed` in Mixpanel carries both `source` (existing value) and `request_source` (new value matching the sig/tx value for the same transport):
  - In-app browser → `source: 'in-app browser'`, `request_source: 'In-App-Browser'`
  - WalletConnect → `source: 'walletconnect'`, `request_source: 'WalletConnect'`
  - SDK v1 → `source: 'sdk'`, `request_source: 'MetaMask-SDK-Remote-Conn'`
  - MM Connect / MWP → `source: 'mm_connect'`, `request_source: 'MetaMask-Connect'`
