//
//  Provider.swift
//  MetaMaskWidget
//
//  Timeline provider. Data is push-driven: the app calls
//  WidgetCenter.reloadAllTimelines() whenever it writes new token data, so a
//  single entry is sufficient. A long refresh interval is set as a safety net.
//

import WidgetKit
import SwiftUI

struct TokenEntry: TimelineEntry {
  let date: Date
  let tokens: [WidgetToken]
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> TokenEntry {
    TokenEntry(date: Date(), tokens: WidgetTokenLoader.sample)
  }

  func getSnapshot(in context: Context, completion: @escaping (TokenEntry) -> Void) {
    let tokens = context.isPreview ? WidgetTokenLoader.sample : WidgetTokenLoader.load()
    completion(TokenEntry(date: Date(), tokens: tokens))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TokenEntry>) -> Void) {
    let entry = TokenEntry(date: Date(), tokens: WidgetTokenLoader.load())
    // Safety-net refresh; real updates arrive via reloadAllTimelines().
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}
