# Dual-stack closure: composition allowlist and PRED-1356 deletion checklist

PRED-1394 (F1) closes [PRED-1340](https://consensyssoftware.atlassian.net/browse/PRED-1340). Every external product caller now goes through the PredictNext entry point (`app/components/UI/PredictNext/index.ts`). The rest of this page is for [PRED-1356](https://consensyssoftware.atlassian.net/browse/PRED-1356), which moves Polymarket onto PredictNext and deletes the legacy lane. It lists:

1. the **composition allowlist**: every file outside Predict that may still import Predict internals, and why;
2. what the **structural scans** prove about closure, and what they do not;
3. the **deletion checklist**: the steps that turn `polymarket → legacy` into `polymarket → next` and delete the legacy code without changing any product caller.

[ADR-0002](./adr/0002-permanent-public-api-private-legacy.md) states the rule ("the named composition wiring can be deleted without changing external imports, public types, supported interactions, or visible behavior"). This page is the inventory that rule needs.

## The fence

`scripts/eslint-predict-boundary-zones.js` fences `app/` with `import-x/no-restricted-paths`. Outside `UI/Predict/` and `UI/PredictNext/`, a file may import only the entry point. Two lists exempt files:

| List                         | At PRED-1399 | Before PRED-1394 | After PRED-1394 | Meaning                                                     |
| ---------------------------- | ------------ | ---------------- | --------------- | ----------------------------------------------------------- |
| `predictImportBurndownFiles` | 98 files     | 31 files         | **0**           | Temporary exceptions. Must stay empty.                      |
| `predictCompositionFiles`    | 19 files     | 29 files         | 55 files        | Named composition wiring, grouped below. Ends at PRED-1356. |

`scripts/eslint-predict-boundary-zones.test.ts` fails if a burn-down entry comes back, if a composition file is missing from this page, or if a listed file stops importing Predict internals.

### How the last 31 burn-down entries were closed

| Entries                                                                 | Outcome                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26 confirmation files (`Views/confirmations/…`)                         | **Reclassified** as `legacyConfirmations`. They are legacy Polymarket execution, which ADR-0002 leaves unchanged before PRED-1356 apart from the availability gate (PRED-1388). [PRED-1389](https://consensyssoftware.atlassian.net/browse/PRED-1389) records their move as PRED-1356 work. |
| `ActivityDetails.predict.view.test.tsx`                                 | **Moved** to `PredictNext/activity/PredictActivityDetails.view.test.tsx` with `git mv`. It tests the legacy details templates that PRED-1387 moved into PredictNext.                                                                                                                        |
| `confirmations/__mocks__/controllers/other-controllers-mock.ts`         | **Migrated**: the fixture's `PredictPositionStatus.WON` is now the literal `'won'`.                                                                                                                                                                                                         |
| `UiSlotsController.test.ts`, `ui-slots-controller/contracts/v1.test.ts` | **Migrated**: they test the composed `MOBILE_UI_SLOTS_CONTRACTS` from `UiSlots/contractRegistry.ts`, the registry the Engine actually loads, not the Predict module behind it.                                                                                                              |
| `app/selectors/featureFlagController/mocks.ts`                          | **Migrated**: it inlines the one flag it took from `Predict/mocks` (`predictTradingEnabled`).                                                                                                                                                                                               |

## The composition allowlist

Each group is a key of `predictCompositionGroups`. The "PRED-1356" column says what happens to the wiring. Tests next to a file follow that file.

### `legacyController`: legacy controller init, types, messenger and persistence

| File                                                               | Imports                                               | PRED-1356                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `app/core/Engine/controllers/predict-controller/index.ts`          | `Predict/controllers/PredictController`               | Delete. Remove `PredictController: predictControllerInit` from `Engine.ts`.       |
| `app/core/Engine/messengers/predict-controller-messenger/index.ts` | `Predict/controllers/PredictController`               | Delete. Remove its `MESSENGER_FACTORIES` entry in `messengers/index.ts`.          |
| `app/core/Engine/types.ts`                                         | `PredictController` and its actions, events and state | Remove the legacy entries. The PredictNext entries stay, see `predictNextEngine`. |

Wiring outside the fence that goes with it (these files import no Predict module, so the scan cannot list them):

- `app/core/Engine/Engine.ts`: `predictController` in the context, `PredictController.state` in `Engine.state`, the `PredictController` reset.
- `app/core/Engine/constants.ts`: `'PredictController:stateChange'` in the background-state change events.
- **Persistence.** `PredictController` persists `accountMeta` (`persist: true`). Add a store migration that deletes `engine.backgroundState.PredictController`. `app/util/logs/index.ts` deletes it from state logs; remove that line too.
- `app/util/test/initial-background-state.json`: the `PredictController` fixture.

### `legacyTransactionHooks`: transaction-pay `PolymarketCallbacks`, signing and publish hooks

| File                                                                             | Imports                                                                 | PRED-1356                                                                                                                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/core/Engine/controllers/transaction-pay-controller/polymarket-callbacks.ts` | `Predict/providers/polymarket/depositWallet`, `Predict/providers/types` | Replace with callbacks backed by the PredictNext Polymarket funding flow, or delete if that flow no longer uses transaction-pay. `transaction-pay-controller-init.ts` registers it as `polymarket:`. |
| `app/core/Engine/wallet-init/messengers/transaction-controller-messenger.ts`     | `Predict/controllers/PredictController-method-action-types`             | Remove the `PredictController:beforePublish`, `:beforeSign` and `:publish` delegations.                                                                                                              |

Outside the fence: `app/util/transactions/hooks/index.ts` calls those three actions in `beforePublishHook`, `beforeSignHook` and `publishHook`. Remove the calls together with the delegations, or the hooks throw because the actions are unregistered. `get-balance-callback.ts` reads `Engine.context.PredictController.state.balances` for `predictWithdraw`; it must move with the withdraw flow.

### `legacyConfirmations`: legacy Polymarket confirmations and the pay-with Predict source

Deposit, withdraw and claim confirmations, the pay-with Predict section and modal, Money's Predict deposit, the Polymarket sub-account and post-quote hooks, and their metrics. The PRED-1388 availability gate (`usePredictLegacyDeposit`) is the only PredictNext dependency they have.

| File                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- |
| `app/components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.tsx`                                    |
| `app/components/Views/confirmations/components/predict-confirmations/predict-claim-amount/predict-claim-amount.tsx`         |
| `app/components/Views/confirmations/components/predict-confirmations/predict-claim-footer/predict-claim-footer.tsx`         |
| `app/components/Views/confirmations/components/predict-confirmations/predict-withdraw-balance/predict-withdraw-balance.tsx` |
| `app/components/Views/confirmations/components/rows/predict-account-picker-row/predict-account-picker-row.tsx`              |
| `app/components/Views/confirmations/hooks/gas/usePredictWithdrawGasFeeToken.ts`                                             |
| `app/components/Views/confirmations/hooks/metrics/usePredictClaimConfirmationMetrics.ts`                                    |
| `app/components/Views/confirmations/hooks/pay/sections/usePayWithCryptoSection.ts`                                          |
| `app/components/Views/confirmations/hooks/pay/sections/usePayWithPredictSection.tsx`                                        |
| `app/components/Views/confirmations/hooks/pay/useMoneyPredictDeposit.ts`                                                    |
| `app/components/Views/confirmations/hooks/pay/usePaySectionSourceMetrics.ts`                                                |
| `app/components/Views/confirmations/hooks/pay/useTransactionPayBalance.ts`                                                  |
| `app/components/Views/confirmations/hooks/pay/useTransactionPayPostQuote.ts`                                                |
| `app/components/Views/confirmations/hooks/transactions/usePredictSubAccounts.ts`                                            |

Plus the tests that mock legacy hooks for those files: `pay-with-modal.test.tsx`, `predict-claim-amount.test.tsx`, `predict-withdraw-balance.test.tsx`, `usePayWithCryptoSection.test.tsx`, `usePayWithPredictSection.test.tsx`, `useMoneyPredictDeposit.test.ts`, `usePaySectionSourceMetrics.test.ts`, `useTransactionPayBalance.test.ts`, `useTransactionPayMetrics.test.ts`, `useTransactionPayPostQuote.test.ts`, `usePredictSubAccounts.test.ts`, `useTransactionCustomAmount.test.ts`.

PRED-1356: these move to canonical funding and operation contracts (the PRED-1389 criteria). The confirmations decide what they render from a plan, not from Polymarket proxy addresses, Polygon constants or legacy account state. This is the one group whose removal changes code outside Predict, because the confirmations are themselves the composition layer of a money flow. `predict-confirmations/` is a Predict-owned confirmation slice in a shared directory. Whether it moves into PredictNext or stays as a renderer for a canonical plan is PRED-1356's call.

### `toastRegistration`: legacy toast registration

| File                             | Imports                                                                                                         | PRED-1356                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `app/components/Nav/App/App.tsx` | `Predict/hooks/usePredictToastRegistrations`, `PredictNext/notifications` (`usePredictOrderToastRegistrations`) | Remove `usePredictToastRegistrations` and its spread. Keep `usePredictOrderToastRegistrations`, which then serves both Venues. |

Both registrations are mounted outside the Predict navigator, whatever the Active Venue (PRED-1383). The PredictNext one comes from the `notifications` module boundary, not the entry point, because App.tsx is loaded with the Engine.

### `navigatorRegistration`: navigator registration

| File                                        | Imports                                                                                                                  | PRED-1356                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/Nav/Main/MainNavigator.tsx` | `Predict` (`PredictModalStack`, `PredictPreviewSheetProvider`), entry point (`PredictRoot`, `selectPredictAvailability`) | Replace `PredictModalStack` and `PredictPreviewSheetProvider` with their PredictNext counterparts, or drop them. `PredictRoot` and `selectPredictAvailability` stay. |

Outside the fence, `Routes.PREDICT.*` (`app/constants/navigation/Routes.ts`) and the `Predict*` entries in `app/core/NavigationService/types.ts` name the legacy routes. Product callers no longer use them (see the route scan). They can be deleted once `PredictAppRouteParamList` no longer lists them.

### `uiSlotsRegistries`: UI Slots contract and widget registries

| File                                            | Imports                                                  | PRED-1356                                                                                                                                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/UI/UiSlots/contractRegistry.ts` | `Predict/uiSlots/contracts/v1`                           | Point at the contracts' new home if they move under PredictNext. Engine init loads this file, so it must never import the entry point: the entry point loads the legacy routes, which load confirmations, which load the Engine. |
| `app/components/UI/UiSlots/registry.ts`         | `PredictNext/homeSection/PredictDiscoveryListSlotWidget` | Unchanged. The widget already switches on the Active Venue.                                                                                                                                                                      |

### `predictNextEngine`: PredictNext Engine services and their messengers

| File                                                                  | Wires                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `app/core/Engine/controllers/predict-service-init.ts`                 | Market data, live data, portfolio and order services, Kalshi adapters |
| `app/core/Engine/controllers/predict-device-auth-service-init.ts`     | Kalshi device auth (A2T) and the bundled auth profile                 |
| `app/core/Engine/controllers/predict-venue-controller-init.ts`        | `PredictVenueController` (Active Venue, persisted preference)         |
| `app/core/Engine/messengers/predict-market-data-service-messenger.ts` |                                                                       |
| `app/core/Engine/messengers/predict-live-data-service-messenger.ts`   |                                                                       |
| `app/core/Engine/messengers/predict-portfolio-service-messenger.ts`   |                                                                       |
| `app/core/Engine/messengers/predict-order-service-messenger.ts`       |                                                                       |
| `app/core/Engine/messengers/predict-device-auth-service-messenger.ts` |                                                                       |
| `app/core/Engine/messengers/predict-venue-controller-messenger.ts`    |                                                                       |

PRED-1356 keeps this group: it is the permanent composition root of the PredictNext stack. `predict-service-init.ts` gains the Polymarket adapter next to `KalshiRemoteAdapter`.

## Structural scans

`node scripts/predict-closure-scan.js` (add `--json` for the file lists) re-runs all four scans over tracked files in `app/` and `tests/` outside the two Predict trees. It resolves every relative `import`, `export`, `require`, `import()` and `jest.mock` specifier to a path, so `../Predict/…` from a sibling folder counts. It exits non-zero if a production file outside the allowlist imports a Predict internal. Results on this branch (base `20cd4c6c047`):

| Scan                 | Result                                                                                                                                                                                                                                                                                                                                                                  | Proves                                                                                                                                                       | Does not prove                                                                                                                                                                                        | Runtime evidence for the gap                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tracked-file imports | 44 files import only the entry point, 55 are composition files, 0 are on the burn-down list, **0 production files** outside the lists. 42 test files name internals: 17 unit tests through `jest.mock` paths, 11 component-view and integration fixtures, renderers and harnesses, 14 Appium page objects importing test IDs.                                           | No production file outside the allowlist names a Predict module other than the entry point. The lint fence enforces this on every change.                    | Specifiers built at runtime, and what is reached _through_ the entry point. The `jest.mock` paths are coupling to internal file paths: PRED-1356 file moves will break those tests, not product code. | Lint fence on every PR. The journey test mounts every external surface through the entry point.                 |
| Route names          | `Routes.PREDICT.*` in production only in `MainNavigator.tsx` (registers `ROOT` and `MODALS.ROOT`), and `stack: Routes.PREDICT.ROOT` as the return route of two legacy confirmation entries (`useMoneyPredictDeposit.ts`, developer options). `NavigationService/types.ts` lists the route names as types.                                                               | No product caller navigates to a legacy Predict screen by name; every entry goes through an intent.                                                          | Where intents and deep links resolve at runtime. Route strings built at runtime.                                                                                                                      | Journey test (the balance row and a search result open the right screen per Venue). Device: warm link dispatch. |
| Messenger names      | Composition only: Engine init and messengers, `Engine/constants.ts` (state-change events), `transaction-controller-messenger.ts` with `util/transactions/hooks/index.ts` (legacy `beforeSign`, `beforePublish`, `publish`), `Authentication.ts` (`PredictDeviceAuthService:reset`, documented wallet-reset wiring).                                                     | No product caller reaches a Predict controller or service through the messenger.                                                                             | Calls made with a computed action string, and whether a delegated action is registered at runtime.                                                                                                    | Existing Engine init and messenger tests. The journey test proves the inactive stack makes no reads.            |
| Transaction enums    | `predictDeposit` (40 files), `predictWithdraw` (38), `predictDepositAndOrder` (18), `predictClaim` (16), `predictRelayDeposit` (3), `predictAcrossDeposit` (1): confirmations, transaction metrics, Activity enrichment, `NotificationManager`, `TransactionElement`, Money guards, Ramp `fiatDepositAsset`, `get-balance-callback`. All legacy Polymarket money flows. | No Kalshi path reuses a Polymarket transaction type (a PRED-1389 requirement). The full list of places that classify a Polymarket transaction for PRED-1356. | That those classifications fit a future PredictNext Polymarket funding flow. That is a PRED-1356 design decision.                                                                                     | Existing confirmation and Activity tests.                                                                       |

What text search cannot see at all, and how it is covered:

- **Which branch runs.** Every public API picks its branch at runtime from `selectActiveVenue`. The cross-surface journey (`PredictNext/closure/PredictCrossSurface.view.test.tsx`) mounts every external surface on one store, switches Venue with the picker and asserts that every surface follows. A mutation check confirms it fails when any one of nine Venue guards is broken (the Explore feed, the All Sports capability, autocomplete, the Home section, BalanceBreakdown, Activity, entry intents, the root route, the Venue map).
- **Native boundaries.** Link dispatch and process death are covered by device evidence, below.

## Cross-surface journey (component view)

`app/components/UI/PredictNext/closure/PredictCrossSurface.view.test.tsx`, renderer `tests/component-view/renderers/predictCrossSurface.tsx`.

A single screen hosts every surface outside Predict that shows Predict data: BalanceBreakdown, the Homepage Predictions section, Explore's Sports tab, Browser URL autocomplete and the Predictions Activity list. Behind it sits the real root `Predict` route, as `MainNavigator` registers it. Both stacks answer through the mocked Engine, each with data the other never serves. The journey:

1. **Polymarket** (non-US session, both Venues rolled out, picker on): every surface shows Polymarket's data, Explore shows All Sports, and Kalshi's services receive no reads.
2. Tap the Predictions balance row, open the **venue picker** in the legacy header, choose **Kalshi**, land on PredictNext Home, go back.
3. **Kalshi**: every surface shows Kalshi's data (the position row, the Summary total `$168.13` rather than a sum, the NFL card, the Kalshi search row, the `-$28.28` trade). No Polymarket title is left on any surface. Capabilities Kalshi lacks are absent: no All Sports list, no Claim, no Add funds. The legacy controller receives no further reads. A Kalshi search result opens the PredictNext Event screen, not the legacy market details. The balance row opens PredictNext Home.
4. Pick **Polymarket** again: every surface returns to exactly what it showed in step 1 (balance row, Activity row title, subtitle and amount, All Sports, position row), Kalshi receives no further reads, and a Polymarket search result opens the legacy market details.

## Device evidence (native boundaries only)

Run with skulk on `20cd4c6c047` (origin/main, the base of this branch; this branch changes no runtime code), iOS simulator and Android emulator. Dev client built from `2f8ee36`, so native code may differ; no native crash in either session.

| Check                                                             | iOS        | Android    |
| ----------------------------------------------------------------- | ---------- | ---------- |
| Warm link `?venue=kalshi` opens PredictNext Home (Kalshi active)  | PASS       | PASS       |
| Warm link `?market=<id>` shows Market unavailable (Kalshi active) | PASS       | PASS       |
| Warm link `?market=<id>` opens legacy details (legacy lane)       | PASS       | PASS       |
| Warm link `?venue=kalshi` shows Market unavailable (legacy lane)  | PASS       | PASS       |
| Cold link `?venue=kalshi` (app launched by the link)              | UNVERIFIED | UNVERIFIED |
| Cold link `?market=<id>` (Kalshi active)                          | UNVERIFIED | UNVERIFIED |
| Venue choice survives a process kill                              | UNVERIFIED | UNVERIFIED |
| No Kalshi order operation resurrected after a kill                | PASS       | PASS       |

Why three checks are UNVERIFIED: skulk cannot launch the app _by_ a link (it refuses `open_url` while the app is closed), and a link sent while the app is on the login screen is dropped. Every skulk `relaunch` also clears the app's persisted store, so it cannot observe persistence across a kill. The app does log that `PredictVenueController` state was persisted. Cold-start dispatch belongs to PRED-1294 and PRED-1164; this page does not claim it.

## PRED-1356 deletion checklist

Goal: change `polymarket: 'legacy'` to `polymarket: 'next'` and delete the legacy code **without touching a product caller**. A product caller is any file outside `UI/Predict/` and `UI/PredictNext/` that is not in the composition allowlist. Today every such file imports only the entry point, and the fence keeps it that way.

### 0. Before

- [ ] The PredictNext Polymarket adapter serves the canonical contract (catalog, Feeds, search, Positions, Portfolio Summary, Activity, Orders), per the [feasibility table](./canonical-portfolio-activity-catalog-contract.md#polymarket-feasibility-pred-1356) and [Inputs for PRED-1356](./public-api-contract.md#inputs-for-pred-1356-polymarket-backend-adapter).
- [ ] `POLYMARKET_STATIC_VENUE_CATALOG` (`config/venueCatalogs.ts`) is replaced by the backend catalog, and `PREDICT_SURFACE_FEED_KEYS` maps every Polymarket surface (Homepage slots including World Cup and BTC up/down, Explore tabs, campaign rows) to a Feed key the catalog serves.
- [ ] Polymarket funding (deposit, withdraw, claim) has a `next` flow and a `PREDICT_FUNDING_IMPLEMENTATIONS.next` entry.

### 1. Flip the map (the only switch)

- [ ] `implementation/venueImplementations.ts`: `polymarket: 'legacy'` → `polymarket: 'next'`.
- [ ] Run the cross-surface journey. It must pass with a Polymarket fixture served through the PredictNext services instead of `Engine.context.PredictController`. Its assertions are written per surface, not per stack, so only its fixtures change.
- [ ] `git diff --stat` touches nothing outside `UI/Predict/`, `UI/PredictNext/` and the allowlist, and `node scripts/predict-closure-scan.js` still reports 0 production files outside the lists.

### 2. Delete each public API's legacy branch (inside PredictNext)

Each one is an `internal/legacy/` folder plus the `legacy` arm of a `PredictImplementationSwitch` or projection hook. Its public signature does not change.

| Public API                                                                                                 | Legacy branch to delete                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PredictRoot`                                                                                              | `legacy={<LegacyPredictScreenStack />}` (`Predict/routes`)                                                                                           |
| `selectPredictAvailability`, `usePredictAvailability`                                                      | The `selectPredictEnabledFlag` arm, then the `predictTradingEnabled` flag ([flag semantics](./active-venue.md#flag-semantics-during-the-transition)) |
| `openPredict`, `usePredictEntryActions`, `parsePredictLink`, `resolvePredictLinkFromStore`                 | `navigation/entry/internal/legacy/` (`resolveLegacyIntent`), `createLegacyPredictEventRef`                                                           |
| `PredictHomeSection`, UI Slot widget                                                                       | `legacy={<PredictionsSection />}` and `Predict/homeSection/`                                                                                         |
| `PredictTrending*`, `usePredictTrendingFeed`, `usePredictSportsMarketsFeed`, `usePredictTrendingSupported` | `trending/internal/legacyMarkets.ts`, `Predict/trending/`, the `allSports` legacy-only surface                                                       |
| `usePredictSearchResults`, `PredictSearchResultRow`                                                        | `searchResults/internal/legacy/`                                                                                                                     |
| `usePredictPortfolioValue`                                                                                 | `portfolio/internal/legacy/`                                                                                                                         |
| `usePredictActivityItems`, `usePredictActivityDetailsItem`, `PredictActivityDetails`                       | `activity/internal/legacy/` (mappers and details templates)                                                                                          |
| `usePredictLegacyDeposit`, `usePredictLegacyDepositEligibility`                                            | Replace with the `next` funding gate under the same names, or rename at the four callers listed in step 4                                            |
| `usePredictCampaignEligibility`, `createPredictCampaignEventRef`                                           | The legacy eligibility arm; `campaignVenues.ts` keeps naming Polymarket                                                                              |
| `PredictEventProperties`, `PredictEventValues`                                                             | Keep: the values are permanent                                                                                                                       |

- [ ] Delete the `expectInactiveHookHasNoSideEffects` tests (`implementation/inactiveHook.testUtils.ts`) that only prove a legacy hook idles.
- [ ] `PredictImplementationSwitch` with one implementation: keep it (it still remounts on a Venue change) or inline it. No caller sees the difference.

### 3. Delete the composition wiring

- [ ] `legacyController`: delete the init and messenger files, remove the entries from `Engine.ts`, `types.ts`, `messengers/index.ts` and `constants.ts`, add the store migration that drops `PredictController` state, remove the state-log deletion and the test fixture.
- [ ] `legacyTransactionHooks`: replace or delete `polymarket-callbacks.ts`, remove the three delegations from `transaction-controller-messenger.ts` **and** the three calls from `util/transactions/hooks/index.ts` in the same change, move `get-balance-callback.ts`'s `predictWithdraw` source.
- [ ] `toastRegistration`: remove `usePredictToastRegistrations` from `App.tsx`.
- [ ] `navigatorRegistration`: replace `PredictModalStack` and `PredictPreviewSheetProvider` in `MainNavigator.tsx`, then delete the legacy `Routes.PREDICT.*` names and their `NavigationService` param types.
- [ ] `uiSlotsRegistries`: repoint `contractRegistry.ts` if the contracts move.
- [ ] `legacyConfirmations`: move to canonical funding contracts (PRED-1389 criteria). Re-check the `TransactionType.predict*` classifications listed under the transaction-enum scan for the new flow.
- [ ] Delete `app/components/UI/Predict/` and remove `PREDICT_DIR` from the fence. The test that every composition file still imports Predict internals will flag each file whose wiring is gone; remove it from its group (and this page) as you go.

### 4. Product callers: expected diff is empty

`node scripts/predict-closure-scan.js --json` lists them (`entryPointOnly`, 44 files today). None should change. They are: Activity (`ActivityList`, `ActivityDetails`, its `TemplateLoader`, the Activity empty state), Homepage (`Homepage.tsx`, the BalanceBreakdown `usePredictSlice`, its navigation, the discovery pills, the action-grid Predict button), Explore (`TrendingView` tabs, search rows, `useExploreSearch`, `predictionsNavigation`), `TradeWalletActions`, `WalletActions`, `BrowserTab`, `UrlAutocomplete`, the Rewards campaign CTA, rows and constants, Money's `MoneyTransferSheet`, `handlePredictUrl` and `NavigationService/types.ts` (`PredictAppRouteParamList`), plus their tests.

Known exception: if PRED-1356 renames `usePredictLegacyDeposit` (the name says "legacy"), its four callers change (`MoneyTransferSheet.tsx`, `usePayWithPredictSection.tsx`, `useMoneyPredictDeposit.ts`, and the latter two are composition files anyway). Keeping the name avoids it.

Test-only coupling that **will** need edits when files move, though no product code does (the scan's `testOnly` list): 17 unit tests that `jest.mock` internal paths (`App.test.tsx`, `MainNavigator.test.tsx`, `SignUp.test.tsx`, `MoneyTransferSheet.pendingTransaction.test.tsx`, `UiSlotRenderer.test.tsx`, `Homepage.test.tsx`, `HomepageBalanceBreakdown.test.tsx`, `useHomepageDiscoveryPillsNavigation.test.ts`, `TradeWalletActions.test.tsx`, `SearchFeedRow.test.tsx`, `useExploreSearch.test.ts`, `CryptoTab.test.tsx`, `NowTab.test.tsx`, `SportsTab.test.tsx`, `custom-amount-info.test.tsx`, `predict-account-picker-row.test.tsx`, `handlePredictUrl.test.ts`), the `tests/component-view` fixtures and renderers, `tests/integration/harnesses/predict-next.ts` and the Appium page objects under `tests/page-objects/`.
