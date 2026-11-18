# Advanced UI order observations

Development builds expose `globalThis.__AGENTIC__.readPerpsUiObservations()` through the existing agent bridge.

- It returns detached JSON-compatible copies.
- Reading does not call a controller, initialize a signer, request venue data, or submit, cancel or close orders.
- The bridge exposes no observation writer.
- Release builds do not install the bridge, and the reader returns an empty disabled snapshot when `__DEV__` is false.

These records describe UI dispatch and preview state. They do not establish venue acceptance, ownership of fills, durable child inventory or cleanup authority. They live in memory for one JavaScript runtime and are not wallet persistence. A reload starts a new session.

Code: `app/dev-tools/AgenticService/AgenticService.ts` `install`; `app/components/UI/Perps/utils/perpsUiObservations.ts` `readPerpsUiObservations`

## Snapshot version 1

| Field                            | Meaning                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `version`, `enabled`             | Schema version `1` and development capture availability                                 |
| `sessionId`                      | Opaque identity for this JavaScript runtime                                             |
| `submissionSequence`             | Monotonic dispatch cursor, including failed captures                                    |
| `evictedSubmissionThrough`       | Last submission sequence removed by the 50-record bound                                 |
| `droppedSettlements`             | Settlements whose records had already been evicted                                      |
| `captureFailures`                | Request, context, result, form or cancellation captures that could not be copied safely |
| `submissions`                    | Up to 50 advanced UI dispatch records, in issuing order                                 |
| `scaleForms`                     | Up to 50 Scale form snapshots, one latest snapshot per form lifetime                    |
| `cancellationObservationVersion` | Cancellation record schema version `1`                                                  |
| `cancellationSequence`           | Monotonic cancellation cursor, including failed captures                                |
| `evictedCancellationThrough`     | Last cancellation sequence removed by the 50-record bound                               |
| `droppedCancellationSettlements` | Cancellation settlements whose records were unavailable or already settled              |
| `cancellations`                  | Up to 50 advanced UI cancellation records, in issuing order                             |

Scope is `{ account, provider, network, market }`.

- The account is the selected EVM address, lowercased with the Perps messenger helper. The Scale form scope uses the form's normalized selected address instead.
- An unresolved account or network is `null`.
- Provider is the explicit request route or the current controller provider mode. `aggregated` alone does not establish a concrete venue.
- Scope is captured at the synchronous dispatch boundary, before the controller call, and kept when selections change later. Controller and provider session fences and independent venue observations are still needed.

Code: `app/components/UI/Perps/utils/perpsUiObservations.ts` `PerpsUiObservationSnapshot`; `app/components/UI/Perps/constants/perpsConfig.ts` `PERPS_UI_OBSERVATION_LIMIT`; `app/components/UI/Perps/hooks/usePerpsTrading.ts`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProOrderForm.ts`

## Submission

Every Scale, Chase and TWAP UI path reaches `usePerpsTrading.placeOrder`. Capture runs just before its controller call. The same parameter object is dispatched, the same result is returned, and a thrown error is rethrown. Observation failures cannot block or repeat the call. Ordinary orders are not captured.

Each submission contains:

- `requestId`, `<sessionId>:<sequence>`, stable from dispatch through settlement
- `sequence`, `issuedAt` and optional `settledAt`. Timestamps are diagnostic; correlation uses identity and sequence
- `scope`, the original issuing context
- `request`, the allowlisted unsigned `OrderParams`, including a copied `expectedScaleLadder` when supplied. `trackingData`, unknown fields, authentication and signed payloads are omitted
- `requestDigest`, lowercase SHA256 hex of the request's canonical JSON
- `state`, which is `pending` before resolution, `settled` when a public controller result arrives, `unknown` for an exception, absent result or failed result capture
- `result`, when available, with public `OrderResult` fields. These include optional `success`, refusal or error, filled, submitted and accepted sizes, average price, partial leverage state, accepted children, child IDs and `positionProtection` legs. Lighter `ScaleOrderGroup` fields are kept too, namely group ID, symbol, wallet, network, account and key slot indices, and group state. Key slot indices are public identity, not signing keys. Unknown result fields and exception messages are omitted

A false or missing `success` is preserved. An error does not mean nothing reached the venue. A handle or child ID is never taken from a nearby log or another record. Pending, partial and unknown records do not authorize a retry.

Canonical JSON sorts object keys recursively, omits undefined fields, keeps array order and uses JSON scalars without numeric or string conversion. The digest excludes timestamps, scope and telemetry. A consumer must hash the same allowlisted request or compare all its public fields.

Code: `app/components/UI/Perps/hooks/usePerpsTrading.ts` `placeOrder`; `app/components/UI/Perps/utils/perpsUiObservations.ts` `beginPerpsUiSubmission`, `perpsUiInputDigest`

## Cancellation

Only cancellations whose params carry an observed `orderType` (`scale`, `chase` or `twap`) are captured, in `usePerpsTrading.cancelOrder`. Today only the Pro Chase termination passes one. Scale and ordinary cancels pass no `orderType` and are not captured. TWAP termination calls the controller directly and bypasses the hook.

- Each record keeps its issuing scope and a request ID of `<sessionId>:cancellation:<sequence>`.
- The request allowlists `orderId`, `symbol`, `orderType` and `providerId`. `requestDigest` uses the same canonical JSON as submissions.
- Results keep only `success`, `orderId`, `providerId` and `error`.
- The cancellation sequence advances for every capture attempt, even when copying fails and no record is stored. A consumer must check that cursor, the eviction watermark, capture failures and dropped cancellation settlements around its single press. Missing or ambiguous records do not authorize another cancellation.
- `pending` means the hook call has not returned. `settled` means it returned a public result, including `success: false`; it does not establish venue settlement. `unknown` covers an exception, an absent result or a failed capture. Venue and durable-child evidence are still needed before claiming cancellation or cleanup.

Code: `app/components/UI/Perps/utils/perpsUiObservations.ts` `beginPerpsUiCancellation`, `OBSERVED_ORDER_TYPES`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProPositionsPanel.tsx`; `app/components/UI/Perps/hooks/usePerpsProPositionsPanelActions.tsx`; `app/components/UI/Perps/hooks/usePerpsTerminateTwap.ts`

## Scale form

A form snapshot has `formId`, `mounted`, `scope`, `input`, `inputDigest`, `previewGeneration`, `previewSequence`, `loading`, `stale`, `source`, `displayedLeverage`, `expectedRequest`, `expectedRequestDigest`, `preview` and `ladder`.

- `input` copies the visible min and max price, order count, skew, base size when applicable, USD amount, side, reduce-only setting and leverage. `inputDigest` hashes `{ scope, input }` with the same algorithm.
- `previewGeneration` identifies the current preview input and context lifetime; `previewSequence` the latest refresh in it. Changing account, provider, network, initialization or preview inputs retires the generation. A refresh may keep an older positive quote while loading; that snapshot is stale.
- `preview` is a safe copy of the provider preview. `ladder` copies the form's normalized `{ price, size }` rungs. `source` tells venue sizing from an estimate.
- `displayedLeverage` is the leverage the form renders. A recipe needing 1x must observe `1`, and the matching dispatch must also use `1`.
- `expectedRequest` is the unsigned order the form would dispatch, and `expectedRequestDigest` its digest. Both are `null` unless the form is mounted, loaded and not stale.
- Loading, incomplete, invalid or retired preview state is stale. Blur, leaving Scale and unmount mark the form unmounted and stale and clear `expectedRequest`. A previous positive preview or an unmounted snapshot cannot prove a current quote. Form history can be evicted; a missing form is uncertainty.

Code: `app/components/UI/Perps/utils/perpsUiObservations.ts` `PerpsUiScaleForm`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProOrderForm.ts`; `app/components/UI/Perps/hooks/usePerpsScalePriceLadder.ts`

## Consumer correlation

A consumer reads the method through the bridge's asynchronous evaluation. The schema replaces no harness, financial path or action API.

1. Before a native Submit press, keep the version-1 session and cursor, capture-failure and dropped-settlement counters, eviction watermark, exact form ID and input digest.
2. Require a mounted, current, settled preview with the expected scope, ladder, generation, refresh sequence and leverage. Take the expected dispatch from `expectedRequest` and `expectedRequestDigest`. Press once.
3. After the press, require the same session and exactly one new dispatch at the next sequence. Match its request ID, original scope and full request or digest, then wait for that record to settle.
4. Extra dispatches, a capture gap, changed error counters, an evicted expected record, a restart, a stale or foreign form, or a missing record or result mean uncertainty or refusal. Reconcile a changed watermark against the baseline; if the interval cannot be proven complete, refuse.
5. Never pick an arbitrary new handle, and never press again to get a missing result. A settled receipt still needs venue and durable-child proof before acceptance or cleanup.

For primary Chase rows, `getPerpsProChaseHandleSelector(symbol, handle)` wraps the primary termination control. Existing primary selectors and handle-suffixed non-primary selectors are kept. Bind the control inside the exact owned handle container before pressing; the container is an identity observation, not a press handler.

This schema supplies no Chase or TWAP durable child contract. Those strategies still need full controller and venue lifecycle evidence before a receipt-aware recipe can authorize cleanup.

Code: `app/components/UI/Perps/Perps.testIds.ts` `getPerpsProChaseHandleSelector`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProPositionsPanel.tsx`
