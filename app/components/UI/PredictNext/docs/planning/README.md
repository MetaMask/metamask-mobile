# Kalshi Delivery Plan — Working Draft

Local working draft of the epic/story breakdown for the Kalshi integration.
Jira: these will become Epics → Stories/Tasks/Spikes under the Predict initiative
in `PRED` once we're ready to create them. Until then, this directory is the
source of truth and is expected to churn.

Governed by the Kalshi ADR set (see [README — Governing ADRs](../../README.md#governing-adrs))
and sequenced against [migration/kalshi-first.md](../migration/kalshi-first.md).

## Principles

- **Vertical slices, full stack.** Every story that can be vertical is vertical:
  mobile + Predict API + backend Kalshi adapter land together behind one
  demoable outcome. Foundation work (types, fixtures, scaffolding) is built
  inside the slice that first needs it, not as standalone "foundations" epics.
- **Read-only before authenticated, authenticated before regulated.** The
  externally gated work (legal ruling on KYC posture, Kalshi session-key
  endpoint, transfer-status shape, step-up mechanism) is isolated in its own
  epics so nothing upstream waits on it.
- **Backend is ours.** The same team builds the Predict API. Backend stories
  live in the same epics as their mobile counterparts.

## Epics

| #   | Epic                                                                     | Outcome                                                                   | External gates                                                             |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | [Walking Skeleton — Read-Only Market Data](./epic-1-walking-skeleton.md) | Browse Kalshi events/prices end to end through the Predict API            | none                                                                       |
| 2   | [Identity & Authenticated Reads](./epic-2-identity-auth.md)              | Authenticated user resolves to canonical profile ID; readiness read works | none (identity docs published)                                             |
| 3   | [Account Setup & KYC](./epic-3-account-setup-kyc.md)                     | New user completes Kalshi onboarding + KYC from the app                   | legal ruling, Kalshi session-key endpoint, Socure SDK access               |
| 4   | [Deposits & Balance](./epic-4-deposits-balance.md)                       | Base USDC deposit lands in the venue account; balance visible             | demo crypto-rail enablement                                                |
| 5   | [Trading & Portfolio](./epic-5-trading-portfolio.md)                     | Immediate order placed; positions/activity reconcile from fills           | KYC'd demo account                                                         |
| 6   | [Withdrawals & High-Risk Authorization](./epic-6-withdrawals.md)         | Withdrawal to a proven payout wallet with honest status UX                | transfer-status shape, step-up mechanism (AppSec), ambiguous-commit answer |
| 7   | [Launch Hardening & Rollout](./epic-7-launch-hardening.md)               | Security/privacy gates pass; cohort rollout; recovery UX                  | threat model, privacy sign-off                                             |

Jira epic keys: Epic 1 = PRED-1158, Epic 2 = PRED-1159, Epic 3 = PRED-1160,
Epic 4 = PRED-1161, Epic 5 = PRED-1162, Epic 6 = PRED-1163, Epic 7 = PRED-1164.
Stories/tasks/spikes: PRED-1165…1172 + spikes PRED-1206/1207/1210 (Epic 1),
PRED-1173…1177 (Epic 2), PRED-1178…1185 + spike PRED-1208 (Epic 3),
PRED-1186…1190 (Epic 4), PRED-1191…1195 (Epic 5), PRED-1196…1200 + spike
PRED-1209 (Epic 6), PRED-1201…1204 + spike PRED-1205 (Epic 7).

[Spikes](./spikes.md) are tracked separately and feed the epics above.

## Sequencing

```text
Epic 1 ──► Epic 2 ──┬──► Epic 3 (gated lane: KYC)
                    ├──► Epic 4 ──► Epic 5 ──► Epic 6
                    └──► spikes (re-link, encryption scheme, demo validation)
Epic 7 runs as gates against every epic's exit, concentrated at the end.
```

Epics 3 and 4/5 parallelize after Epic 2: deposits/trading develop against a
pre-KYC'd demo account while the KYC flow waits on its external gates.

## Start-right-away set

Unblocked today, in order:

1. Epic 1 in its entirety (all stories).
2. Epic 2 in its entirety (identity-platform docs are published; pairing
   semantics are documented).
3. Epic 3: consent screen design, setup workflow skeleton, OTP/step UI against
   demo — everything except the encrypted-PII path itself.
4. Spikes: demo re-link semantics, demo API validation, contract tooling choice.

## Ported context from superseded epics

PRED-953, PRED-842, and PRED-1097 (cancelled, superseded by this structure)
contribute product decisions that remain in force:

- **Provider switching is settings-only** (PRED-953): no venue toggle in feed,
  portfolio, market detail, or onboarding. Switch is a global context reset
  with a visible transition state; user-changed selection persists across
  sessions and is re-validated against eligibility on app open.
- **Ineligibility copy speaks to residency**, not momentary location
  (“Kalshi is only available to US residents”); shown in settings at switch
  time and at action initiation — never on the main feed.
- **KYC prompting is contextual** (PRED-953/842): dismissible banner on the
  feed for unverified US users; re-surfaces at trade initiation; browsing is
  never gated.
- **Onboarding is a bespoke 7-screen flow** (PRED-842): education screens 1–4
  for all users, account setup screens 5–6 for Kalshi/US only, completion
  screen 7. Education shows once; returning users re-enter at account setup.
- **Kalshi ISV API reference and engineering notes** (PRED-842): endpoint
  table, two distinct 409 shapes, opaque `/status` fields (never branch on
  exact values; key mint success is the approval signal), one-time private
  key return. Folded into Epic 3 and spike S2.
- **Business metrics** (PRED-1109/953/842): US weekly traders, first-bet
  conversion, KYC completion ≥50%, education completion ≥60%, Feed→Trade
  8%→20%+.

**Tension to resolve:** PRED-842 said v1 has _no_ document upload / Socure
SDK embed (KYC rejection returns failed-field enums only), while the
`kalshi-kyc-pii-flow` ADR specifies client-direct Socure SDK for L2 step-up
when triggered. Product and ADR need to reconcile whether L2 is launch scope
(tracked in Epic 3.7).

## Working assumptions (flag if wrong)

- Immediate Orders only for v1 (no resting orders, no cancel/amend).
- Base USDC only, both directions.
- Separate flagged Kalshi surface (not merged multi-venue feed) for launch.
- Backend is a new service owned by the Predict team (framework/infra choices
  are an Epic 1 task).
