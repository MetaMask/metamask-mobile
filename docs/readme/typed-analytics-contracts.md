# Typed analytics contracts

## Purpose

Mobile analytics contracts are produced from the rules deployed to Segment.
The deployed contract release is the source of truth for event names,
versions, properties, primitive types, and enums.

This work adds a client-side verification and generation path without changing
Mobile's production analytics dispatch.

## Contract lifecycle

```text
segment-schema change
  -> Segment deployment
  -> private immutable-by-convention contract release
  -> Mobile downloads metamask-mobile.json
  -> Mobile verifies hashes and selected event versions
  -> Mobile generates and type-checks the pilot API
```

The schema repository release contains:

- `manifest.json` — provenance, tracking-plan IDs, rule counts, and semantic
  hashes.
- `metamask-mobile.json` — the deployed Mobile contract.
- `metamask-extension.json` — the deployed Extension contract.

Mobile must use an exact release tag and verify both the release asset digest
and the semantic contract hash. It must not consume a mutable `latest` asset in
application builds.

The raw contract is private. It is downloaded only to temporary local or CI
storage and must not be committed or included in generated artifacts unless
the visibility policy changes.

## Local verification

Prerequisites:

- Node and Yarn versions from `.nvmrc` and `package.json`.
- `gh` authenticated with read access to `Consensys/segment-schema`.

Check the newest published contract:

```sh
yarn analytics:contract:check
```

Check a specific release:

```sh
yarn analytics:contract:check \
  --release-tag analytics-contracts-67390efdfde3-8db9e9f80441
```

Check the pinned contract release:

```sh
yarn analytics:contract:check:locked
```

Local runs retain the downloaded contract and generated pilot in the
gitignored `temp/local-analytics-contract-check/` directory by default. Use
`--output-directory` to choose another location.

The command:

1. Resolves the newest published analytics release, or the requested tag.
2. Downloads `manifest.json` and `metamask-mobile.json`.
3. Verifies source provenance, platform, tracking-plan ID, rule count, asset
   digest, manifest hash, and semantic hash.
4. Selects Quick Buy Amount Selected v1 and v2.
5. Generates a temporary strict TypeScript facade.
6. Type-checks valid and compile-fail fixtures.
7. Retains local files in the default temporary directory; CI-provided input
   paths are cleaned unless an output directory or `--keep` is used.

The pinned metadata in
[`contract.lock.json`](../../scripts/analytics/typed-events/contract.lock.json)
contains only public release identifiers and hashes. It does not contain the
private contract files.

The reviewed Quick Buy facade is public and tracked at
[`QuickBuyAmountSelected.ts`](../../app/util/analytics/generated/QuickBuyAmountSelected.ts).
CI regenerates the facade from the downloaded contract and fails if the tracked
types drift from the deployed contract.

## Typewriter comparison

Run the local comparison against the same pinned Quick Buy v1/v2 fixture:

```sh
yarn analytics:contract:compare
```

This uses pinned Typewriter 9.2.0 with TypeScript and
`analytics-react-native`. It reads a temporary local `plan.json`, does not
update Segment, and does not require Segment credentials. Typewriter output,
the adapted plan, and `comparison.json` remain under the ignored
`temp/analytics-contract-comparison/` directory.

The comparison is reference material, not production output. Stock Typewriter
normalizes Track rules and retains only the highest version for a repeated event
key. The strict pilot preserves explicit v1 and v2 APIs and adds the version
context. The comparison also records permissive index signatures, event-version
context, documentation/deprecation markers, and progressive-builder support.

## Quick Buy pilot and versions

The pilot event family is `Quick Buy Amount Selected`.

The same Segment event name has multiple schema versions:

- v1 supports `preset` and `custom_input`.
- v2 adds `slider`, `slider_percent`, `trader_feed`, and changed preset
  values.
- Both versions currently require `amount_usd`,
  `amount_selection_method`, and `source`.

The generated API requires explicit version selection:

```ts
QuickBuyAmountSelected.v1.track(properties);
QuickBuyAmountSelected.v2.track(properties);
```

The generated wrapper also supplies
`context.protocols.event_version`. Existing Mobile calls do not use this
facade yet, so production behavior is unchanged.

## Generator boundary

The deployed contract currently flattens event-owned properties together with
SDK and destination properties. The pilot therefore uses an explicit reviewed
allowlist in
[`quick-buy-pilot.ts`](../../scripts/analytics/typed-events/quick-buy-pilot.ts).

The narrow generator supports the pilot's primitive types, enums, required and
optional properties, exact object properties, and explicit versions. It fails
on unsupported JSON Schema features instead of silently generating an
incomplete type.

This is intentional. A general generator must first establish property
provenance and a broader JSON Schema support matrix.

## Planned progression

1. Merge and observe the incubation workflow.
2. Review the pinned lock and local Typewriter comparison.
3. Add optional `AnalyticsContext` plumbing through Mobile's existing analytics
   queue and adapter.
4. Integrate the generated facade into one reviewed Quick Buy production call.
5. Expand the generic generator and event coverage incrementally.

The analytics controller remains a generic runtime transport. Event-specific
property typing belongs in the generated Mobile facade, not in
`@metamask/analytics-controller`.
