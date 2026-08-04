import Foundation
import WidgetKit

/// Bridges `WidgetCenter.getCurrentConfigurations` to JS so
/// `WidgetUpdaterService` can report widget adoption (installed widget
/// kinds/families) to analytics. See docs/widgets/README.md.
///
/// `expo-widgets` does not expose this — its own native module only calls
/// `WidgetCenter.shared.reloadAllTimelines()` (see
/// node_modules/expo-widgets/ios/WidgetsModule.swift) — so this is a small,
/// standalone React Native native module rather than an extension of
/// expo-widgets itself.
@objc(RCTWidgetInfo)
class RCTWidgetInfo: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  /// Resolves with `[{ kind: string, family: string }]` describing every
  /// widget the user currently has placed (home screen, lock screen,
  /// StandBy, ...), across all widget extensions in this app — not just
  /// `ExpoWidgetsTarget`'s. `kind` matches the `name` passed to
  /// `createMetaMaskWidget` / the `StaticConfiguration(kind:)` string in
  /// each `ios/ExpoWidgetsTarget/*.swift` file.
  ///
  /// Always resolves — never rejects. "Widgets unsupported" or "none
  /// installed" is a normal state, not an error worth surfacing to callers.
  @objc func getInstalledWidgets(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    WidgetCenter.shared.getCurrentConfigurations { result in
      guard case .success(let widgets) = result else {
        resolve([])
        return
      }
      resolve(widgets.map { widget in
        ["kind": widget.kind, "family": String(describing: widget.family)]
      })
    }
  }
}
