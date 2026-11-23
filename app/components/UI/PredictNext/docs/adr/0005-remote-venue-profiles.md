# Remote venue profiles: readable JSON in the registry, exact bytes pinned by hash

Status: accepted, 2026-11-20; amended for per-environment venue profiles,
2026-11-23. Supersedes the signed-document and bundled-copy
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

1. **The registry holds content and revocations.** Profiles live at
   `predict/venue-profiles/<id>/{v<N>.json,revoked.json}`. Published profile
   versions are immutable; `revoked.json` contains `{id, revokedVersions}` and
   versions may only be added to its list. Published bytes are never
   re-serialized. The clean slate starts at version 1, with the old version 3
   content and only the version number changed. There is no signature, signing
   script or private key.
2. **predict-api names the version.** Each environment's workload sets the
   positive integer `VENUE_PROFILE_VERSION`; when unset, predict-api uses the
   highest bundled version. The unauthenticated
   `GET /v1/venues/kalshi/signing-profile` returns `{id, version}`, not profile
   content or revocations. Every 15 minutes predict-api reads `revoked.json`
   and published profile files up to the configured version. A version above
   it gets `venue_profile_not_ready`; a revoked or missing version gets
   `venue_profile_update_required`. A missing or revoked configured version is
   logged, never fatal, and the endpoint still reports it.
3. **The phone downloads and checks.** The phone asks predict-api for the
   version, then downloads `revoked.json` and `v<version>.json` from the
   registry. It validates the profile and its id and version, applies the build
   ceiling, checks revocation and the stored floor, and signs with a pinned
   snapshot carrying `profile.{id,version,sha256}`. It raises the floor after
   admitting a version. For both the target version and bytes, the fallback is
   the last predict-api answer and downloads, then the persisted cache, then
   bundled `v1.json` and `revoked.json`. A target below the floor disables
   signing in that environment until predict-api names that version or higher.
4. **The registry URL is a code constant.** Both repositories use
   `https://pub-4571681e7ae145b0abdff881a1172b04.r2.dev/predict/venue-profiles`
   for dev and uat. Before production it moves to a client-config route or a
   MetaMask domain serving the same paths and bytes. Nothing from predict-api,
   remote config or a profile can change the phone's URL. The mobile cache and
   floor are keyed by predict cluster and profile id.
5. **The exact bytes are the required hash identity.** The phone always sends
   `profile.sha256`, an unpadded base64url SHA-256 of the profile bytes.
   predict-api rejects a missing or mismatched hash as
   `venue_authorization_invalid`. The build ceiling allows payload and read
   paths under `/trade-api/`; its other rules remain unchanged: profile id
   `kalshi-demo-signing`, venue `kalshi`, DSL `dsl-1`, implemented intents, and
   the `binary-limit-order-v1` invariant for `order.place`. Unknown top-level
   keys are ignored; an unknown condition fails the copy. Refresh cadence is
   unchanged: the phone refreshes on entry and foreground after 15 minutes,
   and once after a `venue_profile_*` refusal before retrying once.

Logs contain reason codes only, never bodies, envelopes or signatures.

## Alternatives rejected

- **Keep the signature.** A key the company holds adds a distribution and
  rotation burden for a check the ceiling already provides.
- **Fetch the profile through predict-api.** The API that requests signatures
  must not choose or serve the content the phone signs under. Profile content
  and revocations never travel through predict-api.
- **Fail closed with no bundle.** A cold start offline would make PredictNext
  unusable even though a known-good copy shipped with the binary.
- **Re-serialize JSON at publish time.** The hash must cover the bytes the
  registry repo reviews, so the pipeline preserves them.

## Consequences

- Profile changes and revocations ship without an app release, unless a change
  needs a new DSL, intent, payload kind or invariant, which requires app code.
- Selecting a version requires a workload change and predict-api redeploy. A
  rollback publishes a new version with the old content.
- Changing the registry URL requires an app release.
- `venue_profile_update_required` means the phone must adopt a new profile;
  `venue_profile_not_ready` means the API has not loaded one yet. Both trigger
  one refetch-and-sign retry, then the canonical product error.
