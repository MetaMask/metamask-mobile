# Advanced UI order observations

Development builds expose `globalThis.__AGENTIC__.readPerpsUiObservations()` through the existing agent bridge. It returns detached JSON-compatible copies. Reading does not call a controller, initialize a signer, request venue data, submit, cancel or close orders. The bridge exposes no observation writer. Release builds do not install the bridge; the reader also returns an empty disabled snapshot when `__DEV__` is false.

These records describe UI dispatch and preview state. They do not establish venue acceptance, ownership of fills, durable child inventory or cleanup authority. They are held in memory for one JavaScript runtime and are not wallet persistence. A reload starts a different session.

## Snapshot version 1

| Field                            | Meaning                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `version`, `enabled`             | Schema version `1` and development capture availability.                                 |
| `sessionId`                      | Opaque identity for this JavaScript runtime.                                             |
| `submissionSequence`             | Monotonic dispatch cursor, including failed captures.                                    |
| `evictedSubmissionThrough`       | Last submission sequence removed by the 50-record bound.                                 |
| `droppedSettlements`             | Settlements whose records had already been evicted.                                      |
| `captureFailures`                | Request, context, result, form or cancellation captures that could not be copied safely. |
| `submissions`                    | Up to 50 advanced UI dispatch records, in issuing order.                                 |
| `scaleForms`                     | Up to 50 Scale form snapshots, one latest snapshot per form lifetime.                    |
| `cancellationObservationVersion` | Cancellation record schema version `1`.                                                  |
| `cancellationSequence`           | Monotonic cancellation cursor, including failed captures.                                |
| `evictedCancellationThrough`     | Last cancellation sequence removed by the 50-record bound.                               |
| `droppedCancellationSettlements` | Cancellation settlements whose records were unavailable or already settled.              |
| `cancellations`                  | Up to 50 advanced UI cancellation records, in issuing order.                             |

Scope is `{ account, provider, network, market }`. The account is the selected EVM address, normalized to lowercase using the existing Perps messenger helper. An unresolved account or network is `null`. Provider records the explicit request route or current controller provider mode; `aggregated` alone does not establish a concrete venue. Scope describes the selection at the synchronous dispatch boundary, before the controller is called. It is retained when later selections change. Controller/provider session fences and independent venue observations remain necessary.

## Submission

All actual Scale, Chase and TWAP UI paths reach `usePerpsTrading.placeOrder`. Capture occurs immediately before its existing controller call. The same parameter object is dispatched, the same result is returned, and a thrown error is rethrown. Observation failures cannot block or repeat that call. Ordinary orders are not captured.

Each submission contains:

- `requestId`: `<sessionId>:<sequence>`, stable from dispatch through settlement.
- `sequence`, `issuedAt` and optional `settledAt`. Timestamps are diagnostic; correlation uses identity and sequence.
- `scope`: the original issuing context.
- `request`: the allowlisted unsigned `OrderParams`, including the copied `expectedScaleLadder` when supplied. `trackingData`, unknown fields, authentication and signed payloads are omitted.
- `requestDigest`: lowercase SHA256 hex of the public request's canonical JSON.
- `state`: `pending` before resolution; `settled` when a public controller result arrives; `unknown` for an exception, absent result or failed result capture.
- `result`, when available: public `OrderResult` fields, including optional `success`, refusal/error, partial leverage state, accepted children and child IDs. Lighter's public `ScaleOrderGroup` fields are retained too: group ID, symbol, wallet, network, account/key slot indices and group state. Key slot indices are public identity, not signing keys. Unknown result fields and thrown exception messages are omitted.

A false or missing `success` value is preserved. An error does not mean that nothing reached the venue. A handle or child ID is never selected from a nearby log or another record. Pending, partial and unknown records do not authorize a retry.

Canonical JSON recursively sorts object keys, omits undefined object fields, preserves array order and uses JSON scalar representations without numeric/string conversion. The digest excludes timestamps, scope and telemetry. A consumer must hash the same allowlisted public request or compare its full public fields. `inputDigest`, below, hashes `{ scope, input }` using the same algorithm.

## Cancellation

Scale and Chase cancellation captures begin immediately before the existing controller call in `usePerpsTrading.cancelOrder`. Ordinary cancellations are not captured. Each record retains its original issuing scope and a request ID of `<sessionId>:cancellation:<sequence>`. The public request allowlists `orderId`, `symbol`, `orderType` and `providerId`; `requestDigest` hashes that request using the same canonical JSON as submissions. Results retain only `success`, `orderId`, `providerId` and `error`.

The cancellation sequence advances for every capture attempt, even when copying fails and no record is stored. A consumer must check that cursor, the eviction watermark, capture failures and dropped cancellation settlements around its single press. Missing or ambiguous records do not authorize another cancellation.

`pending` means the hook call has not returned. `settled` means the hook returned a public result, including `success: false`; it does not establish venue settlement. `unknown` covers an exception, an absent result or a failed result capture. The original result or exception is preserved for the caller. Independent venue and durable-child evidence are still required before claiming cancellation or cleanup.

## Scale form

A form snapshot contains `formId`, `mounted`, `scope`, `input`, `inputDigest`, `previewGeneration`, `previewSequence`, `loading`, `stale`, `source`, `displayedLeverage`, `preview` and `ladder`.

`input` copies the visible min/max price, order count, skew, base size when applicable, USD amount, side, reduce-only setting and leverage. `previewGeneration` identifies the current preview input/context lifetime; `previewSequence` identifies the latest refresh in that lifetime. Changing account, provider, network, initialization or preview inputs retires the prior generation. A refresh may retain an older positive quote while loading; such a snapshot is stale.

`preview` is a safe copy of the provider preview. `ladder` copies the form's normalized `{ price, size }` rungs rather than recalculating them in the reader. `source` distinguishes venue sizing from an estimate. `displayedLeverage` is the leverage rendered by the form; a recipe requiring 1x must observe `1`, and the matching dispatch must also use `1`.

Loading, incomplete, invalid or retired preview state is stale. Blur, leaving Scale and unmount mark the form unmounted and stale. A container, a previous positive preview, or an unmounted snapshot cannot prove a current quote. Form history can be evicted; a missing exact form is uncertainty.

## Consumer correlation

The pinned mm-harness 0.69.0 bridge can read the method through its existing asynchronous evaluation surface. `ui.press` returns no order receipt and `watch_logs` has no typed receipt ownership contract. No harness, financial path or action API is replaced by this schema.

Before a native Submit press, retain the enabled version-1 session/cursor, capture-failure and dropped-settlement counters, eviction watermark, exact form ID and input digest. Require a mounted, current, settled preview with the expected scope, normalized ladder, generation, refresh sequence and leverage. Derive the expected public dispatch fields/digest from that exact input and settled preview. Press exactly once.

After the press, require the same session and exactly one new dispatch at the expected next sequence. Match its request ID, original scope and full public request/digest, then await settlement of that same record. Extra dispatches, a capture gap, changed error counters, an evicted expected record, restart, stale/foreign form, missing record or missing result produce explicit uncertainty or refusal. A changed watermark must be reconciled against the retained baseline; if the consumer cannot prove the expected interval is complete, refuse. Never choose an arbitrary new handle and never repeat a press to obtain a missing result. A settled receipt still needs independent venue and durable-child proof before acceptance or cleanup.

For primary Chase rows, `getPerpsProChaseHandleSelector(symbol, handle)` identifies the exact container around the compatible primary termination control. Existing primary selectors and handle-suffixed non-primary selectors are preserved. A consumer must bind the existing control inside the exact owned handle container before pressing; the container is an identity observation, not an additional press handler.

This Mobile schema supplies no new Chase/TWAP durable child contract. Those strategies still require complete controller and independent venue lifecycle evidence before a receipt-aware recipe can authorize cleanup.
