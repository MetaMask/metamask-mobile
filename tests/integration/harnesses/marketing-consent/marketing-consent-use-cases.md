# Marketing consent use-case matrix

What the marketing-consent flows look like, and which test layer is responsible
for proving them. Main happy paths first; edge cases live inside those tests.

Layer notation: **U** = Unit, **I** = Integration (Shape A = controller/service
harness, B = app-flow harness), **CV** = Component view. Primary layer is
**bold**.

Shared four-layer model: [`../../STRATEGY.md`](../../STRATEGY.md). Domain
rollout and shape detail: [`STRATEGY.md`](STRATEGY.md).

---

## Marketing consent wiring

There is no core `MarketingConsentController` package mobile can consume yet.
The consent wiring mobile main runs today couples four surfaces: the Redux
`security.dataCollectionForMarketing` preference, the `AnalyticsController`
consent state machine (`optedInToMarketing` / `marketingConsentDecisionMade`),
the `has_marketing_consent` identify trait / preference event (gated on
MetaMetrics being opted in — the AND rule), and the seedless auth-server
marketing opt-in sync. The production glue between the first two is the
`marketingAttribution` saga; the social-login path adds the
`backfillSocialLoginMarketingConsent` saga.

| ID               | Use case                                                                                                                     | U | I     | CV                                                                                              | Coverage notes                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | - | ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| MC-CONSENT-ON    | Marketing toggle on → the preference persists in the security slice and AnalyticsController consent through the real saga     |   | **✓** | Toggle rendering + sheet flow (existing `MetaMetricsAndDataCollectionSection.view.test.tsx`)    | Shape B: real redux → saga → analytics helper → queue → controller chain; Engine mirror kept in sync.   |
| MC-CONSENT-OFF   | Marketing toggle off → opt-out persists on both surfaces, decision stays made, persisted attribution is cleared               |   | **✓** | Toggle rendering + data-collection sheet (existing CV coverage)                                 | Shape B; pins the saga's `clearAttribution` on opt-out.                                                 |
| MC-TRAIT-AND     | `has_marketing_consent` identify trait follows MetaMetrics (the AND rule): suppressed while opted out, delivered once opted in |   | **✓** |                                                                                                 | Shape A at the controller seam: `identify` is gated on the product opt-in; trait + consent context asserted. |
| MC-BACKFILL-OFF  | Social-login backfill with consent recorded while MetaMetrics is opted out → no consent payload emitted, pending flag cleared |   | **✓** |                                                                                                 | Shape B: the saga's own `analytics.isEnabled()` gate; backfill still clears.                            |
| MC-BACKFILL-ON   | Social-login backfill while MetaMetrics is on → consent trait identify + preference event through the real chain, flag cleared |   | **✓** |                                                                                                 | Shape B; asserts trait, `location: saga_backfill_marketing_consent`, and the derived `account_type`.    |
| MC-REMOTE-OK     | Consent sync to the seedless auth server succeeds: POST `opt_in_status` with the seedless access token                        |   | **✓** |                                                                                                 | Shape A on the real `OAuthService`; URL + auth header + body pinned to the production endpoint.         |
| MC-REMOTE-DESYNC | Auth-server write fails (8.18.1 desync scenario) → the write rejects and local consent must not diverge from the local choice |   | **✓** | Desync remount behaviour (existing `MetaMetricsAndDataCollectionSection.view.test.tsx`)         | Shape A: failed POST rejects; local controller + redux keep the decision; the stale remote read is not adopted. |
| MC-REHYDRATE     | Restart → consent rehydrates from persisted controller state + the persisted security slice, and the AND rule still applies   |   | **✓** |                                                                                                 | Shape A: fresh controller from the persisted slices; identify flows post-restart.                       |

---

## Deliberately not in this matrix (owned elsewhere)

| Concern                                                                                       | Owner                                                                                       |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Settings screen composition, switch states, data-collection sheet flow                        | CV — `MetaMetricsAndDataCollectionSection.view.test.tsx` (MMQA-2604 items 2–3)              |
| The `analytics` helper's queue wrapper details (enrichment, error swallowing)                 | Unit — `app/util/analytics/analytics.test.ts`                                               |
| Saga effect ordering with mocked analytics                                                    | Unit — `app/store/sagas/marketingAttribution.test.ts`                                       |
| OAuthService HTTP details beyond the consent endpoint (login, token refresh)                  | Unit — `app/core/OAuthService/OAuthService.test.ts`                                         |
| `withMobileAnalyticsControllerState` rehydration normalization (MMKV analyticsId preference)  | Unit — `app/core/Engine/wallet-init/instance-options/analytics-controller.test.ts`          |
| Consent prompts during onboarding (OptinMetrics / ExperienceEnhancer screens)                 | CV — existing screen tests                                                                  |
| A future core `MarketingConsentController` + AUS-backed remote consent record                 | Pending migration — re-point this harness at the core controller when mobile can consume it |
