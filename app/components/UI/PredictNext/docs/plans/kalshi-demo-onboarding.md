# Kalshi demo onboarding (temporary): mobile plan

- **Status:** Proposed
- **Date:** 2026-10-26
- **Scope:** Kalshi **demo** only. Unblocks balance and trading work until KYC designs and the real onboarding flow exist. Delete it then (§11).
- **Server plan:** `va-mmcx-predict-api/docs/KALSHI_DEMO_ONBOARDING_PLAN.md`. Read §2 (why email alone isn't enough, why no mapping table), §3 (gotchas), §6 (routes) and §9 (error codes) there. Section numbers below prefixed **S** refer to it.
- **Builds on:** [`kalshi-request-signing.md`](./kalshi-request-signing.md) (signer, envelope, allowlist, rules), `auth/kalshiDeviceKey.ts`, `auth/a2tSession.ts`.

## 1. What the user sees

On entering Predict, if the MetaMask profile is not yet activated on Kalshi, a minimal modal opens over the Predict home screen:

1. **Email.** "Link a Kalshi demo account". One email field. _Continue_. _Not now_ closes it until the next time Predict is opened.
2. **Code.** "Enter the code Kalshi sent". One code field, prefilled with `888888` on demo and editable. _Verify_. _Resend_ calls `link` again.
3. **Working.** Spinner while the server runs demo KYC (new users only) and the phone waits for approval.
4. **Wallet.** "Withdrawal wallet: `0x…` on Base". _Activate_. By default this is the selected EVM account's address, EIP-55 checksummed (Kalshi requires a checksummed address, spec §6.7). `MM_PREDICT_KALSHI_DEMO_PAYOUT_WALLET` overrides it when Kalshi demo rejects real addresses (§7). It is shown because `wallet/register` binds the withdrawal destination, and the signing rules require an on-screen confirmation for it (signing plan §4).
5. **Done.** The modal closes. Balance and portfolio queries are invalidated.

Errors show one line of copy and either _Try again_ or _Close_ (§6). No designs exist; use existing design-system components only (`docs/ui-components.md`). No new core UI.

The user never chooses "existing" or "new" account. Kalshi decides after `link/verify` (S§2), and the phone follows the returned `state`.

## 2. Dependencies

In order. Each is a separate PR.

1. **Request signer and envelope** — signing plan §9 steps 1–2: `auth/kalshiRequestSigner.ts`, `auth/kalshiDeviceAuthEnvelope.ts`, `auth/kalshiAuthority.ts`, `auth/signing/venueRequest.ts`, and the shared fixture. Onboarding is the first consumer, so these land before trading needs them.
2. **predict-api foundation PR and onboarding routes** (S§4, S§6).
3. **This plan.**

Already in place on `p-256-keys`: device key and salt (`KalshiDeviceKeyBootstrap`), A2T session (`KalshiA2tSessionBootstrap`).

## 3. State machine

The phone keeps flow state in memory only. On every entry it asks the server (`GET onboarding/status`) and resumes from there.

| Server `state`                      | Phone step                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `active`                            | Close the modal. Done.                                                                |
| `none`, `link_pending`, `cancelled` | Email (1). Create a new intent first.                                                 |
| `kyc_pending`                       | Working (3): call `demo-kyc`, then poll `status`.                                     |
| `kyc_review`                        | Working (3): poll `status` only. Give up after 2 min with _Close_.                    |
| `approved`                          | Wallet (4). Activate at once. Approval for an existing member lasts ≤ 15 min (S§3.2). |
| `unsupported`, `inconsistent`       | Error: "This account can't be linked in the demo flow." _Close_.                      |

Transitions inside one session:

```text
email ──► POST intents {key₁} ──► POST link {email, key₂} ──► code
code  ──► POST link/verify {code, key₃} ──► GET status
            ├─ approved     ──► wallet
            ├─ kyc_pending  ──► POST demo-kyc ──► GET status (poll 2 s, ≤ 60 s) ──► wallet
            └─ other        ──► §6
wallet ──► POST activate {wallet, network, key₄} ──► GET status ──► active ──► done
```

Idempotency keys (UUID v4):

- `key₁` (intent): created once per _Continue_ from the email step. Kept in memory and reused on network retries, so a retry recovers the same intent (§5.6 of the Kalshi spec). A new key is created only when the flow restarts from `none`/`cancelled`, which supersedes any live intent on purpose.
- `key₂`, `key₃`, `key₄`: one per logical action (each _Continue_, _Verify_, _Resend_, _Activate_), reused on a network retry of that same action.
- Never persisted. Cleared with the flow.

Every retry gets a fresh request id and signature (signing plan rule 2). The A2T is ensured valid for ≥ 70 s before each signing (`a2tSession.ensureA2T()`).

## 4. Signing

### 4.1 Allowlist rows

Added to `contracts/v1/fixtures/kalshi-signing-v1.json` (shared with predict-api) and to the read and onboarding policies. Paths under `/trade-api/v2`.

| ref                  | Method + path                         | Body (exact)                                    | Check before signing                                                                                                                                         |
| -------------------- | ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `balance`            | `GET /portfolio/balance`              | —                                               | none (already in signing plan §4)                                                                                                                            |
| `enrollment_current` | `GET /isv/enrollment/intents/current` | —                                               | none                                                                                                                                                         |
| `enrollment_intent`  | `POST /isv/enrollment/intents`        | `""`                                            | only from the email step                                                                                                                                     |
| `link`               | `POST /isv/users/link`                | `{"email":"<typed>"}`                           | email equals the field value after trim                                                                                                                      |
| `link_verify`        | `POST /isv/users/link/verify`         | `{"code":"<typed>"}`                            | code equals the field value                                                                                                                                  |
| `wallet_register`    | `POST /isv/wallet/register`           | `{"wallet_address":"<addr>","network":"<net>"}` | address equals the selected EVM account address or the env override, network equals config, both equal what is on screen. Signed only on the _Activate_ tap. |

The phone sends the business fields first, with the MetaMask bearer and no `Kalshi-Device-Auth` header. predict-api answers `428 venue_signature_required` with `authority` and `requests`. Each request is the structured call it will relay (`ref`, method, path, query, and for a mutation the exact body, idempotency key, components, content digest, and content type).

`auth/signing/kalshiOnboardingPolicy.ts` accepts that list only when every entry equals a request `kalshiOnboardingTemplates.ts` built from the phone's own inputs, and `authority` is `demo-api.kalshi.co`. The signer then builds the signing base from those phone-built requests. A mismatch signs nothing. The signed call is the same route, once. A second `428` is an error.

`/isv/users/link/challenge`, the KYC admin routes, deposits and withdrawals are **not** signable. The KYC routes are admin-key calls on the server and never need a device signature.

### 4.2 Which signatures each call carries

| Call                          | Signatures in `Kalshi-Device-Auth` |
| ----------------------------- | ---------------------------------- |
| `GET onboarding/status`       | `balance`, `enrollment_current`    |
| `POST onboarding/intents`     | `enrollment_intent`                |
| `POST onboarding/link`        | `link`                             |
| `POST onboarding/link/verify` | `link_verify`                      |
| `POST onboarding/demo-kyc`    | none (bearer only)                 |
| `POST onboarding/activate`    | `wallet_register`                  |

Signature lifetime 60 s, signed at send time.

## 5. Code

Follow `docs/module-structure.md`. A new feature owner, `onboarding/`, with a deliberately small public API.

| File                                                                                         | Contents                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth/signing/kalshiOnboardingTemplates.ts`                                                  | Builders for the §4.1 refs. Body via `JSON.stringify` of an object literal in fixed key order. Tested against fixture golden bytes.                      |
| `auth/signing/kalshiOnboardingPolicy.ts`                                                     | `checkOnboardingSigningRequest(required, expected, authority)`. Accepts a 428 only when each call equals one the phone built. Pure.                      |
| `auth/kalshiRequestSigner.ts`, `auth/kalshiDeviceAuthEnvelope.ts`, `auth/kalshiAuthority.ts` | Signing base, envelope, and the demo `@authority` constant. Onboarding is their first caller.                                                            |
| `contracts/v1/onboarding.ts`                                                                 | superstruct schemas: status `{ state, intentStatus?, expireTs? }` (unknown `state` → `unsupported`), intents, verify, demo-kyc and activate responses.   |
| `adapters/remote/KalshiOnboardingClient.ts`                                                  | The six routes. Sends the business body, handles one 428, signs, retries. `demo-kyc` is bearer only.                                                     |
| `onboarding/index.ts`                                                                        | Exports `KalshiDemoOnboardingGate` only.                                                                                                                 |
| `onboarding/KalshiDemoOnboardingGate.tsx`                                                    | Renders children. When enabled (§7) and the A2T is ready, queries status once per mount of the Predict stack. Opens the modal when `state !== 'active'`. |
| `onboarding/internal/useKalshiDemoOnboarding.ts`                                             | The §3 state machine (`useReducer`). Owns idempotency keys and the poll loop. Clears on unmount, wallet lock and A2T clear.                              |
| `onboarding/internal/KalshiDemoOnboardingModal.tsx`                                          | The five steps in §1. Presentational.                                                                                                                    |
| `queries/portfolioQueries.ts`                                                                | `portfolioQueryFamilies` already exports the prefixes. The gate invalidates balance, positions and activity after activation.                            |
| `navigation/PredictNextStack.tsx`                                                            | Wrap the navigator in `<KalshiDemoOnboardingGate>` inside `KalshiA2tSessionBootstrap`.                                                                   |

Status is read by the state machine on mount, not by a React Query cache. The flow is in memory and ends when the sheet closes.

## 6. Errors

Branch on the response `code` (S§9), never on message or status alone.

| Code                                                                                                                         | Copy                                                                                     | Action                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `onboarding_code_incorrect`                                                                                                  | "That code didn't work."                                                                 | Stay on code step. _Resend_ available.                                                                  |
| `onboarding_intent_missing`, `onboarding_conflict`, `onboarding_not_approved`                                                | "Your link request expired. Start again."                                                | Back to email; new `key₁`.                                                                              |
| `onboarding_signup_incomplete`                                                                                               | "Finish signing up on Kalshi demo first."                                                | _Close_.                                                                                                |
| `onboarding_user_blocked`, `onboarding_user_deactivated`                                                                     | "This Kalshi account can't be linked."                                                   | _Close_.                                                                                                |
| `onboarding_phone_matched_existing`, `onboarding_kyc_rejected`, `onboarding_kyc_not_approved`, `onboarding_profile_rejected` | "We couldn't create a demo account for this email. Try an existing Kalshi demo account." | Back to email.                                                                                          |
| `onboarding_wallet_invalid`                                                                                                  | "Kalshi demo rejected this wallet address."                                              | _Close_. Logger.error. Set `MM_PREDICT_KALSHI_DEMO_PAYOUT_WALLET` and retry within the approval window. |
| `onboarding_not_ready`                                                                                                       | "Something went wrong."                                                                  | _Try again_, which reads status. Demo KYC ran before the intent was `KYC_PENDING`.                      |
| `onboarding_not_found`                                                                                                       | "Demo sign-up isn't available right now."                                                | _Close_. The server did not register `demo-kyc`.                                                        |
| `onboarding_rate_limited`                                                                                                    | "Try again in a moment."                                                                 | Disable buttons for `Retry-After`.                                                                      |
| `onboarding_unavailable`, `venue_auth_rejected`, `onboarding_venue_error`                                                    | "Something went wrong."                                                                  | _Try again_ (same idempotency key).                                                                     |
| `venue_auth_invalid`                                                                                                         | —                                                                                        | `a2tSession.invalidate(token)`, re-issue, retry once, then generic.                                     |
| `venue_signature_required`, `venue_auth_malformed`, `onboarding_bad_request`                                                 | "Something went wrong."                                                                  | _Close_. Our bug; Logger.error with the code only.                                                      |
| HTTP `401`                                                                                                                   | —                                                                                        | Existing `UNAUTHENTICATED` handling (MetaMask session).                                                 |

Local policy failure: sign nothing, generic copy, log the rule id only.

## 7. Gating and config

The gate renders the modal only when **all** hold:

- `isKalshiDeviceKeyEnabled(config)`, signed in, wallet unlocked, A2T ready.
- `MM_PREDICT_KALSHI_DEMO_ONBOARDING === "true"` (build env, read once). Not a remote flag: this flow must never reach production builds.
- `kalshiAuthority` for the current build is `demo-api.kalshi.co`.

**`@authority`.** The demo constant in `auth/kalshiAuthority.ts` is `demo-api.kalshi.co`. Confirmed, so the server plan's §10.1 probe is closed. It has to equal the server's `KALSHI_DEVICE_AUTHORITY`. Otherwise predict-api's own verification fails first, with `403 venue_auth_invalid`.

**Payout wallet.** Kalshi validates the activation address with Stripe, its own payout provider. On demo, Stripe runs in sandbox mode and may reject real addresses (Kalshi spec A.7). We start with the user's own address and fall back to an override. The server plan's §10.2 lists the candidates to try.

Build env additions in `.js.env.example`:

```sh
# Temporary Kalshi demo onboarding modal. Demo builds only.
# export MM_PREDICT_KALSHI_DEMO_ONBOARDING="true"
# Optional. Overrides the activation wallet if Kalshi demo rejects real addresses
# with payout_method_invalid. See predict-api KALSHI_DEMO_ONBOARDING_PLAN.md §10.2.
# export MM_PREDICT_KALSHI_DEMO_PAYOUT_WALLET="0x1234567890abcdef1234567890abcdef12345678"
# export MM_PREDICT_KALSHI_DEMO_PAYOUT_NETWORK="base"
```

## 8. Security and privacy

- Email and code live in component state only. Never in Redux, persisted storage, logs, analytics, Sentry breadcrumbs or fixtures (`AGENTS.md`). Tests use obviously fake values.
- Idempotency keys and flow state are in memory and cleared on wallet lock, A2T clear and SRP change (same hooks as `a2tSession.clear()`).
- The phone never receives or sends a Kalshi `user_id`. The server drops it (S§6).
- `wallet_register` is the only signature here that commits something lasting (the withdrawal binding). It is signed only on the _Activate_ tap, only for the user's address or the env override, and only after that address is on screen.
- Linking an account that another MetaMask profile already uses **moves** it to this profile and triggers a verification step-up at Kalshi (S§3.1). The email step shows a one-line note: "Use your own Kalshi demo account. Linking moves it from any other MetaMask profile."

## 9. Tests

- **Templates and policy:** fixture-driven golden bytes for every §4.1 row, plus one mutation per field (other email, other code, other wallet, extra key, reordered keys, whitespace). Assert `signWithKalshiDeviceKey` is never called on a policy failure.
- **State machine:** reducer table test for every server `state` and every §6 code. Idempotency key reused on retry of the same action and fresh on a new action. Restart from `cancelled` creates a new `key₁`.
- **Gate (component-view, `tests/component-view/renderers/predictNext.ts`):** no modal when status is `active`. Modal on `none`. _Not now_ hides it until remount. No status request when the env flag is off or the wallet is locked.
- **Adapter:** each call carries exactly the §4.2 signatures. A `428` on an onboarding route surfaces as an error without re-signing.
- **Manual on demo:** Path B with your own demo Kalshi account. Path A with a fresh email. Kill the app mid-flow and reopen: resumes from `status`. Reinstall: `status` is `active` with the new device key.

## 10. Out of scope

Real KYC screens (profile, phone, documents), phone-match continuation (`link/challenge`, `link_proof`), choosing a real withdrawal wallet, relinking UX, funding, employment, market restriction checks. The modal is not reachable outside Predict.

## 11. Replacement path

When designs land:

- Keep: templates, policy rows, adapter methods, contracts, error codes, the status-driven state machine.
- Replace the modal and gate with the designed onboarding screens, and replace the `demo-kyc` step with real KYC steps (server plan S§12).
- Replace the configured sandbox wallet with a user-chosen wallet on a dedicated confirmation screen.
- Delete `MM_PREDICT_KALSHI_DEMO_*` and `onboarding/internal/*Demo*`.

## 12. Open questions

1. **Where onboarding sits in the final product.** Blocking modal on entry vs. on first trade or deposit. For the demo it is on entry and dismissible.
2. **Code prefill.** Does `888888` work for existing demo accounts with SMS or authenticator MFA (server Q2)? If not, those users type their real code; the field is already editable.
3. **Demo wallet.** Settled empirically (server §10.2). Ask Kalshi only if no candidate works.
