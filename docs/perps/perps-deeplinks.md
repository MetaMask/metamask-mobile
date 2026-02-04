# Perps Deeplink Documentation

This document describes the supported deeplink URLs for the MetaMask Perpetuals feature.

## Base URL

**Production:** `https://link.metamask.io/perps`
**Test:** `https://link-test.metamask.io/perps`

## Screen-to-View Mapping

| Screen Param  | Target View             | Description                                  |
| ------------- | ----------------------- | -------------------------------------------- |
| (none)        | Wallet Home → Perps Tab | Default behavior                             |
| `tabs`        | Wallet Home → Perps Tab | Explicit wallet tab navigation               |
| `home`        | PerpsHomeView           | Landing page (positions, orders, watchlist)  |
| `markets`     | PerpsHomeView           | **Backwards compatibility** - same as `home` |
| `market-list` | PerpsMarketListView     | Full market browser with search/filter       |
| `asset`       | PerpsMarketDetailsView  | Single market detail + TradingView chart     |

## Supported URL Formats

### 1. Perps Tab (Wallet Home)

Navigate to the wallet home screen with the Perps tab selected.

| URL                                          | Description                           |
| -------------------------------------------- | ------------------------------------- |
| `https://link.metamask.io/perps`             | Default - Opens wallet with Perps tab |
| `https://link.metamask.io/perps?screen=tabs` | Explicit - Same as above              |

### 2. Perps Home View

Navigate directly to the PerpsHomeView (landing page with positions, orders, watchlist).

| URL                                             | Description                      |
| ----------------------------------------------- | -------------------------------- |
| `https://link.metamask.io/perps?screen=home`    | PerpsHomeView (recommended)      |
| `https://link.metamask.io/perps?screen=markets` | PerpsHomeView (backwards compat) |

### 3. Markets List

Navigate directly to the PerpsMarketListView with optional category filtering.

| URL                                                                 | Description            |
| ------------------------------------------------------------------- | ---------------------- |
| `https://link.metamask.io/perps?screen=market-list`                 | All markets            |
| `https://link.metamask.io/perps?screen=market-list&tab=all`         | All markets (explicit) |
| `https://link.metamask.io/perps?screen=market-list&tab=crypto`      | Crypto markets only    |
| `https://link.metamask.io/perps?screen=market-list&tab=stocks`      | Stocks/equities (HIP3) |
| `https://link.metamask.io/perps?screen=market-list&tab=commodities` | Commodities (HIP3)     |
| `https://link.metamask.io/perps?screen=market-list&tab=forex`       | Forex (HIP3)           |
| `https://link.metamask.io/perps?screen=market-list&tab=new`         | Uncategorized HIP3     |

#### Tab Parameter Values

| Value         | Description                                            | Internal Filter |
| ------------- | ------------------------------------------------------ | --------------- |
| `all`         | All markets (crypto + stocks + commodities + forex)    | `'all'`         |
| `crypto`      | Crypto-only markets (non-HIP3)                         | `'crypto'`      |
| `stocks`      | Stocks/equities (HIP3 markets)                         | `'stocks'`      |
| `commodities` | Commodities (HIP3 markets)                             | `'commodities'` |
| `forex`       | Forex pairs (HIP3 markets)                             | `'forex'`       |
| `new`         | Uncategorized HIP3 markets (not yet assigned category) | `'new'`         |

### 4. Asset Details

Navigate directly to a specific asset's market details page.

| URL                                                             | Description                     |
| --------------------------------------------------------------- | ------------------------------- |
| `https://link.metamask.io/perps?screen=asset&symbol=BTC`        | Bitcoin market details          |
| `https://link.metamask.io/perps?screen=asset&symbol=ETH`        | Ethereum market details         |
| `https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA`   | HIP3 asset (Tesla via xyz DEX)  |
| `https://link.metamask.io/perps?screen=asset&symbol=xyz:xyz100` | HIP3 asset (xyz100 via xyz DEX) |

#### HIP-3 Symbol Format

HIP-3 (builder-deployed DEX) markets use the format `dex:symbol`:

| Symbol       | Parsed As                            | Notes                              |
| ------------ | ------------------------------------ | ---------------------------------- |
| `BTC`        | symbol='BTC', marketSource=undefined | Standard crypto (main DEX)         |
| `xyz:TSLA`   | symbol='TSLA', marketSource='xyz'    | HIP-3 stock                        |
| `xyz:xyz100` | symbol='XYZ100', marketSource='xyz'  | HIP-3 asset                        |
| `XYZ:AAPL`   | symbol='AAPL', marketSource='xyz'    | DEX prefix normalized to lowercase |

**Notes:**

- Symbol portion is always converted to uppercase
- DEX prefix is always converted to lowercase
- If symbol is missing/empty, falls back to PerpsHomeView

## Navigation Behavior

### First-Time Users

First-time users are **always** directed to the Perps tutorial, regardless of URL parameters:

```
Any perps deeplink → Tutorial → [User completes tutorial] → Original destination
```

### Returning Users

Returning users are routed based on URL parameters:

```
No params or screen=tabs → Wallet Home with Perps tab
screen=home              → PerpsHomeView
screen=markets           → PerpsHomeView (backwards compat)
screen=market-list       → PerpsMarketListView (with optional tab filter)
screen=asset&symbol=X    → PerpsMarketDetailsView
```

## MetaMetrics Tracking

All perps deeplinks emit `PERPS_SCREEN_VIEWED` events with `source: 'deeplink'` property for analytics tracking.

### Event Properties by Screen

| Deeplink                        | Event                 | Key Properties                                                    |
| ------------------------------- | --------------------- | ----------------------------------------------------------------- |
| `screen=home`                   | `PERPS_SCREEN_VIEWED` | `screen_type: 'homescreen', source: 'deeplink'`                   |
| `screen=markets`                | `PERPS_SCREEN_VIEWED` | `screen_type: 'homescreen', source: 'deeplink'`                   |
| `screen=market-list`            | `PERPS_SCREEN_VIEWED` | `screen_type: 'markets', source: 'deeplink'`                      |
| `screen=market-list&tab=crypto` | `PERPS_SCREEN_VIEWED` | `screen_type: 'markets', source: 'deeplink'`                      |
| `screen=asset&symbol=BTC`       | `PERPS_SCREEN_VIEWED` | `screen_type: 'asset_details', source: 'deeplink', asset: 'BTC'`  |
| `screen=asset&symbol=xyz:TSLA`  | `PERPS_SCREEN_VIEWED` | `screen_type: 'asset_details', source: 'deeplink', asset: 'TSLA'` |

### How Tracking Works

1. Deeplink handler passes `source: 'deeplink'` in navigation params
2. Destination screen reads `route.params.source`
3. `usePerpsEventTracking` hook emits `PERPS_SCREEN_VIEWED` with the source property
4. Event is sent to Segment for analytics

For full MetaMetrics event documentation, see [perps-metametrics-reference.md](./perps-metametrics-reference.md).

## Error Handling

If navigation fails, users are redirected to PerpsHomeView as a fallback.

## Testing Deeplinks

### iOS Simulator

```bash
# Wallet tab
xcrun simctl openurl booted "https://link.metamask.io/perps"

# Home view
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=home"

# Market list with filters
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list&tab=crypto"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list&tab=stocks"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list&tab=commodities"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list&tab=forex"
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=market-list&tab=new"

# Asset details (crypto)
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=asset&symbol=BTC"

# Asset details (HIP-3)
xcrun simctl openurl booted "https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA"
```

### Android Emulator

```bash
# Wallet tab
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps"

# Home view
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=home"

# Market list with filters
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list&tab=crypto"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list&tab=stocks"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list&tab=commodities"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list&tab=forex"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=market-list&tab=new"

# Asset details (crypto)
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=asset&symbol=BTC"

# Asset details (HIP-3)
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps?screen=asset&symbol=xyz:TSLA"
```

### Universal Link Testing

Use the app's debug menu or paste the URL into a browser on a device with MetaMask installed.

## Implementation Reference

- **Handler:** `app/core/DeeplinkManager/handlers/legacy/handlePerpsUrl.ts`
- **Tests:** `app/core/DeeplinkManager/handlers/legacy/__tests__/handlePerpsUrl.test.ts`
- **Routes:** `app/constants/navigation/Routes.ts` (PERPS section)
