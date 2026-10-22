# Typed analytics contracts

## Purpose

Catch analytics contract mistakes before client code ships, while preserving
Mobile's existing consent, enrichment, queueing, and dispatch behavior.

Mobile generates versioned tracking APIs from a verified snapshot of the
tracking rules deployed to Segment. For migrated events, these APIs enforce
supported property types, required fields, enums, and unknown-property checks
at compile time. They also supply the selected event version in
`context.protocols.event_version`.

Adoption is incremental. Generating an API does not migrate a call site;
generic analytics calls continue working without the generated contract checks.

## Contract lifecycle and pinning

The contract lifecycle is:

1. **schema PR:** Update the event definitions in
   `Consensys/segment-schema`, get review, and merge into `main`.
2. **Automated — deployment and publication:** CI deploys the tracking plans to
   Segment and, after successful deployment, publishes a private,
   immutable-by-convention contract release when the deployed contract changes.
3. **client PR:** Adopt the contract and migrate the intended events in the same PR:
   - Select and pin an exact release in Mobile.
   - Run the contract checker; it automatically verifies the release and generates
     the supported tracking APIs in a temporary directory.
   - Review and copy the generated files into the client, then migrate the
     intended call sites to the generated APIs.
   - Review and validate the changes before enabling them in production.

Each contract release contains:

- `manifest.json` — provenance, tracking-plan IDs, rule counts, and semantic
  hashes.
- `metamask-mobile.json` — the deployed Mobile contract snapshot.
- `metamask-extension.json` — the deployed Extension contract snapshot.

[`contract.lock.json`](../../scripts/analytics/typed-events/contract.lock.json)
pins the release metadata and verification hashes for Mobile. It contains no
private contract contents. Verify both the release asset digest and the
semantic contract hash; do not resolve a mutable `latest` release as part of
an application build.

The raw contract must remain in temporary, gitignored local or CI storage. Do
not commit it or embed it in application artifacts. The reviewed generated
TypeScript is tracked separately under `app/util/analytics/generated/`.

## Local verification and generation

Prerequisites:

- Node and Yarn versions from `.nvmrc` and `package.json`.
- `gh` authenticated with read access to `Consensys/segment-schema`.

Verify the pinned release:

```sh
yarn analytics:contract:check:locked
```

Check the newest published release, without changing the pin:

```sh
yarn analytics:contract:check
```

Check a specific release:

```sh
yarn analytics:contract:check --release-tag <exact-release-tag>
```

The checker:

1. Downloads `manifest.json` and `metamask-mobile.json` for the selected release.
2. Verifies provenance, platform, tracking-plan ID, rule count, asset digest,
   manifest hash, and semantic hash. Locked runs also check the pinned metadata.
3. Generates the configured event versions into a temporary directory.
4. Type-checks valid and compile-fail fixtures.

Local runs retain artifacts in the gitignored
`temp/local-analytics-contract-check/` directory by default. Use
`--output-directory` to choose another location. Runs using already-downloaded
CI inputs clean their temporary output unless `--output-directory` or `--keep`
is supplied.

**The checker does not update the lock or checked-in APIs, and does not itself
compare generated output with checked-in files.** Compare regenerated source
and type fixtures separately before adopting changes. Never hand-edit generated
files. See the [tooling README](../../scripts/analytics/typed-events/README.md)
for additional usage details.

## Shared Mobile transport

[`typedEventTransport.ts`](../../app/util/analytics/typedEventTransport.ts)
connects generated facades to Mobile's normal event builder and tracking API.
It has no dependency on a specific generated event module; existing facades
are compatible through their shared structural interface.

Create a transport with `createTypedEventTransport(trackEvent)`, using either
`useAnalytics().trackEvent` in UI code or `analytics.trackEvent` outside React.
The same transport can serve multiple generated event names and versions.
Property checking and explicit version selection belong to each generated
facade, not to the transport.

The runtime path is:

1. The generated facade supplies the event name, properties, and version context.
2. The transport builds a normal `AnalyticsTrackingEvent` and passes context as
   a separate argument to the injected Mobile tracking function.
3. The hook/helper and readiness queue forward the event and context to
   `AnalyticsController:trackEvent`, retaining normal shared enrichment.
4. The controller applies its existing consent and tracking behavior.
5. The Segment adapter attaches `protocols.event_version` through the SDK
   enrichment callback, retaining SDK context and the existing consent and
   configuration-version handling.

Version metadata stays in context, not event properties. No default version
is injected for legacy callers, and calls without context retain their existing
argument shape. The transport neither initializes Engine nor dispatches directly
to Segment. Event-specific schemas do not belong in
`@metamask/analytics-controller`.

## Current generator coverage and limitations

The shared transport is reusable, but the generator is not yet an all-events
generator. It currently covers a narrow set of configured event versions using
a reviewed caller-owned property allowlist. The checked-in generated APIs and
their compile/runtime fixtures provide regression coverage for that supported
scope.

The narrow generator supports primitive property types, enums, required and
optional fields, exact property checks, and explicit versions. It rejects
unsupported schema features in selected properties rather than silently
producing incomplete types.

Deployed schemas mix caller-owned and automatically collected SDK/destination
properties. Broader generation needs an explicit ownership boundary and support
for the schema features used across the full contracts.

Compile-time checks do not validate arbitrary runtime data or enforce every
JSON Schema constraint. For example, TypeScript `number` alone does not enforce
an integer or numeric range. Values from APIs and user input may still require
runtime validation. Generic calls and type-system bypasses remain outside the
generated guarantees.

## Automated drift monitoring

[`check-analytics-contract.yml`](../../.github/workflows/check-analytics-contract.yml)
runs hourly from 06:00 through 22:00 UTC on weekdays, and can be dispatched
manually. By default it checks the newest published release; manual runs may
select an exact release.

The workflow downloads the private contract through the shared
`MetaMask/github-tools` action, verifies it, regenerates the configured event
APIs, type-checks fixtures, and compares generated source/type fixtures with
the checked-in files. It sends a Slack result notification when the configured
webhook is available. It does not update the pin or application code.
