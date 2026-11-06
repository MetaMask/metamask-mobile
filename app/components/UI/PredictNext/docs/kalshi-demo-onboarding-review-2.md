# Review 2: `kalshi-demo-onboarding` (mobile) and `feat/kalshi-demo-onboarding` (predict-api)

Follow-up to the first review. Checked against ADR-0003 and ADR-0004, on the working trees as of today.

Accepted by the owner and not re-raised:

- T1 profile duplication is synced by hand, with a canonical source postponed.
- The onboarding flow is temporary and judged leniently, though its calls must still use the template pattern.
- Continuation was solved a different way (reviewed below).

All findings come from reading the code. I ran the shared fixture (20 cases, 16 refusals) through both renderers with a transpile-and-run script and all pass. I did not run jest or vitest.

## Verdict

**The earlier review is almost fully addressed.** Of 40 tracked findings, the Critical and every High from review 1 are fixed, except the demo gate. The fixes are well tested.

**Before merge, one item is open:** the demo onboarding gate, the debug panel and the hardcoded payout wallet are still always on.

**New issues are small.** The most important are:

- A renderer drift between the two repos that the fixture doesn't catch.
- A scan window that expires before the operation can be reconciled.
- A 409 that can loop.

---

## 1. Status of previous findings

### Backend

| ID                                                                | Status                | Notes                                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 cross-user trades (Critical)                                   | **Fixed**             | `profileId` is in the scope for Activity, Positions, ledger, untimed count and realized PnL. The index was rebuilt with `profile_id` first. Two-profile test exists for Activity. No such test for the valuation `#holdingCosts`. |
| A2 balance cache key                                              | **Fixed**             | Key is `sub:deviceKey:salt`, and the A2T `sub` is checked against the caller.                                                                                                                                                     |
| A3 onboarding logging                                             | **Fixed**             | Only method, path, status and error code are logged. One leftover: the balance 429 warn still logs Kalshi headers and body.                                                                                                       |
| A4 commit 403 vs 409                                              | **Partial**           | Now returns 409 with the current `next`. See N3 for a loop.                                                                                                                                                                       |
| A5 reused idempotency key                                         | **Fixed**             | Typed 409 at preview, `P2002` handled at commit, tests added.                                                                                                                                                                     |
| A6/A7 continuation                                                | **Fixed / argued OK** | See section 3.                                                                                                                                                                                                                    |
| A8 lifetime and nonce                                             | **Partial**           | Lifetime is now `lifetimeSec + 5` and duplicate request ids are rejected. There is still no nonce store. Accept it and record it.                                                                                                 |
| A9 settlements `permission_denied`                                | **Fixed**             | Positions and Summary skip the check and mark the result incomplete.                                                                                                                                                              |
| A10 absence double-count                                          | **Fixed**             | `#recordAbsence` is a compare-and-set, and the cursor is cleared.                                                                                                                                                                 |
| O2 scan window                                                    | **Partial**           | Anchored to `createdAt` now. See N1.                                                                                                                                                                                              |
| 403 mapping, A2T `exp`, re-armed tradeable check, env warning, T4 | **Fixed**             |                                                                                                                                                                                                                                   |
| `venue_price` unused                                              | Open (nit)            | Still written, never read.                                                                                                                                                                                                        |
| Activity treats any `permission_denied` as unserved               | Open (low)            | Guarded because holdings succeed first.                                                                                                                                                                                           |

### Mobile

| ID                                                                                      | Status                | Notes                                                                                                                                    |
| --------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Demo gate, debug panel, Stripe wallet                                                   | **Still open**        | `isKalshiDemoOnboardingEnabled` is `() => true`. The panel renders on every PredictHome and the sandbox wallet is signed for every user. |
| T2 order sheet                                                                          | **Fixed**             | Goes through `previewOperation` and the active profile.                                                                                  |
| T3 Kalshi names in generic code                                                         | **Fixed**             | Invariant fields, `pinnedTimes`, `signLimit` and first step all come from the profile.                                                   |
| M1 ledger wiped on A2T rejection                                                        | **Fixed**             | `invalidateA2t` clears only the session, and retries pass `confirmed:false`.                                                             |
| M2 idempotency key reuse                                                                | **Fixed**             | Lazy key, reset on intent change and after a receipt.                                                                                    |
| M3 signing refusal as ambiguous                                                         | **Fixed**             | `PredictRequestNotSentError` is treated as pre-operation.                                                                                |
| M4 ledger races                                                                         | **Fixed**             | Serialized queue and generation counter, with tests.                                                                                     |
| Paged reads                                                                             | **Fixed**             | Cap of 25 calls, one retry on step change, bounded map cleared on account switch.                                                        |
| Observation bounds                                                                      | **Fixed**             | ADR amended to 3, background capped at 12.                                                                                               |
| Sheet renders from invariant                                                            | **Partial, accepted** | Totals and payout come from the invariant. Prices and fees still come from the preview.                                                  |
| Sell proceeds fee                                                                       | **Fixed**             |                                                                                                                                          |
| Malformed bound, dot segments, lone surrogates                                          | **Partial**           | Fixed on mobile only. See N1.                                                                                                            |
| `maxSignatures` overflow                                                                | **Fixed**             | Throws `max_signatures`.                                                                                                                 |
| Unshaped idempotency key, prototype hazards                                             | **Fixed / partial**   | The renderer maps a shape failure to `idempotency_key`. The Kalshi profile shapes every key.                                             |
| `deviceSigningBase`                                                                     | **Partial**           | Derived from `coveredComponents`, except `content-type`.                                                                                 |
| `venue_account_not_enabled` mapping                                                     | **Fixed**             | Routes to onboarding.                                                                                                                    |
| `confirmed: true` in onboarding client                                                  | **Argued OK**         | Only in `activate`, where the address was shown on screen.                                                                               |
| Debug email in plain storage, relink skips `createIntent`, `wallet_missing` unreachable | Open                  | Temporary flow, non-blocking.                                                                                                            |

---

## 2. New findings

### Medium

**N1. The two renderers have drifted, and the fixture doesn't cover it.**

- Mobile `venueTemplates.ts` has four rules that predict-api's twin lacks:
  - the malformed decimal-bound error;
  - the `.` / `..` path refusal;
  - the lone-surrogate error;
  - `max_signatures`.
- The twin also uses a plain `{}` for the body, and evaluates invariants on the body object while mobile re-parses the rendered body.
- Both pass today only because the shared fixture has no refusal cases for those rules. ADR-0004 says both renderers follow the same rules, which is not true now.
- Fix: port the rules to predict-api and add the four refusal cases to the fixture. Otherwise drop the "identical twin" claim from the code comment and the ADR.

**N2. The scan window can expire before a stuck order is reconciled.** (backend, `order-commit.service.ts:615`, `signing-profile.ts:347`)

- `min_ts` is `createdAt - 60s` and the profile allows `maxAgeSec: 2400`.
- Once the operation is about 39 minutes old, every scan fails shape validation with 400 `venue_authorization_malformed`. The phone also refuses to sign it.
- The phone's confirmation ledger expires at 30 minutes anyway, so it refuses first.
- The operation stays `reconciliation_required` with no path out.
- The `createdAt` anchor is my O2 fix from review 1. It fixed the re-arm case but doesn't cap the age.
- Fix: terminalise or flag an operation older than the window (for example `needs_manual_review`). Add a test with an operation older than 40 minutes.

**N3. A 409 can loop.** (backend, `order-commit.service.ts:675`, `portfolio.controller.ts:#prepare`)

- Any `venue_authorization_invalid` with non-empty `values` is converted to 409 `venue_step_changed`.
- A wrong key, or a signature that outlives the A2T, then returns the same `next` every time. The phone retries with identical bytes.
- Fix: convert only when the server's values differ from the signed ones, or return the original error when `next` equals what was just signed.

**N4. A re-armed order whose market has closed stays pending forever.** (`order-commit.service.ts:284`)

- It throws `market_not_tradeable` on every call and nothing terminalises it.
- Fix: mark it failed or cancelled with a terminal receipt.

**N5. The demo is not gated for production.** (carried over, see section 4)

### Low

- **N6.** `renderBody` relies on object key order. An integer-like template key would be reordered. Validate key names.
- **N7.** `binary-limit-order-v1` doesn't bound the YES price or require count above 0. The profile's shapes cover this today.
- **N8.** `content-type` in `deviceSigningBase` is still hardcoded.
- **N9.** When the phone locks, background observation of a dispatched order fails with `confirmation` on every poll up to the cap of 12. The order stays ambiguous with no re-prompt. Probably intended, but state it in the ADR and check the UI surfaces it.
- **N10.** The continuation state has no size cap. It goes through Fastify's default 1 MiB body limit. Add a max token length or a DTO `max()` so a huge portfolio gets a clean error.
- **N11.** Document the missing nonce store as an accepted risk.
- **N12.** A retried preview with the same key gets 409. This is documented, and clients must mint a new key.
- **N13.** The migration swaps the index non-concurrently, a brief table lock. Fine at current size.

### Nits

- ADR-0004 line 235 still says the continuation token is HMAC-signed. It is now sealed with AES-256-GCM.
- The two fixture copies differ by prettier formatting only (the parsed JSON is equal). Run the same formatter on both.
- `docs/kalshi-demo-onboarding-review.md` is untracked in predict-api. Don't commit it.
- `orderKey()` inside `useMemo` has a harmless side effect.

### Missing tests

- An operation older than 40 minutes in reconciliation (N2).
- Repeated 409 with identical values (N3).
- A re-armed submit whose market has closed (N4).
- Concurrent overlapping scans counting once.
- A two-profile test for the valuation `#holdingCosts`.
- An oversized continuation token (N10).
- A demo gate or debug panel being off.
- `MAX_COST` / `MIN_PROCEEDS` rendering in the sheet.
- Onboarding log content asserted to carry no bodies or headers.

---

## 3. The new continuation mechanism

- **Format:** the token is AES-256-GCM, carrying `exp`, `expect`, `values` and `state`. It is posted as `{continuation}` in the body.
- **Key:** derived by HKDF from the issuer key with a domain label, so it is separated from signing. Rotating the issuer key only drops in-flight reads.
- **Binding:** the additional authenticated data is `operation:profileId`. Tampering and cross-user or cross-operation use are rejected, and there is a test. The query (limit, sort, status, cursor) is bound inside the state.
- **Expiry:** 10 minutes, and 60 minutes for a next-page token.
- **Replay:** tokens aren't single-use, but the state is the caller's own. The phone still signs each step, and the signature is checked against `expect` and `values`.
- **Logs:** ciphertext in a POST body, so no URL exposure.
- **Open:** the size cap (N10) and the stale ADR wording.

This resolves A6 and A7. Deriving the key from the issuer key is acceptable.

---

## 4. Onboarding (temporary, non-blocking)

- **Worth doing before merge:** the demo gate is always on, the debug panel renders on PredictHome and the Stripe sandbox wallet is signed for every user. Restore a build-time gate for the gate and the panel, and refuse the sandbox address unless the profile authority is the demo host.
- The typed email sits in plain storage and is never cleared.
- Relink skips `createIntent`.
- `wallet_missing` is unreachable.
- Remounting the flow whenever `accountNotEnabled` flips loses in-progress input.
- Routes still use `@VenueOperation` and `calls.prepare`, and `demo-kyc` isolation is unchanged.

---

## Suggested next steps

1. Demo gate and the hardcoded wallet.
2. N3 (409 loop), N2 and N4 (stuck operations).
3. N1 (renderer parity, plus fixture refusals).
4. The remaining tests and the ADR wording fixes.
