# Remote venue profiles: readable JSON in the registry, exact bytes pinned by hash

Status: accepted, 2026-11-20. Supersedes the signed-document and bundled-copy
parts of [ADR-0004](./0004-signed-venue-profiles.md). ADR-0004's read/mutation
model, envelope, invalidity and reconciliation rules stand.

## Context

ADR-0004 shipped the venue profile as a signed document bundled with the app.
Changing a payload, a read pattern or a read ceiling therefore required a store
release, and predict-api had to keep a signer and public keys for a format only
the phone consumed. The document signature also protected nothing an attacker
with a store release could not already change; the real boundary is what the
phone's code checks before it signs.

## Decision

1. **Readable JSON in mm-config-registry.** Profiles live at
   `predict/venue-profiles/<id>/{policy,v<N>}.json`, with
   `policy.json = {id, currentVersion, revokedVersions}`. The registry
   validates and publishes the exact repo bytes to the client-config host for
   each environment. There is no signature, no signing script and no private
   key.
2. **The host is a code constant.** dev → `client-config.dev-api.cx.metamask.io`,
   uat → `client-config.uat-api.cx.metamask.io`, prod →
   `client-config.api.cx.metamask.io`, under
   `v1/config/predict/venue-profiles`. No value from predict-api, remote
   config or a profile can choose a different host.
3. **Mobile reads, caches and falls back.** `VenueProfileResolver` resolves
   fresh remote → persisted MMKV cache → bundled byte copy. Entry points call
   `refresh()` in the background (15-minute cadence, foreground, and once
   after a `venue_profile_*` refusal); `resolve()` never blocks on the network.
   A known-offline tier (`NONE`) skips refresh; `null` does not.
4. **The build ceiling limits any delivered profile.**
   `applyVenueProfileCeiling` admits only `kalshi-demo-signing`, venue
   `kalshi`, DSL `dsl-1`, implemented intents, `/trade-api/v2/` paths, and an
   `order.place` payload carrying `binary-limit-order-v1`. Unknown top-level
   keys are ignored; an unknown condition fails the copy.
5. **`currentVersion` never decreases; revocation only grows.** Mobile refuses
   a policy that rolls back or drops a revoked version, and persists a floor of
   the highest version it admitted. A refused copy never replaces the last
   admitted one.
6. **The exact bytes are the hash identity.** Mobile sends
   `profile.sha256` (unpadded base64url SHA-256 over the served bytes) in the
   `Venue-Authorization` envelope. predict-api compares it with its own
   registry copy; mismatch is `venue_authorization_invalid`. The field is
   optional so older app versions keep working during the predict-api
   rollout, and mobile ships only after predict-api accepts it.
7. **No bodies, envelopes or signatures in logs.** Reason codes only.

## Alternatives rejected

- **Keep the signature and add a second key.** A key the company holds adds a
  distribution and rotation burden for a check the ceiling already provides.
- **Fetch the profile through predict-api.** Then predict-api chooses the
  profile host and can be induced to serve a profile the venue never
  published; the registry host is a client constant for that reason.
- **Fail closed with no bundle.** A cold start offline would make PredictNext
  unusable even though a known-good copy shipped with the binary.
- **Re-serialize JSON at publish time.** The hash must cover the bytes the
  registry repo reviews, so the pipeline preserves them.

## Consequences

- A profile change ships without an app release, except when it needs a new
  DSL, intent, payload kind or invariant — those require the ceiling and code.
- predict-api needs read access to `configs/predict` in S3, and keeps its
  bundled copy as the cold-start fallback.
- `venue_profile_update_required` means the phone must adopt a new profile;
  `venue_profile_not_ready` means the API has not loaded one yet. Both trigger
  one refetch-and-sign retry, then the canonical product error.
