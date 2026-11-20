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
| `points`                          | Oldest-to-newest list of 2–24 comma-separated USD prices; at most 384 characters                                        |
| `target`, `direction`             | Threshold only: positive USD target with the same bounds as `price`; `above` or `below`                                 |
| `period`                          | Movement only: `5m`, `1h`, or `24h`                                                                                     |
| `fallback_title`, `fallback_body` | Required on Android data-only sends; also included in the APNs fixtures, where `aps.alert` supplies the actual fallback |
| `deeplink`                        | Existing fallback token deeplink; rich actions instead derive fixed MetaMask links from `asset_id`                      |

Use plain decimal strings (no exponents, spaces or grouping). The graph is drawn from inline points without network images. Keep the complete provider payload within its size limit. Do not send `mm_local`; it is a client marker. Rich labels are English-only for this POC.

## Delivery and fallback

| Scenario                      | Android                                                                                                                                                                                                                                             | iOS main target                                                                                                                                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client known to support v1    | Send high-priority FCM **data only**. JS posts one Notifee notification in foreground or from the RNFirebase headless handler. Collapsed: token/price and colored change text (platform controls styling); expanded: Big Picture chart and actions. | Send a regular APNs alert with `aps.category: mm-price-alert-v1`. The OS owns delivery and the collapsed title/body. On expansion the category-matched native content extension replaces the default body with the rich card, change chip, and chart. No separate local copy or network fetch. |
| Old/unknown client            | Send the existing FCM `notification` + legacy data shape instead. Never send data-only to a client without this handler; the OS cannot display its fallback. Do not send both shapes to one device.                                                 | Keep `aps.alert.title`/`body` and the existing fallback deeplink. Omit the rich category on ineligible builds (including Flask); no service extension or `mutable-content` flag is required.                                                                                                   |
| Unknown schema/invalid fields | The new client posts the supplied fallback copy with no rich actions or chart. If a payload contains a `notification` block, the background handler skips it completely to avoid two banners.                                                       | Omit the v1 category for versions other than v1. Bad v1 fields with the v1 category get a plain title/body view and no rich actions on expansion. The collapsed copy is always the OS alert.                                                                                                   |
| Rendering failure             | If chart generation or rich posting rejects, retry once with the same notification ID and plain copy. If the OS blocks delivery (permission, channel, force stop, or FCM not waking the process), neither local presentation can run.               | If the system cannot load the extension, it has the original APNs alert. The extension validates before drawing; it never rewrites or replaces the underlying APNs notification.                                                                                                               |

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
```

Repeat with the app foregrounded (one notification, not two), and test tapping from a cold start. `simctl push` injects directly into the OS and does not validate FCM transport or legacy tap attribution. Capture collapsed and expanded states and button destinations on each platform:

- **Threshold above:** ETH, `$4,036.42`, green `+3.1%`, rising chart and dashed orange `$4,000` line when expanded. Below uses `$3,820.80`, red `−5.2%` and a falling chart with the same target line.
- **Movement down:** ETH, `$3,820.80`, red `−5.2%`, `24h`, falling chart, no target. Up uses `$4,036.42`, green `+3.1%` and a rising chart. iOS collapsed shows the supplied plain alert copy, not the expanded controls.
- **Body tap / View token:** opens Ethereum token details (`token-asset-overview`; `token-price` when loaded). For the above sample the target link is `https://link.metamask.io/asset?assetId=eip155%3A1%2Fslip44%3A60&source=price_alert_notification&alert_type=threshold&price_at_trigger=4036.42`.
- **Swap:** opens the swap/bridge screen (`bridge-view-scroll`, `source-token-area`) with ETH selected as the source (`https://link.metamask.io/swap?from=eip155%3A1%2Fslip44%3A60`). Verify it doesn't start a transaction. Use a fresh alert for each tap.
- **Unknown version / malformed:** only `ETH crossed above $4,000` / `ETH is now $4,036.42.`; no chart, chip or rich buttons in the opened notification. For Android, tapping fallback uses its original `deeplink`. For iOS, the sample omits Firebase transport metadata; use a real legacy FCM/APNs send to verify the pre-existing fallback tap route. OS notification views have no in-app test IDs.

## Test layer placement

Unit tests in `app/util/notifications/priceAlerts/` cover parsing, link construction, render fallback, and duplicate suppression for Android notifications. There are no changes to existing screen test IDs. System templates, delivery, and tap routing need native QA because Jest cannot exercise the notification shade, APNs extension, or Android headless start.
