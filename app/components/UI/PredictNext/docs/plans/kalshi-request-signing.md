# Kalshi request signing on the phone: implementation plan

- **Status:** Proposed
- **Date:** 2026-10-26
- **Server plan:** `va-mmcx-predict-api/docs/KALSHI_DEVICE_SIGNING_PLAN.md`. Read §3 there for the wire types `VenueRequest`, the `Kalshi-Device-Auth` envelope and the `428 venue_signature_required` contract.
- **Builds on:** `auth/kalshiDeviceKey.ts`, `auth/a2tSession.ts`, [`../kalshi-device-key.md`](../kalshi-device-key.md), [`../a2t-review-checklist.md`](../a2t-review-checklist.md)

## 1. What changes for the phone

Every predict-api route that touches the user's Kalshi account needs a device signature over the exact Kalshi request. Those routes are balance, positions, activity, order preview and order commit. Predict-api tells the phone which requests it needs, either in the preview response (`venueOrder`) or in a `428`. The phone **checks** each request against a local policy, **signs** it with the device key, and sends the signatures in one `Kalshi-Device-Auth` header.

The phone is the security boundary. A signature lets the holder send that exact request to Kalshi once, within its lifetime, with the user's account authority. Predict-api is a relay we don't fully trust for this purpose. The rule is simple: **if the phone wouldn't be happy for Kalshi to execute the request as written, it doesn't sign it.**

## 2. Non-negotiable rules

1. **Never sign opaque bytes.** The phone builds the RFC 9421 signing base itself from structured fields. It never signs a base, a digest or a `Signature-Input` that the server supplies.
2. **The phone owns its signing parameters.** These come only from the phone:
   - `@authority`, from the build-time per-environment constant, not remote config. Demo is `demo-api.kalshi.co`
   - the A2T, from `a2tSession`
   - device key and salt
   - `Kalshi-Device-Request-Id` (fresh UUID v4)
   - `created`, `expires` (60 s) and the `kalshi-device-request-v1` tag
   - `Content-Digest`, computed locally from the body bytes
3. **Allowlist, not denylist.** Only the requests in §4 are signable. Anything else is rejected, including unknown paths, methods, query keys and body keys.
4. **Every field has a source.** Each field of an allowed request is one of:
   - _derived_ from the user's intent, and must be equal
   - _constant_ fixed by the template, and must be equal
   - _server nonce_, opaque but format-checked (UUID `client_order_id`, base64 cursor)
5. **Compare with the phone's own record.** The intent is what the user tapped and typed: market, side, action, amount or contracts. The screen is what the confirmation sheet showed. The server's echo of the intent is never the reference.
6. **What you see is what you sign.** The confirmation sheet's worst-case numbers are computed from the order body that will be signed, not from separate preview fields. If the two disagree, the policy fails.
7. **Canonical bytes only.** The body equals `JSON.stringify(JSON.parse(body))` with the template's key order and string-only values. The query equals its re-serialization in the template's parameter order. The path matches the template exactly. This rules out duplicate keys, whitespace, number formatting and percent-encoding tricks.
8. **One live order per approval.** On first sign, pin `previewId → { clientOrderId, bodyDigest }`. Later requests for that preview must be byte-identical. The phone signs an order at most 3 times per preview (initial, Kalshi auth retry, verified-absence resubmit).
9. **Fail closed, quietly.** On a policy failure, sign nothing. Show a generic "couldn't place order" error. Log the rule id only, never the payload.

## 3. Flows

### 3.1 Order

```text
user input ──► previewOrder (balance or positions pre-signed) ──► preview + venueOrder
                     │
                     ▼
         kalshiOrderPolicy.check(intent, preview, venueOrder)
           ├─ fail → no Confirm, generic error, telemetry(rule)
           └─ ok   → render sheet from the *body* (worst cost / min proceeds)
                     │  user taps Confirm
                     ▼
         ledger.pin(previewId, clientOrderId, digest) → sign(venueOrder) → commit
                     │
                     ▼
     receipt ─┬─ terminal → done
              ├─ reconciliation_required + nextVenueRequests[read] → readPolicy → sign → commit (bounded)
              └─ pending + nextVenueRequests[order] → ledger.assertSameBytes → sign → commit (≤ 3 total)
```

A quote is refreshed every few seconds and lives 30 s. The phone runs the policy on **each** preview response, so Confirm is enabled only for a preview that passed. Signing happens at Confirm, which keeps the 60 s signature window clear of user think-time.

### 3.2 Reads (balance, positions, activity)

1. If the request can be derived locally (balance; positions page 1; activity page 1), pre-sign it from the template in `kalshiReadTemplates.ts` and send it with the call.
2. If the response carries `nextVenueRequests` (next page), keep them for the next call. Check them with the read policy and sign them then.
3. On `428 venue_signature_required`, check every `requests[i]` with the read policy, sign, and **retry once**. A second 428 counts as an error.

Reads need no user interaction. A read signature only reveals the user's own data to predict-api, which relays it anyway. The allowlist still applies, so predict-api can't use the phone to read `/isv/*` (KYC and PII) or anything else.

## 4. Allowlist (v1)

Paths are under `/trade-api/v2`. The single source of truth is `contracts/v1/fixtures/kalshi-signing-v1.json`, shared with predict-api.

| ref            | Method + path                      | Query (exact order)                                         | Checks                                                                                                                             |
| -------------- | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `order`        | `POST /portfolio/events/orders`    | none                                                        | §5                                                                                                                                 |
| `balance`      | `GET /portfolio/balance`           | none                                                        | none                                                                                                                               |
| `positions`    | `GET /portfolio/positions`         | `[ticker=…&]count_filter=position&limit=1..1000[&cursor=…]` | `ticker`, if present, is the market on screen                                                                                      |
| `fills`        | `GET /portfolio/fills`             | `limit=1..1000[&max_ts=<int>][&cursor=…]`                   | none                                                                                                                               |
| `settlements`  | `GET /portfolio/settlements`       | same as `fills`                                             | none                                                                                                                               |
| `order_lookup` | `GET /portfolio/orders/{order_id}` | none                                                        | `order_id` equals the `venueOrderId` of a receipt the phone is observing                                                           |
| `order_scan`   | `GET /portfolio/orders`            | `ticker=…&min_ts=<int>&limit=1..200[&cursor=…]`             | `ticker` equals the pinned operation's market. `min_ts` is within 10 min before the pin time. Only while observing that operation. |

There are no other mutations. `/isv/*` enrollment and wallet routes get their own rows when onboarding starts. `POST /isv/wallet/register` will need an explicit on-screen confirmation of the address and network, because it binds the withdrawal destination.

## 5. Order policy (`kalshiOrderPolicy.ts`)

Inputs:

- `intent`: from the order flow state, not from the preview. `{ marketId, side, action, amount? , contracts? }`.
- `preview`: the parsed preview, used only for the numbers shown on screen.
- `venueOrder`: from the preview response.

Checks, in order. The rule id for telemetry is in brackets.

1. `[shape]` method `POST`, exact path, query `""`, `idempotencyKey === body.client_order_id`.
2. `[canonical]` the body parses to an object with exactly these keys, in this order, all strings: `ticker, client_order_id, side, count, price, time_in_force, self_trade_prevention_type`. Re-serializing gives the same string. Size ≤ 1 KiB.
3. `[constants]` `time_in_force === "immediate_or_cancel"` and `self_trade_prevention_type === "taker_at_cross"`.
4. `[ticker]` `ticker === intent.marketId`.
5. `[side]` `side === bookSideForOutcome(intent.action, intent.side)`. Buying YES or selling NO is a `bid`. Buying NO or selling YES is an `ask`.
6. `[price]` `price` matches `/^0\.\d{4}$/` and lies in `[0.0100, 0.9900]`. `outcomeLimit = intent.side === 'yes' ? price : 1 − price`. Use decimal math in integer ten-thousandths, never floats.
7. `[count]` `count` matches `/^\d+\.00$/` and `count ≥ 1`.
   - Sell: `count === intent.contracts`.
   - Buy: `count === preview.estimatedContracts`.
8. `[client_order_id]` UUID v4. If this preview is pinned, it must equal the pinned id and the whole body digest must equal the pinned digest.
9. `[buy_bound]` **Buy:** the amount the user typed is a hard cap, fees included (decided, server plan §7.3). Check, in integer cents:
   - `maxDebit = count × (outcomeLimit + feeCeiling)`
   - `maxDebit ≤ intent.amount`, where `intent.amount` is the user's own input and not the server's `requestedAmount` echo
   - `maxDebit === preview.maxDebit`
   - `feeCeiling` is `feeCeilingCentsPerContract` from the shared fixture `contracts/v1/fixtures/kalshi-signing-v1.json`, compiled in at build time and never taken from the API response. It must equal the server's value. A mismatch makes every buy near the cap fail, which a fixture test catches.
   - The sheet shows "Max" = `maxDebit` from this check, next to the expected `totalDebit`.
10. `[sell_bound]` **Sell:** `outcomeLimit === preview.limitPrice`. The sheet shows _minimum proceeds_ = `count × outcomeLimit`. Optionally also check `preview.averagePrice − outcomeLimit ≤ maxSlippage` (config, e.g. 0.10) so that a quote with a near-zero floor never reaches Confirm.
11. `[display]` The sheet's values (max cost, contracts, min proceeds) equal values recomputed from the body. Implement this by rendering those rows from `policyResult.display` only.

Every check is pure and synchronous. `check()` returns `{ ok: true, display } | { ok: false, rule }`.

## 6. Code changes

New code follows `docs/module-structure.md`. Signing primitives go under `auth/`. Policy goes under `auth/signing/` because it is shared by trading and portfolio.

| File                                                                        | Contents                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth/kalshiRequestSigner.ts`                                               | `signVenueRequest(req: VenueRequest): Promise<SignatureEntry>`. Builds the Appendix B signing base. The covered-component list is fixed per method. Calls `signWithKalshiDeviceKey`. Ensures the A2T is valid for ≥ 70 s first (`a2tSession.ensureA2T()`). Never exports a "sign these bytes" helper.                    |
| `auth/kalshiDeviceAuthEnvelope.ts`                                          | `buildDeviceAuthHeader(signatures)` gives `base64url(JSON)` with a2t, key and salt. Enforces ≤ 4 signatures.                                                                                                                                                                                                             |
| `auth/kalshiAuthority.ts`                                                   | Per-environment `@authority` constants (demo, prod), chosen by build env. Demo is `demo-api.kalshi.co`. They aren't in remote flags, because a flag flip shouldn't be able to retarget signatures.                                                                                                                       |
| `auth/signing/venueRequest.ts`                                              | `VenueRequest` type, strict parser (superstruct, like the other contracts), path, query and body canonical checks. A hand-rolled query parser, because RN's `URLSearchParams` polyfill differs from Node's.                                                                                                              |
| `auth/signing/kalshiReadPolicy.ts`                                          | §4 read rows. `checkRead(req, context)`.                                                                                                                                                                                                                                                                                 |
| `auth/signing/kalshiOrderPolicy.ts`                                         | §5. Includes the `acrossYesLeg` and `bookSideForOutcome` mirrors.                                                                                                                                                                                                                                                        |
| `auth/signing/kalshiReadTemplates.ts`                                       | Local builders for pre-signable reads (balance, positions page 1, activity page 1).                                                                                                                                                                                                                                      |
| `auth/signing/approvedOrderLedger.ts`                                       | In memory: `previewId → { intent, clientOrderId, bodyDigest, signCount, pinnedAt }`, plus the receipts being observed (for `order_lookup` and `order_scan` checks). Cleared on wallet lock, reset and SRP change, the same hooks as `a2tSession.clear()`. TTL 30 min.                                                    |
| `adapters/remote/PredictApiReadClient.ts`                                   | Optional `deviceAuth` header on `#get`/`#post`. On `428`, parse `{ code, requests }` into `PredictHttpError.venueRequests`. Parse the body `code` on GET errors too, not only on POST.                                                                                                                                   |
| `adapters/remote/KalshiRemoteAdapter.ts`                                    | `withVenueSignatures(call, presign)` wrapper on every portfolio and trading call. It pre-signs, calls, and on 428 runs the policy, signs and retries once. `previewOrder` runs `kalshiOrderPolicy` and attaches `policyResult` to the result. `commitOrder` signs the pinned order or the receipt's `nextVenueRequests`. |
| `contracts/v1/trading.ts`                                                   | Preview: add `venueOrder` (strict), parse `limitPrice` on buys, and add `maxDebit` on buys. Receipt: add `nextVenueRequests?` and `rejectionReason?`.                                                                                                                                                                    |
| `contracts/v1/fixtures/kalshi-signing-v1.json`                              | Copied from predict-api. Drives the policy tests.                                                                                                                                                                                                                                                                        |
| `services/PredictOrderService.ts`                                           | `#observe` signs reconcile reads automatically. Bound the loop as today. Order re-signs only through the ledger. Never auto re-sign a **new** body.                                                                                                                                                                      |
| `views/PredictOrderFlow/internal/OrderApproval.tsx`, `OrderSummaryRows.tsx` | Render max cost or min proceeds from `policyResult.display`. Disable Confirm when the policy fails.                                                                                                                                                                                                                      |
| `errors/registry.ts`                                                        | `VENUE_SIGNATURE_REJECTED` (policy failure, generic copy), `VENUE_AUTH_INVALID`, `VENUE_ACCOUNT_NOT_ENABLED` (route to onboarding when it exists), `VENUE_AUTH_REJECTED`.                                                                                                                                                |

### 6.1 Error mapping

| Server                          | Phone                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `401` (any)                     | `UNAUTHENTICATED`. This is the MetaMask session only. Unchanged.                                    |
| `428 venue_signature_required`  | Handled inside the adapter: policy, sign, retry once. Surfaces only if the retry fails.             |
| `403 venue_auth_invalid`        | `a2tSession.invalidate(token)` (checklist item 1), re-issue, retry once. Then `VENUE_AUTH_INVALID`. |
| `403 venue_account_not_enabled` | `VENUE_ACCOUNT_NOT_ENABLED`                                                                         |
| `502 venue_auth_rejected`       | `VENUE_AUTH_REJECTED`. Generic copy. Sentry.                                                        |
| `400 venue_auth_malformed`      | `INVALID_RESPONSE` (our bug)                                                                        |

Branch on body `code` before status, as `mapTradingError` already does. Extend that to the portfolio reads.

## 7. Related checklist items

These items in `a2t-review-checklist.md` become blocking once requests are signed:

- **#1 `invalidate(token)`**: needed for `venue_auth_invalid`.
- **#6 delete the device key on SRP import**: a signed request names the A2T `sub`. The ledger must also clear.
- **#10 no cleartext issuer**: also applies to the predict-api base URL in release builds. Signatures travel to it.

## 8. Tests

- **Signer:** the known-good vector from Kalshi (or `yarn kalshi:onboard sign` until then). A round trip through predict-api's verifier, using the shared fixture. Negative cases: wrong authority, mutated body, query or key.
- **Policies:** one table-driven suite per allowlist row from the shared fixture. Each has a happy path plus one mutation per field:
  - wrong ticker
  - flipped book side
  - price ±0.0001
  - `count` ±1
  - an extra key, a duplicate key, reordered keys, a numeric value instead of a string, whitespace
  - unicode or `%2F` in the path, `?` in the query, an unknown query key
  - a new `client_order_id` for a pinned preview
  - a buy whose `count × (limit + feeCeiling)` is 1¢ over the typed amount, and one exactly at it (must pass)
  - `preview.maxDebit` that disagrees with the body
  - a sell below the shown minimum
- **Property test:** any random single-character body mutation is rejected, unless it falls inside a server-nonce field and keeps that field's format.
- **Adapter:** 428 → sign → retry happens exactly once. A second 428 surfaces an error. `nextVenueRequests` are checked before signing. Nothing is signed when the policy fails, so assert `signWithKalshiDeviceKey` is never called.
- **Flow:** Confirm is disabled on a policy failure. The sheet values come from the body.

## 9. Delivery order

1. Shared fixture plus `venueRequest.ts` and the policies (pure, no network).
2. `kalshiRequestSigner.ts` and the envelope, tested against the vector.
3. Reads: balance, then positions, then activity, through `withVenueSignatures`.
4. Preview: `venueOrder` parsing, order policy and the sheet rendered from the body.
5. Commit: ledger, signing on Confirm, reconcile reads in `#observe`.
6. Error codes and `a2tSession.invalidate`.

Everything stays behind the existing Kalshi venue gate. Until predict-api ships the envelope, its `KALSHI_HARDCODED_USER` mode ignores missing signatures, so the phone can ship steps 1 and 2 early.

## 10. Open questions

1. ~~Buy max-spend semantics~~. **Decided:** the amount is a hard cap, fees included. The server caps contracts (server plan §7.3), and the phone enforces §5 check 9. Remaining dependency: Kalshi has to confirm the per-contract fee ceiling (server plan §10 Q6).
2. **Ledger persistence.** If the app is killed after signing and before the receipt, should the pin survive (SecureKeychain with a TTL) so that reconcile reads and a verified-absence resubmit can continue? The alternative is to drop it and leave the operation to the server and the next preview. Keychain with a 30 min TTL is the safe default.
3. **Extra confirmation.** Is the Confirm tap enough consent, or do we want device auth (biometrics) before signing an order? The 60 s signature window allows for a biometric prompt.
4. **Admin-key reads** (server plan §10 Q1). Kalshi's public docs show none, so plan on signing reads. If the ISV spec turns out to allow them, §3.2 and every read row in §4 go away, and `order` is the only signable request.
