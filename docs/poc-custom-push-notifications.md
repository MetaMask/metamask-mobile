# Rich price-alert pushes (non-mergeable POC)

The server describes a threshold crossing or price movement; each client owns presentation and routing. This branch does not change the backend, alert rules, or swap execution. The rich actions open token details or prefill Swap; neither submits a transaction. There is no snooze/dismiss-alert action in this POC.

## Wire schema: `price_alert@1`

All custom fields are strings, either under FCM `message.data` or at the top level next to APNs `aps`. Keep ordinary localized alert copy and the existing token deeplink; they are not generated from the rich fields on failure.

| Field                             | Contract                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `mm_delivery`                     | `price_alert`; stable marker for routing even when the rich version is unknown                                          |
| `mm_ui`                           | `price_alert@1`; unknown versions never render rich                                                                     |
| `kind`                            | `threshold` or `movement`                                                                                               |
| `symbol`                          | 1–12 uppercase ASCII letters or digits                                                                                  |
| `asset_id`                        | CAIP-19 asset type, e.g. `eip155:1/slip44:60`                                                                           |
| `price`                           | USD current price, positive and at most `1e12`                                                                          |
| `change_pct`                      | Signed percent, absolute value at most `1e6`; zero uses the positive color                                              |
| `chart`                           | Optional compact JSON string; see below.                                                                                |
| `target`, `direction`             | Threshold only: positive USD target with the same bounds as `price`; `above` or `below`                                 |
| `period`                          | Movement only: `5m`, `1h`, or `24h`                                                                                     |
| `fallback_title`, `fallback_body` | Required on Android data-only sends; also included in the APNs fixtures, where `aps.alert` supplies the actual fallback |
| `deeplink`                        | Existing fallback token deeplink; rich actions instead derive fixed MetaMask links from `asset_id`                      |

Use plain decimal strings (no exponents, spaces or grouping). Keep the complete provider payload within its size limit. Do not send `mm_local`; it is a client marker. Rich labels are English-only for this POC.

## Chart blob v1

`chart` is a compact JSON **string** on both FCM and APNs, not a nested object. Its decoded shape is `{v: 1, currency: "usd", start: <Unix seconds UTC>, interval: <seconds>, prices: [<USD number>, ...]}`. Samples are oldest first on a regular grid, with both endpoints included. Use 49 prices at 30-minute spacing or 97 at 15-minute spacing so `(prices.length - 1) * interval` is exactly 86,400 seconds. The renderer pins the final sample to the alert's top-level `price` and calculates 24h high/low from the displayed samples, not from intrabar highs/lows or the threshold. The threshold line shares the same USD scale, with the plotted domain extended to include it if needed. Movement `period` describes the trigger, not the chart window.

At send time, fetch or reuse cached USD history for `asset_id`, resample onto a grid ending at the trigger time, and set the last value to the trigger quote. Send only finite positive prices up to `1e12`; omit `chart` if there isn't enough history or it won't fit. Cap the blob at 2,048 bytes and measure the full serialized provider payload (including fallback copy and JSON escaping) against the 4 KB limit. Missing, malformed, or unsupported chart blobs leave the rich price card and its actions intact, without a chart. Invalid alert metadata still uses the ordinary fallback. Capability routing must distinguish older POC builds that expected the obsolete `points` field.

Fixtures use actual [Coinbase Exchange ETH-USD candle closes](https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getproductcandles), sampled every 30 minutes from the 15-minute candles starting July 23–25, 2026 UTC, timestamped at candle close; the sample trigger prices are the final closes, not live quotes.

## Delivery and fallback

| Scenario                      | Android                                                                                                                                                                                                                                             | iOS main target                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client known to support v1    | Send high-priority FCM **data only**. JS posts one Notifee notification in foreground or from the RNFirebase headless handler. Collapsed: token/price and colored change text (platform controls styling); expanded: Big Picture chart and actions. | Send a regular APNs alert with `aps.category: mm-price-alert-v1`. The OS owns delivery and the collapsed title/body. On expansion the category-matched native content extension replaces the default body with the rich card, change chip, and chart. No separate local copy or network fetch.                                                                                         |
| Old/unknown client            | Send the existing FCM `notification` + legacy data shape instead. Never send data-only to a client without this handler; the OS cannot display its fallback. Do not send both shapes to one device.                                                 | Keep `aps.alert.title`/`body` and the existing fallback deeplink. Omit the rich category on ineligible builds (including Flask); no service extension or `mutable-content` flag is required.                                                                                                                                                                                           |
| Unknown schema/invalid fields | The new client posts the supplied fallback copy with no rich actions or chart. If a payload contains a `notification` block, the background handler skips it completely to avoid two banners.                                                       | Omit the v1 category for versions other than v1. Bad v1 fields with the v1 category get a branded dark card with the original APNs title/body and a token header when available, but no price chip, chart, or rich actions on expansion. The collapsed banner is always the native OS alert; without a matching category, iOS also owns the expanded view and the app cannot style it. |
| Rendering failure             | If chart generation or rich posting rejects, retry once with the same notification ID and plain copy. If the OS blocks delivery (permission, channel, force stop, or FCM not waking the process), neither local presentation can run.               | If the system cannot load the extension, it has the original APNs alert. The extension validates before drawing; it never rewrites or replaces the underlying APNs notification.                                                                                                                                                                                                       |

The sender needs explicit per-installation capability/version routing, plus these fields and chart data. The current backend continues to send the legacy shape unchanged. Real FCM routing and process wake-up need device QA and are not proven by local injection. iOS embedding is limited to the main target; installing on physical iOS hardware requires signing/provisioning for `io.metamask.MetaMask.PriceAlertContent`. iOS must be opened once with notification permission and category registration. Android uses the existing default wallet notification channel. Android's collapsed change is styled text, not a custom native pill; OS/OEM presentation may vary.

## QA handoff

Use a main **development** client from this commit, an unlocked test wallet on Ethereum Mainnet, and allow notifications. The Android dev entry point invokes the same data-only handler as headless delivery, but executes it from the active JS runtime; do not call this proof of background delivery. In React Native DevTools, run:

```js
await globalThis.showPriceAlertSample('threshold', 'android-background');
await globalThis.showPriceAlertSample('threshold-below', 'android-background');
await globalThis.showPriceAlertSample('movement', 'android-background');
await globalThis.showPriceAlertSample('movement-up', 'android-background');
await globalThis.showPriceAlertSample('fallback', 'android-background');
await globalThis.showPriceAlertSample('malformed', 'android-background');
await globalThis.showPriceAlertSample('no-chart', 'android-background');
await globalThis.showPriceAlertSample('invalid-chart', 'android-background');
```

Trigger separately and open the Android notification shade. For real delivery use the [FCM v1 sample bodies](../app/util/notifications/priceAlerts/samples/) with the test installation token in the matching Firebase project; send while backgrounded and after process death (not Android **Force stop**). No FCM credentials are required for the local dev trigger. For iOS, use the extension-capable main simulator build; grant permission first (the `showPriceAlertSample('threshold')` DevTools call can prompt), then background the app. Run from the repository root, one case at a time:

```sh
samples=app/util/notifications/priceAlerts/samples
xcrun simctl push booted io.metamask.MetaMask "$samples/threshold.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/threshold-below.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/movement.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/movement-up.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/fallback.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/malformed.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/no-chart.apns"
xcrun simctl push booted io.metamask.MetaMask "$samples/invalid-chart.apns"
```

Repeat with the app foregrounded (one notification, not two), and test tapping from a cold start. `simctl push` injects directly into the OS and does not validate FCM transport or legacy tap attribution. Capture collapsed and expanded states and button destinations on each platform:

- **Threshold above:** ETH, `$1,875.82`, green `+0.79%`, and a dashed orange `$1,875` line when expanded. Below uses `$1,872.96`, red `−3.17%`, and the same target line. Both show a 24h history, high/low markers, and the trigger quote at the endpoint.
- **Movement down:** ETH, `$1,872.96`, red `−3.17%`, `24h` chart, no target. Up uses `$1,875.82` and green `+0.79%`. iOS collapsed shows the supplied plain alert copy, not the expanded controls.
- **Body tap / View token:** opens Ethereum token details (`token-asset-overview`; `token-price` when loaded). For the above sample the target link is `https://link.metamask.io/asset?assetId=eip155%3A1%2Fslip44%3A60&source=price_alert_notification&alert_type=threshold&price_at_trigger=1875.82`.
- **Swap:** opens the swap/bridge screen (`bridge-view-scroll`, `source-token-area`) with ETH selected as the source (`https://link.metamask.io/swap?from=eip155%3A1%2Fslip44%3A60`). Verify it doesn't start a transaction. Use a fresh alert for each tap.
- **Missing chart / invalid chart:** rich price, change and actions, but no history, high/low, or target marker.
- **Unknown version / malformed:** only `ETH crossed above $1,875` / `ETH is now $1,875.82.`; no chart, chip or rich buttons in the opened notification. On iOS, malformed v1 with the category uses the branded fallback card; no category uses the system notification. For Android, tapping fallback uses its original `deeplink`. For iOS, the sample omits Firebase transport metadata; use a real legacy FCM/APNs send to verify the pre-existing fallback tap route. OS notification views have no in-app test IDs.

## Test layer placement

Unit tests in `app/util/notifications/priceAlerts/` cover parsing, link construction, render fallback, and duplicate suppression for Android notifications. There are no changes to existing screen test IDs. System templates, delivery, and tap routing need native QA because Jest cannot exercise the notification shade, APNs extension, or Android headless start.
