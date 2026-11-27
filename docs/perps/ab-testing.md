# Perps A/B tests

Perps A/B tests follow the shared Mobile standard.

- [A/B Testing Framework](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400743989262/A+B+Testing+Framework), the Mobile and Extension framework
- [`docs/ab-testing.md`](../ab-testing.md), the source of truth for implementation, LaunchDarkly setup and analytics rules
- [`app/components/UI/Perps/abTestConfig.ts`](../../app/components/UI/Perps/abTestConfig.ts), the Perps test configuration

The Perps-local `usePerpsABTest` hook is gone. Perps uses the shared `useABTest` (TAT-3308).

## Active tests

| Flag key (Redux / `useABTest`)            | Variants               | Purpose                                                                            | Consume via                         |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `perpsTAT3938AbtestScreenVsBottomSheet`   | `control`, `treatment` | Shared screen vs bottom-sheet experience                                           | `usePerpsScreenVsBottomSheetAbTest` |
| `perpsTAT3793AbtestPerpsHomeExplore`      | `control`, `treatment` | Perps home Explore table replacing stacked market sections (TAT-3793)              | `usePerpsHomeExploreAbTest`         |
| `perpsTAT4046AbtestFeeDisplayFormat`      | `control`, `treatment` | Order fee row as dollars or taker/maker percentages                                | `usePerpsFeeDisplayAbTest`          |
| `perpsTAT4267AbtestLiveTrades`            | `control`, `treatment` | Live trades tab first and default in the Social section (TAT-4267)                 | `usePerpsLiveTradesAbTest`          |
| `perpsTAT4021AbtestPerpsHeaderMarketList` | `control`, `treatment` | Pro entry points open the market list instead of the last-viewed market (TAT-4021) | `usePerpsHeaderEntryNavigation`     |
| `perpsTAT3597AbtestPerpsSectionPriority`  | `control`, `treatment` | Perps section above Tokens on wallet home for eligible traders (TAT-3597)          | `Homepage`                          |

The `perpsTAT1937AbtestButtonColor` experiment has concluded and no code reads it.

Code: `app/components/UI/Perps/abTestConfig.ts`; `app/components/UI/Perps/hooks/index.ts`; `app/components/Views/Homepage/abTestConfig.ts`; `app/hooks/useABTest.ts` `useABTest`

## Pro entry market list (`perpsTAT4021AbtestPerpsHeaderMarketList`)

In treatment, these Pro-mode entries open the market list:

- the wallet-home Perps section header, balance-breakdown row and homepage Perps button
- the wallet actions sheet and the trade menu
- the Lite-to-Pro switch on the Perps Home pill and the mode chooser

The list starts on Watchlist when the watchlist feature is on and the watchlist is not empty, otherwise on All. Control keeps the last-viewed market, or BTC.

Exposure works as follows.

- The hook always reads the assignment.
- `trackExposure` defaults to Pro-mode eligibility, so Lite users are not enrolled and keep their navigation.
- For Pro users, Experiment Viewed fires when an entry component mounts, not on tap. That covers the Perps section, balance breakdown, homepage Perps button, wallet actions sheet and trade menu.
- The Lite pill and the mode chooser pass `trackExposure` as state that starts `false`, and arm it only after the user commits to Pro.

Deeplinks, discovery pills, position/order cards and the market-details switcher stay out of scope and use `getPerpsHomeNavigationTarget`. Missing or invalid flags fall back to control. `PERPS_UI_INTERACTION`, `PERPS_SCREEN_VIEWED` and `PERPS_TRADE_TRANSACTION` are enriched only when `perps_mode` is `pro`.

Code: `app/components/UI/Perps/hooks/usePerpsHeaderEntryNavigation.ts` `usePerpsHeaderEntryNavigation`, `getProSwitchTarget`; `app/components/UI/Perps/abTestConfig.ts` `PERPS_HEADER_AB_TEST_ANALYTICS_MAPPING`; `app/components/Views/Homepage/Sections/Perpetuals/hooks/usePerpsNavigationHandlers.ts`; `app/components/Views/Homepage/components/HomepageActionButtonsGrid/buttons/PerpsButton.tsx`; `app/components/Views/WalletActions/WalletActions.tsx`; `app/components/Views/TradeWalletActions/TradeWalletActions.tsx`; `app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx`; `app/components/UI/Perps/Views/PerpsModeSelectionView/PerpsModeSelectionView.tsx`

## Screen vs bottom sheet (`perpsTAT3938AbtestScreenVsBottomSheet`)

One experiment covers every Perps flow converting from a full page to a bottom sheet. Close Position (TAT-3552) was first. Do not define a new experiment per conversion. The key follows `{team}{TICKET}Abtest{TestName}` with TAT-3938 as the setup ticket, and later conversion tickets reuse it.

Assignment is independent of Lite/Pro mode. Mode comes from `selectPerpsProModeEnabledFlag` (`selectors/featureFlags`) and `useIsPerpsProModeActive()` (`utils/perpsModeSwitch.ts`). A treatment user in either mode gets that mode's sheets. Control users in both modes keep full-page flows.

Code: `app/components/UI/Perps/abTestConfig.ts` `PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY`; `app/components/UI/Perps/selectors/featureFlags/index.ts` `selectPerpsProModeEnabledFlag`; `app/components/UI/Perps/utils/perpsModeSwitch.ts` `useIsPerpsProModeActive`

### LaunchDarkly

The flag is a JSON threshold array (format in [`docs/ab-testing.md`](../ab-testing.md)). The feature-flag registry records the production value as `inProd: true`, version-gated to `8.15.0`, with control threshold `1` and treatment threshold `0`. That serves 0% treatment. Keep treatment at 0% until product signs off. Missing or invalid flags fall back to `control` in `useABTest`.

Code: `tests/feature-flags/feature-flag-registry.ts` `perpsTAT3938AbtestScreenVsBottomSheet`; `app/hooks/useABTest.ts`

### Shared hook

Import `usePerpsScreenVsBottomSheetAbTest` from `app/components/UI/Perps/hooks`. Do not call `useABTest` with this flag from conversion tickets.

```typescript
const { useBottomSheet } = usePerpsScreenVsBottomSheetAbTest();
```

- `useBottomSheet` is `true` only for treatment.
- Route only on `useBottomSheet`. A `control` assignment is still an active assignment and keeps the screen.
- `useABTest` emits Experiment Viewed once per `experiment_id` + `variation_id` per app session.
- `{ trackExposure: false }` resolves the assignment without exposure.

Code: `app/components/UI/Perps/hooks/usePerpsScreenVsBottomSheetAbTest.ts`; `app/hooks/useABTest.ts` `trackedExposureAssignments`

### Router-swap pattern

Keep one route and the same params. Swap the component in a thin router, as `PerpsMarketDetailsRouter` swaps `PerpsProMarketView` and `PerpsMarketDetailsView`. The worked example is `PerpsClosePositionRouter` (TAT-3552). It has no Lite/Pro branch because both modes share one close screen.

- Register the existing `Routes.PERPS.*` name on the router, not a new treatment-only route.
- Branch on Lite/Pro only for which sheet or page a mode owns, never for whether the experiment applies.
- Control (`useBottomSheet === false`) keeps the full-page UI in both modes.
- Keep each flow's non-visual logic in one hook both variants use. `usePerpsClosePositionForm` takes a `dismiss` override so the sheet animates closed before the route pops.

Screen options come in two forms.

- `PerpsScreenStack` resolves the assignment once with `{ trackExposure: false }`. `CLOSE_POSITION` passes it through the exported `getPerpsConversionScreenOptions` for the transparent presentation. The router owns exposure, and it mounts only when the flow opens.
- `TPSL`, `ADJUST_MARGIN` and the modify flow get `useBottomSheet` from the caller as a route param, read by `getTpslOptions` and `getAdjustMarginOptions`. Lite order-placement callers omit it, so they never read the experiment.

Code: `app/components/UI/Perps/Views/PerpsClosePositionRouter/PerpsClosePositionRouter.tsx`; `app/components/UI/Perps/Views/PerpsTPSLRouter/PerpsTPSLRouter.tsx`; `app/components/UI/Perps/routes/index.tsx` `PerpsScreenStack`, `getPerpsConversionScreenOptions`, `getTpslOptions`, `getAdjustMarginOptions`, `PerpsAdjustMarginRouter`; `app/components/UI/Perps/hooks/usePerpsClosePositionForm.ts`

### Analytics

`SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING` is registered in `abTestAnalyticsRegistry.ts`. It adds `active_ab_tests` to five events:

- Perp Position Close Transaction
- Perp Margin Adjustment Transaction
- Perp Transaction Considered
- Perp Trade Quote Received
- Perp Trade Transaction

Core emits Perps events through `trackPerpsEvent`. The Mobile adapter calls `analytics.trackEvent`, so registry enrichment applies.

When another flow adopts the shared hook, add only that flow's conversion event to the mapping and cover it with an enrichment test. If a conversion bypasses the shared analytics wrappers, wire its assignment per [`docs/ab-testing.md`](../ab-testing.md). Do not add custom tracker APIs to the shared hook or new `ab_tests` payloads.

Code: `app/components/UI/Perps/abTestConfig.ts` `SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING`; `app/util/analytics/abTestAnalyticsRegistry.ts` `AB_TEST_ANALYTICS_MAPPINGS`; `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `createMobileMetrics`

## Perps section priority (`perpsTAT3597AbtestPerpsSectionPriority`)

Places the Perps section above Tokens on wallet home for active Perps traders. Config lives in `app/components/Views/Homepage/abTestConfig.ts` because the homepage layout owns it.

### Reading the results

- The primary readout is intent to treat. `Homepage` calls `useABTest` for every assigned user on wallet home, so Experiment Viewed fires for users who are not eligible or have Perps off. They all get the control layout. Eligibility is activity-based and treatment can change it on later visits, so gating exposure on it would condition the population on an outcome.
- The eligible subgroup is a secondary cut on `perps_priority_eligible`. That property rides every `section_viewed` event, not only the Perps section's.
- Eligibility describes the person, not the selected account. `evaluateIsActivePerpsTrader` falls back to a wallet-wide recent-action timestamp when the selected account holds no positions or resting orders. Both arms are affected the same way.
- Eligibility is captured before section order is decided, through `useIsActivePerpsTrader` in `Homepage.tsx` and `PerpsPriorityEligibilityContext`. A user whose Perps data has not loaded and who has no recent Perps action stays in the control layout for that visit and is reported ineligible. This reduces treatment reach without moving users between arms. The hook refreshes on focus.

Code: `app/components/Views/Homepage/abTestConfig.ts`; `app/components/Views/Homepage/Homepage.tsx`; `app/components/Views/Homepage/hooks/useHomeViewedEvent.ts`; `app/components/UI/Perps/hooks/useIsActivePerpsTrader.ts` `evaluateIsActivePerpsTrader`; `app/components/UI/Perps/utils/perpsActivityStorage.ts`
