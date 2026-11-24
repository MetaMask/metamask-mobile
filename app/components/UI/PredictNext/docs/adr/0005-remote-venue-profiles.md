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
   re-serialized. At least one version must stay unrevoked, and CI rejects an
   edited or deleted version or an un-revoked one. The deploy reads each
   object already in the bucket, skips identical bytes, uploads a new version,
   refuses a differing `v<N>.json`, and rewrites a grown `revoked.json`
   (append-only is checked in CI). A published version can never be rewritten
   even if review misses it. The clean
   slate starts at version 1, with the old version 3 content and only the
   version number changed. There is no signature, signing script or private
   key. The prd deploy writes the files to one public bucket; dev, uat and
   mobile all read that copy. A merged version is not public until the prd
   deploy runs; which one is used is decided by predict-api, not by the
   registry.
2. **predict-api names the version.** Each environment's workload sets the
   positive integer `VENUE_PROFILE_VERSION`, capped at 100; when unset,
   predict-api uses the highest bundled version. `GET
/v1/venues/kalshi/signing-profile` is listed in predict-api's public auth
   paths, so a phone can call it without a token; it returns `{id, version}`,
   not profile content or revocations. At boot and every 15 minutes
   predict-api reads `revoked` and published profile files up to the
   configured version, four at a time, keeping its last good snapshot (or its
   bundled byte copies) when the revocation list or a read fails. A missing
   version is skipped; a single malformed version is logged and skipped
   without discarding the versions that parsed. It accepts any published,
   non-revoked version at or below the configured one. A version above it gets
   `venue_profile_not_ready` (503); a revoked or missing version gets
   `venue_profile_update_required` (409). A
   missing or revoked configured version is logged, never fatal, and the
   endpoint still reports it; read proposals are then checked against the
   highest usable version below it.
3. **The phone downloads and checks.** The phone asks predict-api for the
   version, then downloads `revoked` and `v<version>` from the
   registry. It validates the profile and its id and version, applies the build
   ceiling, checks revocation and the stored floor, and signs with a pinned
   snapshot carrying `profile.{id,version,sha256}`. It raises the floor after
   admitting a version. For both the target version and bytes, the fallback is
   the last predict-api answer and downloads, then the persisted cache, then
   bundled `v1.json` and `revoked.json`. When the target cannot be downloaded
   or is refused, the phone keeps signing with the last admitted version. A
   revocation list that drops a version the phone already saw as revoked is
   ignored. A target below the stored floor is ignored and logged
   (`profile_below_floor`): the phone never moves back, so it keeps its
   previous target and the version it last used, and the floor is only raised.
   A cached revocation `ETag` is discarded when the cached list is not
   adopted, so a later conditional request cannot turn a rejected list into a 304. Concurrent refreshes share one request, so answers cannot land out of
   order.
4. **The registry URL is a code constant.** Both repositories use the
   client-config route
   `https://client-config.api.cx.metamask.io/v1/config/predict/venue-profiles`.
   Public paths are extensionless (`<id>/v<N>`, `<id>/revoked`); the Worker
   maps them to the `.json` objects in R2 and serves the same bytes. Nothing from predict-api,
   remote config or a profile can change the phone's URL. The phone reads the
   registry and predict-api only when it resolves a dev or uat Predict
   cluster; any other build uses bundled version 1 alone. The mobile cache and
   floor are keyed by predict cluster and profile id.
5. **The exact bytes are the required hash identity.** The phone always sends
   `profile.sha256`, an unpadded base64url SHA-256 of the profile bytes.
   predict-api rejects a missing or mismatched hash as
   `venue_authorization_invalid`. The build ceiling allows payload and read
   paths under `/trade-api/`; its other rules remain unchanged: profile id
   `kalshi-demo-signing`, venue `kalshi`, DSL `dsl-1`, implemented intents, and
   the `binary-limit-order-v1` invariant for `order.place`. Unknown top-level
   keys are ignored; an unknown condition fails the copy. Refresh cadence is
   unchanged: the phone refreshes on entry and foreground after 15 minutes
   (skipped only on a known offline network tier), once after a
   `venue_profile_*` refusal before retrying once, and once when no version is
   admitted at signing time. The target lookup and the post-refusal refresh
   each stop after 10 seconds: a hung registry call must not hold the
   confirmation screen or turn into a second send.

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
  rollback publishes a new, higher version with the old content. Lowering
  `VENUE_PROFILE_VERSION` below a version phones have used does not move them
  back; predict-api then refuses their version as `venue_profile_not_ready`
  and signing fails until the setting is raised again.
- Changing the registry URL requires an app release.
- Registry files are served with `Cache-Control: public, max-age=900`, so a
  revocation can take up to about 30 minutes (cache plus refresh cadence) to
  reach every phone and API pod. Moving the configured version off the
  affected version first is what makes a revocation take effect quickly.
- `venue_profile_update_required` means the phone must adopt a new profile;
  `venue_profile_not_ready` means the API has not loaded one yet. Both trigger
  one refetch-and-sign retry, then the canonical product error.
