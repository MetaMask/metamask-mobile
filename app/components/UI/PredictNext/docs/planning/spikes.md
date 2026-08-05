# Spikes

Time-boxed investigations that feed the epics. All unblocked today unless
noted. Each produces a written result (ADR update, doc note, or fixture set),
not code destined for production.

## S1 — Demo re-link semantics (feeds Epic 7 recovery, `kalshi-account-recovery` ADR)

The recovery ADR's named acceptance criteria, on the demo environment:

- Can `/users/link` + `/link/verify` with a **new** `external_user_id`
  succeed for a user whose sub-account already exists? Does it remap cleanly
  without a second Kalshi user/balance? What does the 409 path return?
- Confirm the create-flow 409 variants (flat `account_exists` vs nested
  duplicate `external_user_id`) are distinguishable enough to drive automated
  flow decisions.

Output: ADR Open Questions resolved; recovery option confirmed or revisited.

## S2 — Demo API validation & fixture capture (feeds Epics 1–5)

Systematic pass over the Kalshi demo APIs used by our slices: market data
shapes, setup step responses, funding endpoints, error envelopes. Capture
sanitized recorded payloads as the seed corpus for `fixtures/predict-api/`
and backend adapter tests. Note demo/production divergences (IP allowlisting,
test-bypass values) explicitly per fixture.

Seed knowledge (ported from PRED-842): ISV endpoint table
(`/trade-api/v2/isv/users/*`: create, verify-email, link, link/verify,
profile, phone-otp, verify-phone, verification, status/{user_id},
{user_id}/api-keys); two distinct 409 shapes on create (flat
`account_exists` → link flow vs nested duplicate `external_user_id` → our
bug); `/status` fields are opaque strings — the reliable approval signal is
a successful key mint; per-user private key returned exactly once.

## S3 — Contract tooling decision (feeds Epic 1.3)

Evaluate schema source-of-truth options (OpenAPI + codegen, shared zod,
JSON-schema + fixtures) against: one definition consumed by both repos,
runtime validation on mobile, CI enforcement on both sides, version
negotiation. Output: short decision note in `docs/planning/` or a local ADR.

## S4 — Encrypted Passthrough scheme proposal (feeds Epic 3.5, Kalshi deep-dive)

Draft the encryption scheme proposal to bring **to** Kalshi rather than
waiting for one: candidate construction (e.g., HPKE), key attestation,
blob binding (user/endpoint/freshness), response-path treatment, versioning.
Pre-review with AppSec. Output: proposal document for the Kalshi session-key
endpoint discussion.

## S5 — Step-up factor evaluation (feeds Epic 6.1, AppSec)

Compare fresh re-auth vs wallet-signed challenge vs OTP for the step-up
factor: server verifiability, UX cost, replay resistance, availability on
all account types (hardware wallets?). Output: recommendation to take into
the AppSec design session.

## S6 — Geolocation/venue-default integration (feeds Epic 1.7/2.5)

Confirm GeolocationController capabilities and the US-determination rule for
venue defaulting; how eligibility policy is sourced (remote config? backend
status route?). Output: doc note pinning the mechanism.
