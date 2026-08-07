// Hand-written to match the shape the `expo-widgets` config plugin
// (`withWidgetSourceFiles.ts` on the `sdk-55` branch of github.com/expo/expo)
// would generate for the "BalanceWidget" entry in `app.config.js`'s
// `expo-widgets` plugin config.
//
// `name` MUST match the string passed to `createMetaMaskWidget('BalanceWidget', ...)`
// in app/core/Widgets/widgets/BalanceWidget.ios.tsx — expo-widgets uses this
// string as the App Group storage key for the widget's layout and timeline.
// `configurationDisplayName`, `description`, and `supportedFamilies` below
// MUST stay in sync with that same entry's `displayName`, `description`, and
// `supportedFamilies` — nothing enforces this automatically. See
// docs/widgets/README.md for how to add a new widget kind.
import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct BalanceWidget: Widget {
  let name: String = "BalanceWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Balance")
    .description("Shows your total wallet balance at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
