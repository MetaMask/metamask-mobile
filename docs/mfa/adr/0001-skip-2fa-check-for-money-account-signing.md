# User-controlled MPC MFA for Money Account signing (`POST /v2/mpc-mfa-enabled`)

Money Account MPC signing normally requires a **2FA** verification claim before the MPC service will sign. Users may **turn MFA off** for MPC signing so that only **1FA** is required on subsequent sign requests. That preference is stored by the MPC service. Changing it is asymmetric: **disabling** MFA requires a **2FA** token; **enabling** MFA requires only a **1FA** token.

Status: proposed, 2026-10-08 (MFA-499). Parent: [MFA-309 Architecture scoping](https://consensyssoftware.atlassian.net/browse/MFA-309). LaunchDarkly product name: **Disable 2FA** (user-facing toggle, not a remote kill switch).

## Context

Money Accounts sign via MPC-backed key material (`personal_sign`, `eth_signTypedData_v1`–`v4`; not EVM transaction signing). The MPC service enforces an assurance level on each signing request:

| User MPC MFA setting | Assurance required for MPC sign |
| -------------------- | ------------------------------- |
| MFA **enabled** (default) | **2FA** — profile verification token (email OTP / passkey) must accompany or satisfy the MPC policy |
| MFA **disabled** | **1FA** — base session / wallet unlock level only; no 2FA claim on each sign |

Profile MFA is implemented client-side through `AuthenticationController` and the MFA kit (`verifyOrEnroll` / `enroll`) on mobile (`feat/mfa-shadow-mode`) and extension. Verification tokens carry JWT claims including `amr`; the MPC service maps token assurance to whether signing proceeds.

Product requirement (**MFA-499**): let the user **disable 2FA for MPC signing** from settings, while making re-enablement easy but **disabling** hard — you must prove 2FA to remove 2FA.

## Decision

### 1. MPC service API (server contract)

Extend the existing endpoint:

```
POST /v2/mpc-mfa-enabled
Content-Type: application/json
Authorization: Bearer <profile access token>
```

**Request body**

```json
{
  "enable": true | false
}
```

| `enable` | Meaning | Authorization on this request |
| -------- | ------- | ------------------------------ |
| `false` | Turn **off** MPC MFA — future MPC signs need **1FA** only | **2FA** verification token (or equivalent AAL2 session the MPC service accepts) |
| `true` | Turn **on** MPC MFA — future MPC signs need **2FA** | **1FA** only (base profile / wallet session) |

The MPC service persists the preference per Money / MPC identity and applies it on every subsequent signing call until changed again. Exact storage and GET semantics are owned by the MPC service; clients need a way to read current state for UI and signing gates (see §3).

**Rejected alternatives**

| Option | Why rejected |
| ------ | ------------ |
| LaunchDarkly `moneyDisable2faForSigning` bypass | Product intent is a **user** setting, not ops rollout; server must enforce assurance |
| Client-only preference in local storage | MPC service would still require 2FA; no reduction to 1FA without server state |
| Same token level for enable and disable | Violates security requirement: disabling MFA must prove 2FA |

### 2. Client flows (Mobile + Extension)

#### 2a. Toggle MFA for MPC signing (settings)

Product surface: **Disable 2FA** (when MFA is on) / enable MFA (when off) under Money or Security settings.

```
User chooses enable or disable
  → Client obtains token at required assurance:
       disable (enable: false) → verifyOrEnroll / 2FA ceremony → 2FA token
       enable  (enable: true)  → existing 1FA session / base auth only
  → POST /v2/mpc-mfa-enabled { enable }
  → On success: refresh cached mpcMfaEnabled state; update UI
  → On failure: show error; do not change local cache
```

`TokenReason.operation` for tracing:

| Action | `operation` |
| ------ | ----------- |
| User disables MPC MFA | `money.mpc_mfa.disable` |
| User enables MPC MFA | `money.mpc_mfa.enable` |

#### 2b. Money Account MPC signing (runtime)

Before each MPC signing request for the Money account, the client must align local MFA UX with the **user’s persisted MPC MFA setting** (from MPC service / cache):

```
resolve mpcMfaEnabled for this Money identity
  → if true:  require 2FA via verifyOrEnroll (or valid cached verification session) before calling MPC sign
  → if false: proceed with 1FA only — do not prompt for 2FA solely for signing
  → invoke MPC sign with tokens the service expects for that assurance level
```

Use stable `operation` ids on any verification step tied to signing:

| Signing method | `operation` |
| -------------- | ----------- |
| `personal_sign` | `money.personal_sign` |
| `eth_signTypedData_v3` | `money.signTypedData.v3` |
| `eth_signTypedData_v4` | `money.signTypedData.v4` |
| (fallback) | `money.sign` |

**Rejected alternatives**

| Option | Why rejected |
| ------ | ------------ |
| Per-flow signing checks without reading MPC MFA state | Drift; signing would still demand 2FA after user disabled MFA |
| Gate only in RPC middleware | Misses controller-initiated Money MPC signs (Card, Rewards, Pay) |

Implement one shared module (e.g. `ensureMoneyAccountMpcSigningAuthorized`) that reads `mpcMfaEnabled` and runs `verifyOrEnroll` only when `true`.

### 3. Client state and cache

| Concern | Approach |
| ------- | -------- |
| Source of truth | MPC service persisted flag (via `POST /v2/mpc-mfa-enabled` and any companion GET or signing metadata the service exposes) |
| UI | Settings toggle reflects last known `mpcMfaEnabled`; disable copy matches product name **Disable 2FA** |
| Cache | In-memory + optional short-lived cache after successful POST or profile fetch; invalidate on sign-out, wallet reset, and failed MPC sign with assurance errors |
| Default when unknown | **Fail safe**: treat as MFA **enabled** (require 2FA for signing) until the client loads explicit `false` from the server |

### 4. Platform scope

| Surface | Responsibility |
| ------- | ---------------- |
| **MPC service** | `POST /v2/mpc-mfa-enabled`, enforcement on sign, token assurance validation |
| **MetaMask Mobile** | Settings UI, POST orchestration, signing gate, API client |
| **MetaMask Extension** | Same behavior and `operation` strings as mobile |
| **`@metamask/core`** | No change unless a shared MPC client module is introduced; controllers stay agnostic |

### 5. Relationship to profile MFA enrollment

Enrolling email OTP / passkey in profile MFA settings is **orthogonal** to MPC MFA **enabled/disabled**:

- A user can have credentials enrolled but **disable** MPC MFA (1FA signing only).
- Re-**enabling** MPC MFA does not require re-enrollment if credentials still exist; signing will again require `verifyOrEnroll` when `mpcMfaEnabled` is `true`.

## Consequences

- **Positive**: User control with correct security asymmetry; server enforces assurance so clients cannot bypass 2FA by toggling local flags alone.
- **Risk**: While MPC MFA is disabled, signing exposure matches 1FA-only threat model; product copy must state that clearly before `enable: false`.
- **Testing**: Contract tests for POST body and auth headers; unit tests on signing gate (`mpcMfaEnabled` true/false/unknown); E2E: disable path shows 2FA, enable path does not, signing without 2FA prompt when disabled.
- **Observability**: Trace `money.mpc_mfa.post` (enable value, success) and `money.mpc_sign.assurance` (required 1fa vs 2fa); never log tokens or OTP.

## Implementation scope (follow-up tickets)

1. **MPC service** — Ship `POST /v2/mpc-mfa-enabled` with `enable: boolean` and assurance rules above; document GET or sign-time hint for current state.
2. **Mobile API layer** — Client for `/v2/mpc-mfa-enabled` and cached `mpcMfaEnabled` selector/store.
3. **Settings UI** — Disable 2FA / Enable MFA toggle with confirmations and copy.
4. **Signing gate** — `ensureMoneyAccountMpcSigningAuthorized` used by all Money MPC sign call sites.
5. **Extension parity** — Same API, settings, and gate.

## Open questions

1. **Read API**: Is there `GET /v2/mpc-mfa-enabled` (or field on an existing Money/MPC profile) for initial UI state?
2. **Response shape**: Success body, error codes when token assurance is insufficient (e.g. 2FA required but 1FA presented).
3. **Propagation delay**: Is the new setting effective immediately on all MPC sign replicas?
4. **Default for existing users**: MFA enabled or disabled before first explicit POST?

## References

- Jira: [MFA-499](https://consensyssoftware.atlassian.net/browse/MFA-499)
- MFA kit (mobile): `app/util/identity/mfa/` on `feat/mfa-shadow-mode`
- `VerificationToken` / `TokenReason`: `@metamask/profile-sync-controller/sdk`
- Money account signing methods: `app/store/migrations/150.ts`
- Example ADR format: `app/components/UI/PredictNext/docs/adr/0001-unified-action-discriminated-order-contract.md`
