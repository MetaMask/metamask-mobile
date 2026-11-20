# Marketing consent integration strategy

Domain rollout and shape detail for **marketing consent** (Engagement). Shared
four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case →
layer assignments live in [`marketing-consent-use-cases.md`](marketing-consent-use-cases.md).

## TL;DR

Integration for marketing consent proves the surfaces mobile couples today —
the Redux `security` preference, the `AnalyticsController` consent state
machine, the `has_marketing_consent` identify trait gated on MetaMetrics (the
AND rule), and the seedless auth-server opt-in sync — as one chain, with only
the network/storage boundaries mocked. The app glue runs for real: the
`marketingAttribution` saga, the analytics helper's queue, and the Engine →
Redux state sync (`updateBgState`).

## What is and isn't wired

There is **no core `MarketingConsentController` package mobile can consume
yet** (nothing under `@metamask/*` ships one; mobile's consent state machine
lives in `@metamask/analytics-controller`). The harness therefore wires the
real client consent chain:

- **Wired for real** — `AnalyticsController` consent actions and its
  identify/trackEvent consent gating; the app `analytics` entry point and its
  queue manager; the `marketingAttribution` saga (redux → controller copy +
  attribution clearing); the `backfillSocialLoginMarketingConsent` saga; the
  real `security` / `engine` / `attribution` / `onboarding` reducers with the
  real selectors; the real `OAuthService` marketing opt-in sync.
- **Pending migration** — a core `MarketingConsentController` and an AUS /
  user-storage remote consent record. Mobile main's only remote consent
  surface today is the auth-server marketing opt-in endpoint; when the core
  controller lands, this harness should be re-pointed at it and the remote
  coverage extended to the AUS-backed record.

## Marketing consent harness shapes

Shape B (app-flow) is the primary shape: the bug surface IS the seam between
the store and the controller. A Shape A slice (controller + remote service)
covers the consent machine and the remote sync directly.

| Layer of the stack                                                                        | Shape B: app flow | Shape A: controller + remote service |
| ----------------------------------------------------------------------------------------- | ----------------- | ------------------------------------ |
| `@metamask/analytics-controller` (`AnalyticsController` + selectors)                      | ✓ real            | ✓ real                               |
| Production messenger layout (`AnalyticsController` child of the root controller messenger, as `@metamask/wallet` builds it) | ✓ real | ✓ real |
| `app/util/analytics/analytics.ts` (queue manager + consent mapping)                       | ✓ real            | ✗ (the singleton is unit-covered)    |
| `marketingAttribution` / `backfillSocialLoginMarketingConsent` sagas                      | ✓ real            | ✗                                    |
| Real Redux reducers (`security`, `engine`, `attribution`, `onboarding`) + real selectors  | ✓ real            | ✓ real (security slice)              |
| Engine → Redux state sync (`updateBgState` mechanism)                                     | ✓ real            | ✓ real                               |
| `OAuthService.updateMarketingOptInStatus` / `getMarketingOptInStatus`                     | ✓ real            | ✓ real                               |
| `platformAdapter` (Segment/Braze HTTP)                                                    | mocked            | mocked                               |
| `global fetch` (auth-server marketing opt-in API)                                         | mocked            | mocked                               |
| Engine module (seedless access token, controller messenger, state read)                   | shimmed           | shimmed                              |
| `app/store` singleton + `analyticsId` MMKV storage                                        | shimmed           | n/a                                  |
| Settings screen / hooks                                                                   | ✗ (CV owns)       | ✗ (CV owns)                          |

The Engine / store / `analyticsId` shims are the documented app-shell glue:
the real target chain (saga → helper → queue → messenger → controller →
adapter, and OAuthService → fetch) still runs.

## Harness inventory

When a harness is added or its public boundary changes, update this section.
Follow the central [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md) workflow rather than
documenting authoring rules here. Shared agent index: [`../../AGENTS.md`](../../AGENTS.md).

### Marketing consent — [`marketing-consent.ts`](marketing-consent.ts)

- **Shape:** A + B — controller/service harness plus the real app flow (sagas)
- **Real:** `AnalyticsController` (from `@metamask/analytics-controller`) on
  the production messenger layout; the app `analytics` singleton and its queue
  manager (required fresh per build via `jest.isolateModulesAsync` so the
  singleton binds to this build's messenger); `watchMarketingAttributionOnConsentChange`
  mounted on the store's saga middleware; `backfillSocialLoginMarketingConsentSaga`
  (started per test via `startBackfillSaga`); real `security` / `engine` /
  `attribution` / `onboarding` reducers; real `OAuthService`
- **Mocked:** `platformAdapter` (Segment/Braze); `global fetch` (auth-server
  marketing opt-in API); the `app/core/Engine/Engine` module (+ its index
  re-export) — seedless `getAccessToken`, `controllerMessenger`, `state`;
  the `app/store` singleton (getState → this build's store);
  `app/util/analytics/analyticsId` (MMKV)
- **Factory:** `await buildMarketingConsentHarness({ persistedControllerState?, persistedSecurityState?, seedlessAccessToken? })`
- **Returns:** `{ analyticsController, controllerMessenger, rootMessenger, analytics, oauthService, store, startBackfillSaga, marketingOptInCalls(), setAuthServerResponse({ postStatus?, getJson? }), waitFor(condition, timeoutMs?), mocks: { platformAdapter, fetch, getAccessToken } }`
- **Constants:** `HARNESS_ANALYTICS_ID` (UUIDv4), `HARNESS_SEEDLESS_ACCESS_TOKEN`,
  `AUTH_SERVER_MARKETING_OPT_IN_URL` (the real endpoint the harness asserts against)
- **Singleton handling:** the analytics singleton is re-required per build
  inside `jest.isolateModulesAsync`, so every build gets a fresh queue bound
  to its own messenger — no cross-test leak. The Engine → Redux mirror
  (`updateBgState`) keeps `selectAnalyticsEnabled` /
  `selectAnalyticsOptedInToMarketing` honest inside the sagas.
- **Use when:** proving a consent decision survives the store → controller →
  adapter / remote-sync chain, and that the trait honours the AND rule.
  Smoke: [`marketing-consent.integration.test.ts`](marketing-consent.integration.test.ts)
- **Use cases:** see [`marketing-consent-use-cases.md`](marketing-consent-use-cases.md) (`MC-*`)

## Coverage plan (summary)

Driven by [`marketing-consent-use-cases.md`](marketing-consent-use-cases.md):
(see the matrix file for the authoritative list):

| Area                                                    | E2E | Integration | CV | Unit | Total |
| ------------------------------------------------------- | --: | ----------: | -: | ---: | ----: |
| Consent persistence (security slice ↔ controller)       |     |           2 |    |      |     2 |
| `has_marketing_consent` trait (AND rule) + backfill     |     |           3 |    |      |     3 |
| Remote consent sync (auth server, incl. desync)         |     |           2 |    |      |     2 |
| Restart rehydration                                     |     |           1 |    |      |     1 |
| **Total (current matrix)**                              | **0** |     **8** | **0** | **0** | **8** |

Integration owns the consent chain end to end; CV owns the screens and sheets
that drive the toggles; no E2E is justified — there is no device or native
boundary in the consent flows.

## Optional follow-on (not in current matrix)

- Re-point the harness at the core `MarketingConsentController` when mobile
  can consume it, and extend the remote coverage to the AUS-backed consent
  record.
- `resetMarketingConsentDecision` driven from wallet reset / account deletion
  journeys once those flows expose a seam to drive.

## How to add a marketing-consent integration test

```ts
import { buildMarketingConsentHarness } from '../../../../../tests/integration/harnesses/marketing-consent/marketing-consent';
import { setDataCollectionForMarketing } from '../../../../../app/actions/security';

describe('My consent flow', () => {
  it('drives the real chain', async () => {
    const harness = await buildMarketingConsentHarness();

    harness.store.dispatch(setDataCollectionForMarketing(false));
    await harness.waitFor(
      () =>
        harness.analyticsController.state.marketingConsentDecisionMade ===
        true,
    );

    expect(
      harness.store.getState().security.dataCollectionForMarketing,
    ).toBe(false);
  });
});
```

The harness mocks the network / storage / Engine-shell boundary; the rest runs
real. See [Harness inventory](#harness-inventory) above and the central
[`integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test)
for authoring rules.

## Files in this folder

```
harnesses/marketing-consent/
├── marketing-consent.ts                       Shape A+B: controller + app-flow harness
├── marketing-consent.integration.test.ts      consent-chain integration tests
├── marketing-consent-use-cases.md             every marketing-consent use case → primary layer
└── STRATEGY.md                                this file
```
