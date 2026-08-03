// Generated to match the output of the `expo-widgets` config plugin
// (`withWidgetSourceFiles.ts` on the `sdk-55` branch of github.com/expo/expo)
// for a widget config entry named "BalanceWidget" in `app.config.js`.
//
// `name` MUST match the string passed to `createMetaMaskWidget('BalanceWidget', ...)`
// in app/components/UI/Widgets/BalanceWidget/BalanceWidget.tsx — expo-widgets
// uses this string as the App Group storage key for the widget's layout and
// timeline. See docs/widgets/README.md for how to add a new widget kind.
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
