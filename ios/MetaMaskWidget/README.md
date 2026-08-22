# MetaMask iOS Token Widget

Home-screen WidgetKit extension that lists the tokens held by the selected
account group across all chains (holdings worth **over $1**), showing a circular
token logo + symbol on the left and the token's **unit market price** on the
right, with the MetaMask fox as a header. Families: **Medium** and **Large**.
Production **MetaMask** app only (not Flask).

## How it works

```
Redux state ──► WidgetSyncManager (JS) ──► RCTWidgetBridge (Swift)
                                              │  writes JSON + cached PNG logos
                                              ▼
                                   App Group container
                                   (group.io.metamask.MetaMask)
                                              ▲
                MetaMaskWidget (SwiftUI) ─────┘  reads + renders
```

- **JS — payload:** `app/core/WidgetData/buildWidgetPayload.ts` reads
  `selectAssetsBySelectedAccountGroup`, keeps holdings > $1, computes unit price
  (fiat value ÷ token balance), sorts by value, caps at 10.
- **JS — trigger:** `app/core/WidgetData/WidgetSyncManager.ts` (constructed in
  `Engine.ts`) pushes the payload on app foreground/background and on a debounced
  store change. No-ops on Android and when the native bridge is absent.
- **Native bridge:** `ios/MetaMask/NativeModules/RCTWidgetBridge/` writes the JSON
  to the App Group `UserDefaults`, downloads + downscales each PNG logo into the
  shared container, and calls `WidgetCenter.reloadAllTimelines()`.
- **Widget:** `ios/MetaMaskWidget/` (SwiftUI) reads the shared container and
  renders. SVG-only logos fall back to a symbol monogram (v1 limitation).

## Regenerating the Xcode target

The widget target, the `RCTWidgetBridge` source files, the App Group, and the
embed/dependency wiring are scripted (idempotent):

```bash
cd ios && ruby scripts/add_widget_target.rb
```

The script requires the `xcodeproj` Ruby gem (`gem install xcodeproj`). It is
only needed if `project.pbxproj` is regenerated; the committed project already
contains the target.

## ⚠️ Manual steps required (Apple Developer portal — Team `48XVW22RCG`)

These cannot be scripted from the repo and must be done by someone with portal
access **before device/TestFlight/App Store builds will sign**:

1. **Register the App Group** `group.io.metamask.MetaMask`.
2. **Enable App Groups** on the existing App ID `io.metamask.MetaMask` and add the
   group. **Then regenerate** the app's provisioning profiles
   (`development-metamask`, `Bitrise AppStore io.metamask.MetaMask`) so they carry
   the new entitlement — otherwise `UserDefaults(suiteName:)` is `nil` at runtime
   and uploads are rejected.
3. **Create a new App ID** `io.metamask.MetaMask.MetaMaskWidget` with App Groups
   enabled.
4. **Create provisioning profiles** for the widget App ID:
   - Development (e.g. `development-metamask-widget`)
   - Distribution (e.g. `Bitrise AppStore io.metamask.MetaMask.MetaMaskWidget`)
   Set them as the widget target's `PROVISIONING_PROFILE_SPECIFIER` for
   Debug/Release, and add the mapping `io.metamask.MetaMask.MetaMaskWidget → <profile>`
   to the CI export-options plist / Bitrise signing step.

**Simulator builds need none of the above** (`CODE_SIGNING_ALLOWED=NO`).

## Versioning

The widget's `CFBundleShortVersionString` / `CFBundleVersion` are driven by
`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` build settings on the
`MetaMaskWidget` target. CI must keep these in sync with the host app
(App Store rejects extension/host version mismatches). Widget code ships only in
full store builds — it is **not** updated via Expo OTA.

## Verifying locally

1. `yarn watch:clean` then `yarn start:ios` (a wallet holding tokens worth > $1).
2. Background/foreground the app to trigger a sync.
3. Long-press the home screen → add the **MetaMask** widget → pick Medium/Large.
4. SwiftUI previews in `MetaMaskWidget.swift` render both families with sample
   data without running the app.
