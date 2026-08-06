# Spikes

Time-boxed investigations that feed the epics. All unblocked today unless
noted. Each produces a written result (ADR update, doc note, or fixture set),
not code destined for production.

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
Pre-review with AppSec. Output: proposal document for the Kalshi encryption
public-key mechanism discussion; no per-session key is required.

## S5 — Step-up factor evaluation (feeds Epic 6.1, AppSec)

Compare fresh re-auth, passkey assertion, and OTP for the Predict User step-up
factor: server verifiability, UX cost, replay resistance, and availability on
all account types. A destination-wallet signature is evaluated separately as
proof of wallet control, not as the user step-up. The selected factor must be
unavailable from a stolen bearer token and bind payout registration to the
destination address and operation. Output: recommendation to take into the
AppSec design session.

## S6 — Geolocation/venue-default integration (feeds Epic 1.7/2.5)

Confirm GeolocationController capabilities and the US-determination rule for
venue defaulting; how eligibility policy is sourced (remote config? backend
status route?). Output: doc note pinning the mechanism.
