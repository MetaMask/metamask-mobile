# Epic 7 — Launch Hardening, Recovery & Rollout

**Outcome:** security/privacy/ops gates pass; recovery paths exist; cohort
rollout executes per the rollout plan.

Runs as a gate lane against every epic's exit rather than a phase at the end;
concentrated stories below are the residue that isn't inside another epic.

**External gates:** AppSec threat model engagement; privacy sign-off
(profile ID sharing); Kalshi support-commitment formalization; backend
SLO/on-call staffing.

**ADR anchors:** `kalshi-account-recovery`, `kalshi-security-trust-model`,
`kalshi-integration-overview` (rollout).

---

## Stories

### 7.1 — Recovery flows (Story, cross-stack)

- Reinstall = non-event (verify at every epic; assert here end to end).
- Pairing-time canonical change (F1): backend detects a stored ID that became
  an alias; audited, rate-limited, alarmed remap via the re-link ceremony
  (email + 2FA), gated by step-up; user-visible remap alerts.
- Honest broken-mapping UX: `ACCOUNT_RECOVERY_REQUIRED` state with guided
  path — never an empty portfolio.
- SRP-loss messaging (F2) documenting the Kalshi-direct/support path.

### 7.2 — Security test battery & threat-model remediation (Story, cross-stack)

- Full authorization suite (cross-user, modified-client eligibility bypass,
  bearer-only high-risk rejection) as CI gates.
- Redaction battery: synthetic secrets/PII across logs, traces, analytics,
  crash reports, snapshots.
- Threat-model findings triaged and P0/P1 remediated.

### 7.3 — Observability, support & ops (Story, backend + ops)

- Dashboards/alerts per route and per operation type; operation-reference
  support tooling (no secrets/PII); runbooks (kill switch, credential
  rotation/revocation, manual withdrawal reconciliation, remap procedure);
  SLO + on-call.

### 7.4 — Rollout execution (Task, cross-stack)

Per the rollout ladder: internal → demo validation → read-only cohort →
setup/deposit cohort → order cohort → withdraw cohort → broad, with gate
reviews (security, privacy, compliance, support) between rungs. Kill-switch
drill before the first external cohort.

---

## Exit criteria

- Every trust-model invariant has an enforcing test or control in CI/infra.
- Recovery paths demonstrated on demo (re-link spike results incorporated).
- Rollback drill: Kalshi disabled without touching Polymarket.
