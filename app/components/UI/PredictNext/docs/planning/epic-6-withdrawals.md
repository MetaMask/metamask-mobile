# Epic 6 — Withdrawals & High-Risk Authorization

**Outcome:** a user withdraws USDC to their own proven payout wallet on Base,
authorized by a server-verifiable step-up factor, with honest
submitted/processing status until Kalshi's transfer-status endpoint confirms
a terminal state.

**Dependencies:** Epics 4–5 (funded account, write-safety substrate).

**External gates:**

- **Step-up mechanism selection with AppSec** (fresh re-auth / wallet-signed
  challenge / OTP) — gates 6.1 design, not scaffolding.
- **Transfer-status endpoint shape** (Kalshi confirmed availability, shape
  unconfirmed) — gates 6.4 reconciliation details.
- **Ambiguous-commit disambiguation** (idempotency key on withdraw or
  per-user transfer listing) — arguably launch-blocking; until answered,
  lost commits block retry pending manual reconciliation.

**ADR anchors:** `kalshi-funding-rails`, `kalshi-security-trust-model`
(invariants 1, 3).

---

## Stories

### 6.1 — Step-up authorization framework (Story, cross-stack)

- Backend: step-up challenge issue/verify for high-risk operations
  (withdraw commit, payout registration, key mint, identity remap); bearer-
  only sessions rejected (`STEP_UP_REQUIRED`); expiry + replay resistance.
- Mobile: step-up UX rendering the selected factor; wired into the withdraw
  confirmation flow.
- Reused by Epic 7 recovery remap.

### 6.2 — Payout-method registration with proof of wallet control (Story, cross-stack)

- Backend: challenge nonce bound to profile ID + chain + address + expiry;
  verify wallet signature; register only proven addresses with Kalshi
  (Stripe-validated); payout allowlist is the only withdrawal destination
  set.
- Mobile: wallet-sign the challenge via existing signing infra; destination
  selection limited to the user's own wallets.

### 6.3 — Withdraw prepare/confirm/commit vertical (Story, cross-stack)

- Backend: side-effect-free prepare; commit under step-up using an
  **ephemeral transfer-scoped key** (minted under step-up, used once,
  revoked); `transfer_id` stored durably; idempotent commit.
- Mobile: amount/destination UI, explicit confirmation + step-up, submitted/
  processing receipt states.
- **Lost commit response → operation blocked pending manual reconciliation,
  never auto-resubmitted** (until the disambiguation gate resolves).

### 6.4 — Transfer-status reconciliation (Story, backend + mobile)

- Backend polls the transfer-status endpoint (shape TBD) and updates
  operation records; terminal statuses propagate.
- Mobile: withdrawal appears as completed **only** on confirmed terminal
  status; blocked/ambiguous operations surface with a support reference.

### 6.5 — Withdrawal failure-scenario tests (Task, cross-stack)

- Step-up rejected/expired/replayed blocks commit; cross-profile challenge
  replay fails; standing key cannot withdraw (`write::transfer` absent);
  ephemeral key revoked after use; lost commit blocks retry; repeated tap
  cannot double-withdraw; UI never claims completion early.

---

## Exit criteria

- Withdrawal to a proven wallet completes on demo with honest status UX.
- All high-risk operations reject bearer-only sessions.
- The ambiguous-commit branch is exercised and blocks safely.
