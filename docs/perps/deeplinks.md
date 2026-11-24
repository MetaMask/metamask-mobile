# Perps deeplinks

## Hosts and paths

| Environment | Host                            |
| ----------- | ------------------------------- |
| Production  | `https://link.metamask.io`      |
| Test        | `https://link-test.metamask.io` |

| Path                               | Handling                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/perps`                           | `handlePerpsUrl`                                                                                        |
| `/perps-markets`                   | `handlePerpsUrl`, same as `/perps`                                                                      |
| `/perps-asset?symbol=X[&mode=pro]` | Rewritten to `perps?screen=asset&symbol=X[&mode=pro]`, keeping every query param, then `handlePerpsUrl` |
| `/perps-outreach`                  | `handlePerpsOutreachUrl`, opens `MODALS.OUTREACH_DETAILS`                                               |

Code: `app/core/AppConstants.ts` `MM_IO_UNIVERSAL_LINK_HOST`, `MM_IO_UNIVERSAL_LINK_TEST_HOST`; `app/constants/deeplinks.ts` `PERPS`, `PERPS_MARKETS`, `PERPS_ASSET`, `PERPS_OUTREACH`; `app/core/DeeplinkManager/handlers/handleUniversalLink.ts` `getPerpsAssetPath`, `UNIVERSAL_LINK_ACTION_HANDLERS`; `app/core/DeeplinkManager/handlers/intent/handlePerpsOutreachUrl.ts`

## Screen param

"Perps home target" means `PerpsHomeView` in Lite mode, and `MARKET_DETAILS` with the last-viewed market (else BTC) in Pro mode.

| `screen`            | Target                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| none or `tabs`      | Wallet home with `initialTab: 'perps'` and `shouldSelectPerpsTab: true`. Wallet then opens the Perps home target with `source: 'deeplink'` |
| `home`              | Perps home target                                                                                                                          |
| `markets`           | Perps home target (backwards compatibility)                                                                                                |
| `market-list`       | `MARKET_LIST` (`PerpsMarketListView`), with optional `tab` filter                                                                          |
| `asset`             | `MARKET_DETAILS` (`PerpsMarketDetailsRouter`). Pro mode renders `PerpsProMarketView`                                                       |
| `tutorial`, unknown | Same as none                                                                                                                               |

On the default branch, a `tab` value is set as `specificTab` on wallet home. No code reads it.

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `resolvePerpsTarget`, `perpsHomeTarget`; `app/components/Views/Wallet/index.tsx` `handlePerpsTabDeepLink`

## Market list tab

| `tab`         | Internal `MarketTypeFilter` |
| ------------- | --------------------------- |
| `all`         | `all`                       |
| `crypto`      | `crypto`                    |
| `stocks`      | `stock`                     |
| `commodities` | `commodity`                 |
| `forex`       | `forex`                     |
| `new`         | `new` (uncategorized HIP-3) |

- The filter reaches the list as the `defaultMarketTypeFilter` route param.
- An unknown `tab` applies no filter.
- `all` shows every category, including those with no deeplink value.

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `TAB_TO_FILTER_MAP`; `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx`

## Asset symbol

| URL `symbol` | Resolved `market.symbol`         |
| ------------ | -------------------------------- |
| `BTC`        | `BTC`                            |
| `ETH`        | `ETH`                            |
| `kpepe`      | `kPEPE` (case-insensitive match) |
| `xyz:TSLA`   | `xyz:TSLA`, `marketSource` `xyz` |
| `XYZ:AAPL`   | `xyz:AAPL`                       |

- HIP-3 markets use `dex:symbol`.
- The symbol is matched case-insensitively against the cached market list. On a miss, a symbol already in normalized form (such as `BTC`) is used as is; any other goes to a standalone `getMarkets` call with a 2 s timeout.
- With no match, the handler lowercases the DEX prefix and uppercases the asset.
- `marketSource` comes from `getPerpsDexFromSymbol`.
- A missing `symbol` opens the Perps home target. With `mode=pro` it opens BTC.

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `parseHip3Symbol`, `resolvePerpsSymbol`, `MARKET_FETCH_TIMEOUT_MS`, `buildPerpsMarket`

## `mode=pro`

- When the Pro mode flag is on, `mode=pro` sets Pro mode before navigation (`setPerpsMode(PerpsMode.Pro)`).
- `home`, `markets` and `asset` then resolve to the Pro target.
- On a running app, the handler drops Lite home from the Perps stack history after the market screen is on it.
- With the flag off, the mode stays unchanged.

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `isProModeRequested`, `activateProMode`, `buildPerpsDeeplinkIntent`, `scheduleDropPerpsHomeFromDeeplinkHistory`

## First-time users

First-time users always go to `Routes.PERPS.TUTORIAL`, whatever the URL. The handler passes only `isFromDeeplink: true`, which no screen reads. After the tutorial the user lands on the Perps home target, not the deeplinked screen.

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `resolvePerpsTarget`; `app/components/UI/Perps/components/PerpsTutorialCarousel/PerpsTutorialCarousel.tsx` `navigateAfterTutorial`

## Analytics

Targets inside the Perps stack get `source: 'deeplink'`. The screen reads `route.params.source`, and `usePerpsEventTracking` emits `PERPS_SCREEN_VIEWED` with it.

| Deeplink                        | `screen_type`                                | Other properties                                                     |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| `screen=home`, `screen=markets` | `perps_home` in Lite, `asset_details` in Pro | `source: 'deeplink'`                                                 |
| `screen=market-list`            | `market_list`                                | `source: 'deeplink'`. Fires only when the filtered list is not empty |
| `screen=asset&symbol=BTC`       | `asset_details`                              | `asset: 'BTC'` (Lite view)                                           |
| `screen=asset&symbol=xyz:TSLA`  | `asset_details`                              | `asset: 'xyz:TSLA'`                                                  |

- `handlePerpsUrl` writes UTM params into the controller attribution context.
- With `source=price_alert_notification` and `screen=asset`, it emits `PRICE_ALERT_NOTIFICATION_OPENED`.
- Mobile emission is in [instrumentation.md](./instrumentation.md). Event definitions are in the [Core events contract](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/events.md).

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `perpsScreenTarget`, `handlePerpsUrl`, `trackPriceAlertNotificationIfApplicable`; `app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView.tsx`; `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx`; `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx`; `app/components/UI/Perps/Views/PerpsProMarketView/PerpsProMarketView.tsx`

## Errors

If navigation throws, the handler opens the Perps home target with `source: 'deeplink'`.

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `handlePerpsUrl`

## Testing

```bash
# iOS simulator
xcrun simctl openurl booted "https://link.metamask.io/perps"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=home"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list&tab=crypto"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=asset&symbol=BTC"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA"
xcrun simctl openurl booted "https://link.metamask.io/perps-asset?symbol=ETH&mode=pro"

# Android emulator
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list&tab=stocks"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA"
```

Code: `app/core/DeeplinkManager/handlers/intent/handlePerpsUrl.ts` `handlePerpsUrl`; tests in `app/core/DeeplinkManager/handlers/intent/__tests__/handlePerpsUrl.test.ts`; routes in `app/constants/navigation/Routes.ts` `PERPS`
