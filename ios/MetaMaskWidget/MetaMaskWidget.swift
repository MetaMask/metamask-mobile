//
//  MetaMaskWidget.swift
//  MetaMaskWidget
//
//  Widget entry point. Static configuration, Medium + Large families.
//

import WidgetKit
import SwiftUI

struct MetaMaskWidget: Widget {
  let kind: String = "MetaMaskWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      WidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Tokens")
    .description("Your tokens across all chains, by market price.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

@main
struct MetaMaskWidgetBundle: WidgetBundle {
  var body: some Widget {
    MetaMaskWidget()
  }
}

struct MetaMaskWidget_Previews: PreviewProvider {
  static var previews: some View {
    let entry = TokenEntry(date: Date(), tokens: WidgetTokenLoader.sample)
    Group {
      WidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemMedium))
      WidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemLarge))
    }
  }
}
