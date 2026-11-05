# Review: `kalshi-demo-onboarding` (mobile) and `feat/kalshi-demo-onboarding` (predict-api)

Checked against ADR-0003 (trust model) and ADR-0004 (venue request templates).

- Mobile: 58 commits, 66 files changed.
- predict-api: 22 commits, 105 files changed.

All findings come from reading the code. No tests were run. Paths are relative to `app/components/UI/PredictNext/` (mobile) and `apps/api/src/` (predict-api) unless shown otherwise.

---

## 1. Is the vendor-specific request shape template-driven?

**Mostly yes. The core pattern is in place in both repos. A few leaks remain, and the "shared profile" isn't actually shared yet.**

### What holds

- **Phone.**
  - Every device-signed call (onboarding, portfolio, preview, commit) goes through `signOperation` → `renderStep`.
  - Each call carries a canonical operation, the user's inputs and named server values.
  - The phone renders the bytes itself, shape-checks every server value, and signs.
  - A `read` operation cannot render a `mutation` template.
  - Phone-owned fields come from the profile or the device: authority, covered components, `Content-Digest`, request ID, `created`/`expires`.
- **Onboarding client.**
  - `KalshiOnboardingClient` names only `onboarding.status|start|link|verify|activate` plus inputs.
  - It contains no `/isv/...` paths, Kalshi refs or field names.
- **predict-api.**
  - Every device-signed route uses `@VenueOperation` + `calls.prepare`. That includes all five onboarding routes, portfolio, preview and commit.
  - `prepare` renders from the profile, pairs signature _n_ with request _n_, and returns the only requests a handler can relay.
  - The old request builders are gone (`kalshi-signed-post.ts` was removed, `kalshi-signed-get` became an unsigned `kalshi-get`).
  - `KALSHI_HARDCODED_USER` and `KALSHI_DEVICE_AUTHORITY` no longer appear in tracked code.
- **Admin-key exceptions.** `demo-kyc` is outside the framework, as the ADR says. It is gated twice: the module is registered only in demo, and the handler re-checks `NODE_ENV`, the host and the audience.

### Where it breaks the template principle

**T1 (High). The two profiles have drifted, and both still carry the id `kalshi-demo-signing-v2`.**

Each repo tests its TS constant against _its own_ copy of `venue-signing-v2.json`. Nothing compares the two copies, and they differ:

| Field                                                        | Mobile                 | predict-api |
| ------------------------------------------------------------ | ---------------------- | ----------- |
| `order_scan` `min_ts.maxAgeSec`                              | 2400                   | 600         |
| `opaque.maxLength` on `marketId` / ticker sources (5 places) | 128                    | 256         |
| `order_create.idempotencyKey`                                | `uuid-v4` shape        | no shape    |
| Request name                                                 | `positions_for_market` | `position`  |

The cases differ as well:

- Different inputs (`MKT` vs `KXTEST-26-A`).
- The mobile copy has `order commit none` (plus differently named submit/lookup/scan cases).
- The API copy has `order submit sell no` and `order scan with cursor`.

**Why it matters:**

- ADR-0004 §4 says "the profile is the only description of the venue wire format", and its Consequences say both repos test against the shared fixture. Today that isn't enforced.
- The `maxAgeSec` gap already causes a bug: see O2.
- Because the id is the same, the envelope's `signingProfileId` can't detect the mismatch.

**Fix:**

- Make one copy canonical: a published package, a git submodule, or a CI job that byte-compares the two files.
- Have each repo assert `profile` _and_ `cases` against it.
- Bump the id or a version whenever the content changes.

**T2 (High). The order sheet bypasses the active profile and names a Kalshi request.**

`auth/signing/orderCommit.ts:1,32-37` (`readOrderCommitDisplay`, called from `PredictOrderFlowSheet`):

- It imports `KALSHI_DEMO_SIGNING_PROFILE` directly.
- It finds the request by `name === 'order_create'`.
- The Confirm gate and the invariant display can therefore come from a different profile than the one `signOperation` resolves.
- It puts a venue ref in UI-reachable code.

**Fix:** add something like `PredictDeviceAuthService:previewOperation(op, step, input)`. It would use the active profile and return the `display` of whichever request has an invariant.

**T3 (Medium). Kalshi names are hardcoded in generic code.**

- `auth/signing/venueTemplates.ts:~506-509`: `binary-limit-order-v1` reads body keys `price`/`count` and inputs `action`/`outcome` by name. The ADR says only the parameters are venue-specific. Add `priceField`, `countField`, `actionInput` and `outcomeInput` params.
- `services/PredictDeviceAuthService.ts:240`: reads `values.min_ts` by name to enforce the 10-minutes-before-`pinnedAt` rule. That rule should be profile data, for example a `time` shape anchored to `pinnedAt`, or an invariant.
- `adapters/remote/PredictApiReadClient.ts:404-406`: hardcodes the initial steps `'holdings'`/`'settlements'`. `signOperation` should default to the operation's first declared step.
- `auth/signing/approvedIntentLedger.ts:11,14`: `APPROVED_INTENT_SIGN_LIMIT=3` and `SCAN_LOOKBACK_SEC=600` are constants. ADR-0004 calls the limit "the profile's limit". Move both into the operation's `confirmation` rule.

**T4 (Low). A server-side template convention that can drift.**

The `prepare` step check (`venue-signing/venue-operation.ts:112`) throws `venue_step_changed` with `values: {}`. Portfolio and commit wrap it with the real `next`. Any new route that relies on `prepare` alone would return an unusable `next`. Have `prepare` carry the current values in the exception.

---

## 2. predict-api findings

### Critical

**A1. Activity and Positions read every user's trades.**

- `app/portfolio/kalshi-order-records.ts:20-35` scopes `EXECUTED` by `venueId` only.
- The comment there justifies this with "every profile trades on the one configured demo account", and says per-user accounts would replace it.
- This branch removes that shared account, so per-user accounts are now live. As a result:
  - Activity lists every user's fills.
  - Cost basis and PnL in Positions/Summary use other users' trades.
- **Fix:**
  - Add `profileId` to `VENUE_ACCOUNT_SCOPE` and pass it through `#tradesAfter`, `#ledgers`, `#holdingCosts` and the untimed count.
  - Extend `order_operations_activity_idx` to include `profileId`.
  - Add a two-user integration test.

### High

**A2. The shared balance cache is keyed by device, not by user.**

- `kalshi-account/shared-balance-read.ts`, called with `calls.deviceKeyId` (`deviceKey:salt`, `venue-operation.ts:90`) from `kalshi-balance.service.ts:54` and onboarding `:192`.
- The mobile key slot is per venue profile, not per MetaMask profile. So two MetaMask profiles on one phone can share it, and one can be served the other's balance or onboarding status within the 2 s window.
- **Fix:** key the cache by A2T `sub` + device key + salt.

**A3. Onboarding logs Kalshi bodies and headers.**

- `app/kalshi-onboarding/kalshi-onboarding.service.ts:195-224`.
- On success it logs response bodies: balances, `phone_last4`, `obfuscated_email`, `payout_method_id`.
- On failure it logs the full response, all headers, and the signed device headers including A2T claims.
- None of these fields are in the redact list.
- The flow is temporary, but this logging pattern tends to get copied. Log only status, method, path and error code.

**A4. Commit returns 403 when only the values changed.**

- `app/orders/order-commit.service.ts:642-652`.
- If the step matches but the values moved (scan cursor advanced, `order_id` now known), the route returns 403 `venue_authorization_invalid` instead of 409 `venue_step_changed` with the current `next`.
- The phone then drops its A2T and re-signs the same stale values, which fails again.
- Portfolio already handles this case (`portfolio.controller.ts:189-198`). Mirror it here.

**A5. A reused idempotency key gives a raw 500.**

- Unique `client_order_id` plus the preview/commit race handler (`order-commit.service.ts:252-267`).
- A second preview with an existing key fails the insert and rethrows the Prisma error.
- The phone does reuse keys (see M2).
- **Fix:** answer a typed 409 at preview, or converge on the existing operation.

**A6. Continuation tokens can exceed header limits and expose portfolio data.**

- `app/portfolio/portfolio-continuation.ts:75-95` puts all holdings, snapshots or settlements into a base64 token sent in the GET query.
- Node's 16 KB header limit is reached at roughly 50 holdings or settlements, which gives a 431.
- The tokens are signed but not encrypted, so balances and positions appear in access logs.
- **Fix:** keep the state server-side under a random ID with a TTL.

### Medium

- **A7. Continuation HMAC.**
  - The key is the A2T issuer private JWK (`portfolio-continuation.ts:29-35`), so one key serves two purposes. Use a dedicated secret, or derive a subkey with HKDF.
  - Tokens carry no `exp`/`iat` and never expire. Add a TTL.
  - The binding to operation and profile, and the constant-time compare, are correct.
- **A8. Signature lifetime check.** `venue-signing/venue-authorization.ts:275` accepts `expires - created <= lifetimeSec * 5`, which is 300 s against a 60 s profile. Duplicate `requestId`s inside one envelope are not rejected either. Tighten the check to `lifetimeSec` plus a small skew.
- **A9. Positions/Summary send users to onboarding on settlements `permission_denied`.**
  - In `kalshi-portfolio-valuation.service.ts:358-366`, that error maps to 403 `venue_account_not_enabled`, which the client treats as "route to onboarding".
  - So any user holding a resolved market can't load Positions/Summary.
  - Activity already has the right fallback (`deviceRouteUnserved`). Reuse it here.
- **A10. Concurrent scans double-count absences.**
  - `order-commit.service.ts:492-498` increments with no compare-and-set. Two overlapping scans can take the count from 2 to 4, and the `=== 3` re-arm check never fires.
  - Separately, the cursor is not cleared after a fresh-claim absence (`:425-427`).
  - **Fix:** use `updateMany` conditioned on the current `reconciliationAttempts` and `reconciliationCursor`.

### Low

- Onboarding maps a generic venue 403 to `502 onboarding_venue_error` instead of `venue_auth_rejected` (`kalshi-onboarding.map.ts:123`).
- The A2T `exp` is not checked against the signature's `expires`.
- A re-armed submit doesn't re-check that the market is still tradeable.
- The env renames (`KALSHI_API_KEY_ID` → `KALSHI_ISV_API_KEY_ID`, and the private key) silently disable the WebSocket stream if deploy config isn't updated. Warn at startup when the old names are present.
- `venue_price` is stored but never read. Either render the commit from the stored value or drop the column.
- The migration is safe: nullable columns only, no backfill needed.

---

## 3. Mobile findings

### High

**M1. Any A2T rejection wipes the confirmation ledger.**

- `signedVenueCall.ts:100` → `invalidateSigningSession` → `PredictDeviceAuthService:clear` → `clearApprovedIntents()` (`PredictDeviceAuthService.ts:298`).
- One 403 on a balance read drops every pinned intent, so order observation then fails until the user confirms again.
- The retry also reuses `confirmed: true` from the sheet, so the intent is re-pinned (and `signCount` reset) without the user.
- **Fix:**
  - Add an action that drops only the A2T.
  - Clear the ledger on lock, reset and SRP change only.
  - Don't carry `confirmed: true` into retries.

**M2. One idempotency key is reused across orders.**

- `PredictOrderFlowSheet.tsx:136` mints a single key with `useRef(uuidv4())` and never rotates it, neither on intent change nor on re-quote after a receipt.
- This burns the ledger's `signCount` and triggers A5.
- **Fix:** rotate the key per intent, and use lazy init.

**M3. A local signing refusal is treated as an ambiguous commit.**

- `PredictApiReadClient.ts:631,634` throws synthetic 400s, which `isPreOperationFailure` (`PredictOrderService.ts:182`) doesn't recognise.
- So about 5 minutes of background re-dispatch runs for a request that was never sent.
- **Fix:** use a typed error and treat it as a pre-operation failure.

**M4. The ledger has two races.**

- `approvedIntentLedger.ts:122-166` reads, edits and writes the keychain with no mutex, and `clear()` is fire-and-forget.
- A lock that lands mid-claim can bring pins back after the clear.
- Two concurrent claims can both pass the sign limit.
- **Fix:** serialize claims and clears, or check a generation counter before writing.

### Medium

- **Paged reads.**
  - `venue_step_changed` re-renders up to 200 times (`PredictApiReadClient.ts:409-447`). The ADR says re-sign once.
  - The continuation cap of 200 signed round trips is high.
  - The `#nextSigning` map is unbounded, keyed only by cursor, and never cleared on account switch.
- **Observation bounds.** `MAX_COMMIT_OBSERVATIONS = 3` (ADR says 8), and background re-signing runs for 5 minutes with no overall cap. Align the code with the ADR, or amend the ADR.
- **Invariant display.** The sheet adds a single max-cost/min-proceeds row from the invariant `display`, but totals and payout still come from the server preview. The ADR says the sheet renders from `display`.
- **Sell proceeds.** In `venueTemplates.ts:527,554`, sell `minProceeds` ignores the fee ceiling, so it overstates what the user receives.
- **Decimal bounds.** A malformed decimal-shape bound silently disables the check (`venueTemplates.ts:234-237`). Throw instead.
- **Path parameters.** `.` and `..` are accepted (`venueTemplates.ts:378-382`). This is harmless today because `order_id` is `uuid-v4`, but refuse them in the generic code.
- **Over-limit signatures.** Going over `maxSignatures` returns `undefined` ("signing unavailable") instead of throwing the rule id.

### Low / nits

- `venue_account_not_enabled` maps to `BALANCE_UNAVAILABLE` (`KalshiRemoteAdapter.ts:~87`). The ADR says to route to onboarding.
- `renderBody`/`readLedger` use plain objects for keys that come from data. Prefer `Object.create(null)`.
- `deviceSigningBase` hardcodes `content-type`/`idempotency-key` lines instead of deriving them from `coveredComponents`.
- Unshaped idempotency keys (start/link/verify) are inserted raw into the signing base. Give them a `uuid-v4` shape.
- Lone surrogates make `encodeURIComponent` throw a `URIError` that escapes the `TemplateError` handling.

### Test gaps

- Ledger concurrency, and a lock landing mid-sign.
- Repeated `venue_step_changed`.
- A signing refusal at commit.
- Idempotency key rotation.
- `maxSignatures` overflow.
- Sell proceeds with fees.
- Cross-repo fixture parity (T1).

---

## 4. Onboarding (temporary flow, non-blocking)

The onboarding _calls_ follow the template pattern in both repos. The items below are about the flow itself. They're raised but not blocking, except the first two, which are about exposure in production rather than the flow.

- **Worth fixing before merge: the demo is always on.**
  - The latest commit (`59de15faffe`) makes `isKalshiDemoOnboardingEnabled = () => true` (`onboarding/internal/demoOnboardingConfig.ts:10`).
  - The gate now depends only on remote config. `KalshiDebugPanel` renders on every PredictHome; the comment there says it self-gates, which is no longer true.
  - The panel shows the stored email, the A2T `sub` and the raw balance, and offers a relink.
  - **Fix:** restore a build-time env gate for both the gate and the panel.
- **Worth fixing before merge: activation registers a hardcoded wallet.**
  - `kalshiDemoPayoutWallet` always returns the Stripe sandbox address (`demoOnboardingConfig.ts:17,28`), and that address is signed as the payout destination.
  - With the demo always on, a production user would have withdrawals pointed at someone else's wallet.
  - **Fix:** the build gate covers this. Also refuse the address unless the profile authority is `demo-api.kalshi.co`.
- `kalshiDebugInfo.ts` stores the typed email in plain `StorageWrapper` and never clears it on reset or SRP change.
- The relink path skips `createIntent` and moves to `approved` on the client side.
- `wallet_missing` can no longer be reached.
- The debug panel has hardcoded English strings.
- `KalshiOnboardingClient.ts:188` hardcodes `confirmed: true` in the transport. The UI step that showed the confirmation should pass it.
- predict-api remaps several Kalshi error codes to `onboarding_*` 409s. Revisit those when the KYC team's flow lands.
- Polling is bounded (60–120 s) and respects `AppState`. The state machine and hook are well tested.

---

## Suggested merge order

1. **A1** (cross-user trades) and the **demo gate / hardcoded wallet**. These are exposure issues.
2. **T1** (one shared profile and fixture, with a CI check). This also fixes **O2**.
3. **A2, A4, A5/M2, M1, M3**: correctness of signing and retries.
4. **T2/T3**: remove the remaining venue names from generic code.
5. The rest.

**O2. Order scan becomes unreachable** (caused by T1 plus `min_ts` anchoring):

- `#minTs` uses `submittedAt − 60s` (`order-commit.service.ts:583-586`), and `submittedAt` is reset on re-arm.
- Once the order is about 9 minutes old, `min_ts` fails the server's `maxAgeSec: 600`, so every scan returns a 400.
- After a re-arm, `submittedAt` is later than `pinnedAt`, so the phone refuses to sign the scan.
- Either way, the order stays in `reconciliation_required`.
- **Fix:** anchor `min_ts` to the first submission or `createdAt`, and set one `maxAgeSec` consistent with the 30-minute ledger TTL.
