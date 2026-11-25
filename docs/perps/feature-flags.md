# Perps feature flags

This file lists the flags Mobile reads through Redux selectors, env variables and A/B tests. Flags the controller reads (HIP-3, geo-blocking, Lighter registration, multi-provider mode, subscription fee waiver) are in Core [contracts/feature-flags.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/feature-flags.md).

## How a selector resolves a flag

1. LaunchDarkly serves the flag. `RemoteFeatureFlagController` stores it in Redux; `selectRemoteFeatureFlags` reads it.
2. The selector passes the value to `validatedVersionGatedFeatureFlag`. It accepts `{ enabled, minimumVersion }` or the progressive-rollout wrapper `{ name, value: { enabled, minimumVersion } }`, and returns `enabled` and app version at least `minimumVersion` (`getVersion()` from `react-native-device-info`).
3. It returns `undefined` when the flag is missing or a field has the wrong type, and for every flag when `OVERRIDE_REMOTE_FEATURE_FLAGS=true`. The selector then uses its env value or its default. An empty `minimumVersion` passes the type check and returns `false`, so the fallback is not used.

```typescript
export const selectPerpsOrderBookEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_ORDER_BOOK_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsOrderBookEnabled as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
```

A valid remote flag always wins over the env value. Use the helper, not an inline version compare.

Code: `app/util/remoteFeatureFlag/index.ts` `validatedVersionGatedFeatureFlag`, `isVersionGatedFeatureFlag`, `hasMinimumRequiredVersion`; `app/core/Engine/controllers/remote-feature-flag-controller/utils.ts` `isRemoteFeatureFlagOverrideActivated`; `app/components/UI/Perps/selectors/featureFlags/index.ts`.

## Version-gated flags

Redux key, selector, env fallback and default (flag missing, a field of the wrong type, or overridden). Every flag below is version-gated.

| Redux key                                          | Selector                                             | Env fallback                                   | Default |
| -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ------- |
| `perpsPerpTradingEnabled`                          | `selectPerpsEnabledFlag`                             | `MM_PERPS_ENABLED`                             | false   |
| `perpsPerpTradingServiceInterruptionBannerEnabled` | `selectPerpsServiceInterruptionBannerEnabledFlag`    | `MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED` | false   |
| `perpsPerpGtmOnboardingModalEnabled`               | `selectPerpsGtmOnboardingModalEnabledFlag`           | `MM_PERPS_GTM_MODAL_ENABLED`                   | false   |
| `perpsOrderBookEnabled`                            | `selectPerpsOrderBookEnabledFlag`                    | `MM_PERPS_ORDER_BOOK_ENABLED`                  | false   |
| `perpsFeedbackEnabled`                             | `selectPerpsFeedbackEnabledFlag`                     | `MM_PERPS_FEEDBACK_ENABLED`                    | false   |
| `perpsRelatedMarkets`                              | `selectPerpsRelatedMarketsEnabledFlag`               | `MM_PERPS_RELATED_MARKETS_ENABLED`             | false   |
| `perpsRecentlyViewedEnabled`                       | `selectPerpsRecentlyViewedEnabledFlag`               | `MM_PERPS_RECENTLY_VIEWED_ENABLED`             | false   |
| `perpsTradeWithAnyTokenIsEnabled`                  | `selectPerpsTradeWithAnyTokenEnabledFlag`            | `MM_PERPS_TRADE_WITH_ANY_TOKEN_ENABLED`        | false   |
| `perpsLighterProviderEnabled`                      | `selectPerpsLighterProviderEnabledFlag`              | `MM_PERPS_LIGHTER_PROVIDER_ENABLED`            | false   |
| `perpsProModeEnabled`                              | `selectPerpsProModeEnabledFlag`                      | none                                           | false   |
| `perpsProTriggeredOrdersEnabled`                   | `selectPerpsProTriggeredOrdersEnabledFlag`           | none                                           | false   |
| `perpsMobileScale`                                 | `selectPerpsMobileScaleEnabledFlag`                  | none                                           | false   |
| `perpsMobileTwap`                                  | `selectPerpsProTwapEnabledFlag`                      | none                                           | false   |
| `perpsMobileChase`                                 | `selectPerpsMobileChaseEnabledFlag`                  | none                                           | false   |
| `perpsPositionModifyPreviewEnabled`                | `selectPerpsPositionModifyPreviewEnabledFlag`        | none                                           | false   |
| `perpsCrossMarginEnabled`                          | `selectPerpsCrossMarginEnabledFlag`                  | none                                           | false   |
| `perpsAdvancedChartEnabledV2`                      | `selectPerpsAdvancedChartEnabledFlag`                | none                                           | false   |
| `perpsShowFullAssetNames`                          | `selectPerpsShowFullAssetNamesFlag`                  | none                                           | false   |
| `perpsClosePositionLimitOrderEnabled`              | `selectPerpsClosePositionLimitOrderEnabledFlag`      | none                                           | false   |
| `perpsCompetitionBannerEnabled`                    | `selectPerpsCompetitionBannerEnabledFlag`            | none                                           | false   |
| `perpsProductsEnabled`                             | `selectPerpsProductsEnabledFlag`                     | none                                           | false   |
| `perpsTopMoversEnabled`                            | `selectPerpsTopMoversEnabledFlag`                    | none                                           | false   |
| `perpsRecentlyAddedEnabled`                        | `selectPerpsRecentlyAddedEnabledFlag`                | none                                           | false   |
| `perpsWatchlistV2Enabled`                          | `selectPerpsWatchlistEnabledFlag`                    | none                                           | false   |
| `perpsTerminalBackendEnabled`                      | `selectPerpsTerminalBackendEnabledFlag`              | none                                           | false   |
| `perpsPriceAlertsEnabled`                          | `selectPerpsPriceAlertsEnabledFlag`                  | none                                           | false   |
| `perpsPriceAlertsPercentChangeEnabled`             | `selectPerpsPriceAlertsPercentChangeEnabledFlag`     | none                                           | false   |
| `perpsSocialEnabled`                               | `selectPerpsSocialEnabledFlag`                       | none                                           | false   |
| `perpsDefaultPayTokenWhenNoBalanceEnabled`         | `selectPerpsDefaultPayTokenWhenNoBalanceEnabledFlag` | none                                           | true    |

- Scale, TWAP, Chase, position-modify preview and cross margin are independent. Enabling one enables no other.
- Social UI gates on `usePerpsSocialEnabled`, never on the flag. It is true only when `perpsSocialEnabled` is on and the user is in the Social V1 treatment (`socialAiTSA1122AbtestSocialBundleV1`). Non-React code uses `selectIsPerpsSocialEnabled`.
- Lighter is selectable only when `MM_PERPS_LIGHTER_PROVIDER_ENABLED` is `true` at build time and `selectPerpsLighterProviderEnabledFlag` is true. See [lighter-api-keys.md](./lighter-api-keys.md). Core reads the same remote flag; see Core [contracts/feature-flags.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/feature-flags.md).
- `perpsTerminalBackendEnabled` is passed as `useTerminalApi` on the stream manager's market and price fetches, and is part of `MarketDataChannel`'s source key. The schema-v4 snapshot is not a flag; see [Env passed to Core](#env-passed-to-core).
- `vipProgramEnabled` is not a Perps selector. `selectVipProgramEnabled` drives `RewardsController`'s `isVipDisabled`, which changes the Perps fee discount indirectly.

Code: `app/components/UI/Perps/selectors/featureFlags/index.ts`; `app/components/UI/Perps/hooks/usePerpsSocialEnabled.ts`; `app/constants/socialV1.ts` `SOCIAL_V1_AB_KEY`; `app/components/UI/Perps/hooks/usePerpsProvider.ts`; `app/selectors/featureFlagController/vipProgram/index.ts` `selectVipProgramEnabled`; `app/core/Engine/controllers/rewards-controller/index.ts`.

## Other Mobile-read values

| Value                                 | Read by                                     | Behaviour                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `perpsPayWithAnyTokenAllowlistAssets` | `selectPerpsPayWithAnyTokenAllowlistAssets` | Not version-gated. A non-empty `MM_PERPS_PAY_WITH_ANY_TOKEN_ALLOWLIST_ASSETS` (`chainId.address`, comma-separated) overrides the remote list. Empty everywhere means no allowlist. |
| `hip3ConfigVersion`                   | `selectHip3ConfigVersion`                   | Controller state, not a flag. `PerpsConnectionManager` reconnects when it changes.                                                                                                 |

Code: `app/components/UI/Perps/selectors/featureFlags/index.ts` `selectPerpsPayWithAnyTokenAllowlistAssets`, `selectHip3ConfigVersion`; `app/components/UI/Perps/utils/lighterFeatureFlags.ts`.

## Env passed to Core

`createMobileClientConfig` reads these at startup and hands them to the controller. Core decides how remote flags override them.

| Env variable                                                                 | Controller config                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `MM_PERPS_BLOCKED_REGIONS`                                                   | `fallbackBlockedRegions`                                                                     |
| `MM_PERPS_HIP3_ENABLED`                                                      | `fallbackHip3Enabled`                                                                        |
| `MM_PERPS_HIP3_ALLOWLIST_MARKETS`                                            | `fallbackHip3AllowlistMarkets`                                                               |
| `MM_PERPS_HIP3_BLOCKLIST_MARKETS`                                            | `fallbackHip3BlocklistMarkets`                                                               |
| `MM_PERPS_HL_BUILDER_ADDRESS_TESTNET`, `MM_PERPS_HL_BUILDER_ADDRESS_MAINNET` | `providerCredentials.hyperliquid` builder addresses                                          |
| `MM_PERPS_LIGHTER_*`                                                         | `providerCredentials.lighter`. See [lighter-api-keys.md](./lighter-api-keys.md).             |
| `MM_PERPS_TERMINAL_GLOBAL_SNAPSHOT_URL`                                      | Replaces `terminalApi.globalSnapshotUrl` in dev bundles with `METAMASK_ENVIRONMENT=dev` only |

Code: `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `createMobileClientConfig`, `createMobileInfrastructure`; `app/core/Engine/controllers/rewards-controller/utils/hyperliquid-builder-address.ts`; `app/components/UI/Perps/constants/terminalApi.ts` `getTerminalGlobalSnapshotUrl`.

## A/B test flags

A/B flags are JSON variant flags read through `useABTest`; the LaunchDarkly key equals the Redux key. Consume each one only through its hook. The events each test tags are in [instrumentation.md](./instrumentation.md#ab-registry).

| Flag key                                  | Hook                                | Control                             | Treatment                                              |
| ----------------------------------------- | ----------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| `perpsTAT3938AbtestScreenVsBottomSheet`   | `usePerpsScreenVsBottomSheetAbTest` | Full-page screens                   | Bottom sheets                                          |
| `perpsTAT4021AbtestPerpsHeaderMarketList` | `usePerpsHeaderEntryNavigation`     | Header opens the last viewed market | Header opens the market list                           |
| `perpsTAT3793AbtestPerpsHomeExplore`      | `usePerpsHomeExploreAbTest`         | Stacked sections                    | Explore table                                          |
| `perpsTAT4046AbtestFeeDisplayFormat`      | `usePerpsFeeDisplayAbTest`          | Dollar fee                          | Taker and maker percentage                             |
| `perpsTAT4267AbtestLiveTrades`            | `usePerpsLiveTradesAbTest`          | Trending first                      | Live trades first                                      |
| `perpsTAT3597AbtestPerpsSectionPriority`  | `useABTest` in `Homepage`           | Perps section in its usual place    | Perps section may move above tokens for active traders |

The button-colour test `perpsTAT1937AbtestButtonColor` has concluded. Long and Short use the success and error palettes. See [ab-testing.md](./ab-testing.md) for the framework.

Code: `app/components/UI/Perps/abTestConfig.ts`; `app/components/UI/Perps/hooks/usePerpsScreenVsBottomSheetAbTest.ts`; `app/components/UI/Perps/hooks/usePerpsHeaderEntryNavigation.ts`; `app/components/UI/Perps/hooks/usePerpsHomeExploreAbTest.ts`; `app/components/UI/Perps/hooks/usePerpsFeeDisplayAbTest.ts`; `app/components/UI/Perps/hooks/usePerpsLiveTradesAbTest.ts`; `app/components/Views/Homepage/abTestConfig.ts` `PERPS_SECTION_PRIORITY_AB_KEY`; `app/components/Views/Homepage/Homepage.tsx`; `app/hooks/useABTest.ts`.

## Adding a flag

1. Add a selector to `app/components/UI/Perps/selectors/featureFlags/index.ts` with `validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback`. Env fallbacks compare with `=== 'true'`, so they default off.
2. If it has an env fallback, add it to `.js.env.example` under `## Perps`.
3. Add it to `mockedPerpsFeatureFlagsEnabledState` with `mockEnabledPerpsLDFlag` and cover it in the selector tests.
4. If the controller must read it, add it in Core instead and list it in Core [contracts/feature-flags.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/feature-flags.md).
5. Add the row to this file.

Restart Metro after changing `.js.env`.

Code: `app/components/UI/Perps/selectors/featureFlags/index.ts`; `app/components/UI/Perps/selectors/featureFlags/index.test.ts`; `app/components/UI/Perps/mocks/remoteFeatureFlagMocks.ts` `mockedPerpsFeatureFlagsEnabledState`; `.js.env.example`.
