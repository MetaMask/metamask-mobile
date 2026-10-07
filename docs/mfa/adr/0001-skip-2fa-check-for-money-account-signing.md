# Skip MFA verification for Money Account signing when `moneyDisable2faForSigning` is enabled

When the remote flag `moneyDisable2faForSigning` is on, Money Account signing must proceed without calling the MFA kit (`verifyOrEnroll`) or attaching a verification token to the signing request. When the flag is off, signing must obtain a fresh verification token (2FA claim) through the MFA kit before the Money keyring signs. The gate lives in one shared client helper so every Money signing call site stays consistent across mobile and extension.

Status: proposed, 2026-10-07 (MFA-499). Parent: [MFA-309 Architecture scoping](https://consensyssoftware.atlassian.net/browse/MFA-309).

## Context

MetaMask is rolling out profile MFA (email OTP and passkey) through `AuthenticationController` and the client MFA kit (`verifyOrEnroll` / `enroll`). Sensitive operations will require a verification token whose JWT claims include `amr` (authentication method references) proving the user completed 2FA.

Money Accounts sign messages only — `personal_sign` and `eth_signTypedData_v1`–`v4`. They do not sign EVM transactions (`eth_signTransaction` was removed from the Money keyring). Today, representative call sites include:

- Card delegation and allowance flows (`CardController`)
- Rewards / sweepstakes Money Account binding (`RewardsController`, `personal_sign`)
- Money deposit and relay flows that sign typed data or messages with the Money signer
- Future first-party flows that route signing through the Money account address

The MFA kit on mobile (`feat/mfa-shadow-mode`) and the matching extension kit are the only supported way for product code to obtain a verification token. `TokenReason.operation` tags each MFA ceremony for tracing (for example `money.personal_sign`, `money.signTypedData`).

Product needs a **kill switch** to bypass the 2FA claim requirement for Money Account signing during rollout, QA, incident response, and cohorts where MFA is not yet enabled. The LaunchDarkly product name is **Disable 2FA**.

## Decision

### 1. Remote feature flag

| Field | Value |
| ----- | ----- |
| LaunchDarkly key | `moneyDisable2faForSigning` |
| Shape | Version-gated: `{ "enabled": boolean, "minimumVersion": string }` |
| Default (production) | `enabled: false` |
| Evaluated via | `validatedVersionGatedFeatureFlag` in a selector (see `docs/readme/version-gated-feature-flags.md`) |

**Semantics**

- `enabled: false` (default): Money Account signing **requires** MFA verification when the profile has an active MFA credential enrolled. If no credential is enrolled, existing `verifyOrEnroll` behavior applies (setup + verify as needed).
- `enabled: true`: Money Account signing **skips** the MFA verification step entirely. No verification token is requested, shown, or forwarded to downstream APIs.

The flag is a **client-side bypass of the MFA gate only**. It does not change server-side policy; backends that independently require an MFA token must continue to enforce that policy and will reject unsigned requests.

### 2. Single signing gate (client)

Introduce one shared helper used by every Money Account signing entry point:

```
ensureMoneyAccountSigningAuthorized({ operation, methods?, verifyWith?, maxSessionAgeMs? })
  → void   // proceeds when authorized
  → rejects with MfaFlowError when the user cancels or verification fails
```

**Algorithm**

1. If `selectMoneyDisable2faForSigningEnabled` is `true`, return immediately (no MFA UI, no token).
2. Otherwise call `verifyOrEnroll` with:
   - `reason.operation` set to the stable operation id (see table below)
   - `methods` / `verifyWith` from the caller or the Money signing defaults (`email_otp` at minimum; passkey when the platform adapter is available)
   - `maxSessionAgeMs` from the caller when the downstream API requires a fresh token
3. On success, discard the token unless a caller explicitly needs to forward it to an API. The gate exists to prove the user passed 2FA before local signing; most flows only need the ceremony, not the JWT.

**Rejected alternatives**

| Option | Why rejected |
| ------ | ------------ |
| Per-flow `if (flag)` at each call site | Drifts quickly; easy to miss a new Money signing path |
| Gate inside `MoneyKeyring` / `@metamask/eth-money-keyring` | Mixes key material with profile MFA UX; keyring packages must stay UI-agnostic |
| Gate only in RPC middleware | Misses direct controller-to-keyring signing (Card, Rewards, Pay) that never touches RPC |
| Server-only flag | Does not remove client MFA friction; product requirement is to skip the on-device 2FA prompt |

### 3. Stable `operation` identifiers

Use dotted, lower-case names for `TokenReason.operation` and analytics:

| Signing method | `operation` value |
| -------------- | ----------------- |
| `personal_sign` | `money.personal_sign` |
| `eth_signTypedData` / `_v1` | `money.signTypedData.v1` |
| `eth_signTypedData_v3` | `money.signTypedData.v3` |
| `eth_signTypedData_v4` | `money.signTypedData.v4` |
| Unknown / internal composite | `money.sign` (fallback; prefer a specific id) |

Callers pass the most specific operation id they know. The gate must not invent new ids per screen.

### 4. Platform scope

| Surface | Owner | Notes |
| ------- | ----- | ----- |
| MetaMask Mobile | Money + Identity | Selector under `app/selectors/featureFlagController/moneyAccount/` or `app/lib/Money/feature-flags.ts`; gate under `app/lib/Money/` or `app/util/identity/mfa/` |
| MetaMask Extension | Money + Identity | Mirror flag selector and gate; keep `operation` strings identical for cross-client tracing |
| `@metamask/core` controllers | N/A for this flag | Controllers remain agnostic; clients wrap signing |

### 5. Interaction with `isMfaKitEnabled`

`isMfaKitEnabled` (non-prod / non-beta build gate for MFA screens) is **orthogonal** to `moneyDisable2faForSigning`:

- When the MFA kit is disabled for the build, Money signing behaves as today (no MFA prompt). Do not conflate this with the remote kill switch.
- When the MFA kit is enabled and `moneyDisable2faForSigning` is `false`, apply the full verification gate.
- When both are enabled, the remote flag wins for Money signing only.

## Consequences

- **Positive**: One flag controls rollout risk; incident response can disable client-side 2FA for Money signing without redeploying every call site. Operation ids give consistent Sentry / product analytics.
- **Negative**: While the flag is `true`, Money Account signing relies on device unlock and existing Money permissions only — equivalent to pre-MFA behavior. Must not be left enabled in production without explicit approval.
- **Testing**: Unit-test the gate (flag on → no `verifyOrEnroll`; flag off → `verifyOrEnroll` called with correct `operation`). Integration tests mock the MFA adapter. E2E covers one representative Money signing flow per platform with flag on and off.
- **Observability**: Log / trace `money.mfa_gate.skipped` vs `money.mfa_gate.verified` with `operation` and flag state (never log tokens or OTP).

## Implementation scope (follow-up tickets)

Not in MFA-499; listed here to bound work:

1. **Flag plumbing** — Add `moneyDisable2faForSigning` to the feature-flag registry, LaunchDarkly, and `selectMoneyDisable2faForSigningEnabled`.
2. **Signing gate module** — Implement `ensureMoneyAccountSigningAuthorized` and unit tests.
3. **Call-site migration** — Wrap Money signing in Card, Rewards, Pay/deposit, and any other Money signer usages identified by code search for `MoneyAccount` + `sign`.
4. **Extension parity** — Same flag and gate in extension Money signing paths.
5. **QA presets** — Extend MFA QA presets (shadow mode) with a “Money sign with flag off/on” scenario.

## Open questions

1. **Server coupling**: Do any Money APIs already require forwarding the verification JWT on sign requests? If yes, `moneyDisable2faForSigning` cannot bypass server checks — document per endpoint.
2. **Credential absence**: Confirm product behavior when MFA is mandated globally but the user has no enrolled credential and the disable flag is off (expected: enrollment flow via `verifyOrEnroll`).
3. **Session freshness**: Some APIs may require `maxSessionAgeMs` stricter than the default verification session TTL; callers must pass through explicit limits.

## References

- MFA kit (mobile): `app/util/identity/mfa/` on `feat/mfa-shadow-mode`
- `VerificationToken` / `TokenReason`: `@metamask/profile-sync-controller/sdk`
- Money account methods migration: `app/store/migrations/150.ts`
- Version-gated flags: `docs/readme/version-gated-feature-flags.md`
- Example ADR format: `app/components/UI/PredictNext/docs/adr/0001-unified-action-discriminated-order-contract.md`
