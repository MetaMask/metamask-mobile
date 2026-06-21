//
//  WidgetToken.swift
//  MetaMaskWidget
//
//  Shared model + loader for data the app writes into the App Group container.
//  Keep `WidgetSharedStore` in sync with RCTWidgetBridge.swift in the app target.
//

import Foundation
import UIKit

enum WidgetSharedStore {
  static let appGroupId = "group.io.metamask.MetaMask"
  static let tokensKey = "widgetTokens"
  static let logosDirectory = "TokenLogos"
}

/// One row: token symbol (leading), unit market price (trailing), and an
/// optional locally-cached logo filename resolved against the App Group.
struct WidgetToken: Codable, Identifiable {
  let symbol: String
  let priceFormatted: String
  let logoFile: String?
  /// Deep link that opens the Swap screen with this token preselected as source.
  let deeplink: String?
  /// 24h price change as a percentage (e.g. 2.31, -0.04). Nil when unavailable.
  let priceChange1d: Double?
  /// Price points for the row's mini sparkline (visualization only).
  let sparkline: [Double]?

  var id: String { symbol }

  /// Parsed deep-link URL, if present and valid.
  var deeplinkURL: URL? {
    guard let deeplink = deeplink, !deeplink.isEmpty else { return nil }
    return URL(string: deeplink)
  }

  /// Loads the cached logo from the shared container, if present.
  func loadLogo() -> UIImage? {
    guard let logoFile = logoFile, !logoFile.isEmpty else { return nil }
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: WidgetSharedStore.appGroupId)
    else {
      return nil
    }
    let url = container
      .appendingPathComponent(WidgetSharedStore.logosDirectory, isDirectory: true)
      .appendingPathComponent(logoFile)
    return UIImage(contentsOfFile: url.path)
  }
}

private struct WidgetTokenStore: Codable {
  let tokens: [WidgetToken]
}

enum WidgetTokenLoader {
  /// Reads and decodes the token list the app last wrote. Returns [] on any
  /// failure (missing App Group, no data yet, decode error).
  static func load() -> [WidgetToken] {
    guard
      let defaults = UserDefaults(suiteName: WidgetSharedStore.appGroupId),
      let json = defaults.string(forKey: WidgetSharedStore.tokensKey),
      let data = json.data(using: .utf8),
      let store = try? JSONDecoder().decode(WidgetTokenStore.self, from: data)
    else {
      return []
    }
    return store.tokens
  }

  /// Sample data for previews and the placeholder snapshot.
  static var sample: [WidgetToken] {
    [
      WidgetToken(
        symbol: "ETH", priceFormatted: "$3,000.00", logoFile: nil, deeplink: nil,
        priceChange1d: 2.31, sparkline: [100, 101, 100.5, 102, 103, 102.5, 104, 105]),
      WidgetToken(
        symbol: "USDC", priceFormatted: "$1.00", logoFile: nil, deeplink: nil,
        priceChange1d: -0.04, sparkline: [100, 99.9, 100.1, 99.8, 100, 99.95, 100.05, 99.9]),
      WidgetToken(
        symbol: "MATIC", priceFormatted: "$0.72", logoFile: nil, deeplink: nil,
        priceChange1d: -3.12, sparkline: [105, 104, 103.5, 102, 101, 100.5, 99, 98]),
      WidgetToken(
        symbol: "WBTC", priceFormatted: "$62,500.00", logoFile: nil, deeplink: nil,
        priceChange1d: 0.0, sparkline: [100, 100.2, 99.8, 100.1, 99.9, 100, 100.1, 99.95]),
    ]
  }
}
