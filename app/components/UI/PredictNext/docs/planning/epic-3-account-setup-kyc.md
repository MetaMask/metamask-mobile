# Epic 3 — Account Setup & KYC (gated lane)

**Outcome:** a new user completes Kalshi onboarding from the app: consent →
account create/link → profile submission (Encrypted Passthrough) → KYC
verification → approved readiness. An existing Kalshi user links instead of
creating.

**External gates (why this is its own lane):**

- **Legal ruling** on the cryptographically-blind ciphertext-relay posture — gates the PII path entirely.
- **Kalshi encryption public-key mechanism** (provenance, scheme, rotation/versioning, timeline); no per-session key is required.
- **Privacy sign-off** on raw canonical profile ID vs. a deterministic per-ISV pseudonym for Kalshi.
- **Socure SDK** access/credentials for client-direct L2.

The stories are ordered so everything _around_ the encrypted-PII path builds
now against demo (which has test-bypass OTP/KYC), and the gated crypto core
drops in when cleared.

**ADR anchors:** `kalshi-kyc-pii-flow`, `kalshi-identity`,
`kalshi-security-trust-model` (invariants 2–4).

**Product spec (ported from PRED-842, cancelled):** onboarding is a bespoke
7-screen flow — education 1–4 (all users, first visit only), account setup
5–6 (Kalshi/US only: email + OTP on screen 5 with existing-account link
variant; profile + SSN + phone OTP on screen 6 with auto KYC submission),
completion screen 7. “Skip for now” available until trade initiation, which
re-launches at account setup without re-showing education. KYC prompt =
dismissible feed banner + trade-initiation gate; browsing never gated.
Approved/pending/rejected outcomes per PRED-842 (pending → inline wait +
push/badge; rejected → failed-field enums, correct and resubmit).
Metric targets: education completion ≥60%, KYC completion ≥50%.

---

## Stories

### 3.1 — Setup workflow engine (Story, cross-stack) — unblocked

- Backend: durable Account Setup operation records; canonical step
  projection (`AccountSetupStep`); new-user vs existing-user-link branching;
  the two 409 variants (flat `account_exists` → link; nested duplicate
  `external_user_id` → error) distinguished; lost-response resume uses the
  documented durable response where available and otherwise enters support.
- Mobile: setup capability on the adapter; `AccountSetupState` projection;
  step-driven setup UI shell (`status_wait`, `complete`, error states);
  resume after app restart.
- Demo-environment end-to-end using test-bypass values, stubbing the profile
  step.

### 3.2 — Consent screen (Story, mobile + product) — unblocked

- Data-privacy consent naming **Kalshi and Socure**, shown before any PII
  collection; copy with legal/product.
- Blocking: no setup step beyond create can start without recorded consent.

### 3.3 — OTP steps (Story, cross-stack) — partially gated

- Email/phone OTP UI (`email_otp`/`phone_otp` with obfuscated destinations),
  combined invalid-or-expired handling, resend.
- **Open ADR question:** whether OTP transits the relay encrypted or is
  restructured Kalshi-owned — build the UI now against demo bypass values;
  transport finalizes with the encryption scheme.

### 3.4 — KYC form UI with transient-PII rules (Story, mobile) — unblocked

- Native profile form (name, DOB, address, phone, SSN) with AppSec
  transient-exposure rules: no Redux, no persistence, no analytics/crash
  breadcrumbs, screenshot/app-switcher/keyboard/autofill/clipboard policy.
- Synthetic-PII redaction tests wired into CI from the first commit.
- Form ends at an `encrypt(payload)` seam — implementation arrives in 3.5.

### 3.5 — Encrypted Passthrough core (Story, cross-stack) — **gated**

- Mobile: fetch + authenticate the Kalshi encryption public key (attributable
  to Kalshi — pinning/attestation), on-device encryption, ciphertext binding
  (user/endpoint/freshness, replay + cross-user substitution resistance).
  Evaluate native vs. JavaScript-level encryption for sensitive-buffer
  handling and representative-device performance.
- Backend: ciphertext relay (sizes/status logging only, no ciphertext
  persistence beyond delivery), orchestration IDs injected server-side from
  the JWT-derived canonical profile ID, admin-signed calls to Kalshi.
- Response-path PII enumeration (`obfuscated_email` etc.).
- Joint AppSec review of the scheme is an acceptance criterion.

### 3.6 — KYC status projection & readiness integration (Story, cross-stack) — unblocked

- Backend persists only the bounded projection (`last_step`,
  `digital_verification_status`, `digital_verification_result`, derived
  approval); status route + fixtures.
- Mobile: pending/rejected/approved readiness states; `KYC_REJECTED`
  unavailable state; pending resume.
- Per-user key mint on approval (backend; `read`/`write` scopes only — never
  `write::transfer`), one-time key receipt handling, list/revoke/remint
  recovery.

### 3.7 — Socure L2 client-direct integration (Story, mobile) — **gated**

- Socure SDK integration for document/selfie capture, client → Socure
  directly; validate binary/bundle size, React Native compatibility,
  permissions, telemetry/logging defaults, and verify traffic does not transit
  any MetaMask-controlled proxy/logging.
- Trigger handling at signup and (later) withdrawal; consent copy names
  Socure.
- **Scope conflict to resolve first:** PRED-842 declared no document upload /
  Socure embed in v1 (rejections return failed-field enums only), while the
  KYC ADR specifies client-direct Socure for L2 step-up. Confirm with
  product + Kalshi whether L2 is launch scope before building.

### 3.8 — Education screens 1–4 + completion screen (Story, mobile + content) — unblocked

- The four education screens (what is Predict / how markets work / how to
  trade / how you get paid) and the “you're all set” completion screen, per
  the PRED-842 spec: dismissible, progress indicator, shown once, content
  design owns copy.
- Provider-aware: Polymarket users go 1ℴ4→7; Kalshi users continue into the
  setup screens (3.1–3.6).
- KYC prompt banner on the feed (dismissible, re-surfaces at trade
  initiation).

---

## Exit criteria

- New-user and link paths complete on demo end to end.
- Encrypted Passthrough passes AppSec review; L2 isolation verified.
- Synthetic PII provably absent from state/storage/logs/analytics/traces.
- Duplicate requests cannot create a duplicate user, key, or setup operation.
