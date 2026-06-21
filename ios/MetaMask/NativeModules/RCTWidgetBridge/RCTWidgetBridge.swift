//
//  RCTWidgetBridge.swift
//  MetaMask
//
//  Bridges token data from React Native into the home-screen widget's App Group
//  container and reloads the widget timelines. The JS side passes a JSON string
//  of `{ tokens: [{ symbol, priceFormatted, logoUrl, swapDeeplink,
//  priceChange1d, sparkline }] }`; this module downloads
//  and downscales each PNG logo into the shared container, rewrites each entry's
//  `logoUrl` to a local `logoFile`, persists the result to the shared
//  UserDefaults, then calls WidgetCenter.reloadAllTimelines().
//
//  Mirrors the Swift + RCT_EXTERN_MODULE pattern used by RnTar.swift / RNTar.m.
//

import Foundation
import UIKit
import WidgetKit

/// Shared between the app and the widget extension. Keep in sync with
/// `WidgetSharedStore` in the MetaMaskWidget target.
enum WidgetSharedStore {
  static let appGroupId = "group.io.metamask.MetaMask"
  static let tokensKey = "widgetTokens"
  static let logosDirectory = "TokenLogos"
  /// Logos are rendered in a small circular avatar; cap the longest edge so the
  /// widget process stays within its tight memory budget.
  static let logoMaxPixelSize: CGFloat = 192
}

@objc(RCTWidgetBridge)
class RCTWidgetBridge: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(setTokens:resolver:rejecter:)
  func setTokens(
    _ json: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: WidgetSharedStore.appGroupId) else {
      rejecter(
        "app_group_unavailable",
        "App Group \(WidgetSharedStore.appGroupId) is not available. Check entitlements and provisioning profile.",
        nil
      )
      return
    }

    guard
      let data = json.data(using: .utf8),
      let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let rawTokens = parsed["tokens"] as? [[String: Any]]
    else {
      rejecter("invalid_payload", "Could not parse widget token payload", nil)
      return
    }

    DispatchQueue.global(qos: .utility).async {
      let outputTokens = self.processTokens(rawTokens)

      let output: [String: Any] = [
        "tokens": outputTokens,
        "updatedAt": Date().timeIntervalSince1970,
      ]

      if let outData = try? JSONSerialization.data(withJSONObject: output),
        let outString = String(data: outData, encoding: .utf8) {
        defaults.set(outString, forKey: WidgetSharedStore.tokensKey)
      }

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }

      resolver(nil)
    }
  }

  /// Downloads + downscales each logo (best-effort) and returns the entries the
  /// widget consumes: `{ symbol, priceFormatted, logoFile }`. A token whose logo
  /// can't be fetched (e.g. SVG, network failure) is still returned without a
  /// `logoFile` so the widget renders a monogram fallback.
  private func processTokens(_ rawTokens: [[String: Any]]) -> [[String: Any]] {
    let logosDir = self.logosDirectoryURL()
    if let logosDir = logosDir {
      try? FileManager.default.createDirectory(
        at: logosDir, withIntermediateDirectories: true)
    }

    var result: [[String: Any]] = []
    for token in rawTokens {
      guard let symbol = token["symbol"] as? String else { continue }
      let priceFormatted = token["priceFormatted"] as? String ?? ""

      var entry: [String: Any] = [
        "symbol": symbol,
        "priceFormatted": priceFormatted,
      ]

      if let deeplink = token["swapDeeplink"] as? String, !deeplink.isEmpty {
        entry["deeplink"] = deeplink
      }

      if let priceChange1d = token["priceChange1d"] as? Double {
        entry["priceChange1d"] = priceChange1d
      }

      if let sparkline = token["sparkline"] as? [Double], !sparkline.isEmpty {
        entry["sparkline"] = sparkline
      }

      if let logoUrl = token["logoUrl"] as? String,
        let logosDir = logosDir,
        let fileName = self.cacheLogo(
          urlString: logoUrl, symbol: symbol, directory: logosDir) {
        entry["logoFile"] = fileName
      }

      result.append(entry)
    }
    return result
  }

  private func logosDirectoryURL() -> URL? {
    FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: WidgetSharedStore.appGroupId)?
      .appendingPathComponent(WidgetSharedStore.logosDirectory, isDirectory: true)
  }

  /// Synchronously downloads a PNG/JPEG logo, downscales it, and writes it to the
  /// shared container. Returns the relative filename, or nil on failure / SVG.
  private func cacheLogo(urlString: String, symbol: String, directory: URL) -> String? {
    guard
      let url = URL(string: urlString),
      let scheme = url.scheme?.lowercased(),
      scheme == "https" || scheme == "http"
    else {
      return nil
    }
    // SwiftUI can't render SVG; skip and let the widget fall back to a monogram.
    if url.pathExtension.lowercased() == "svg" {
      return nil
    }

    let fileName = "\(self.sanitize(symbol)).png"
    let destination = directory.appendingPathComponent(fileName)

    let semaphore = DispatchSemaphore(value: 0)
    var imageData: Data?
    let task = URLSession.shared.dataTask(with: url) { data, _, _ in
      imageData = data
      semaphore.signal()
    }
    task.resume()
    // Bounded wait so a slow/hung request can't stall the whole sync.
    _ = semaphore.wait(timeout: .now() + 10)

    guard let imageData = imageData, let image = UIImage(data: imageData) else {
      return nil
    }

    let resized = self.downscale(image, maxSize: WidgetSharedStore.logoMaxPixelSize)
    guard let png = resized.pngData() else { return nil }

    do {
      try png.write(to: destination, options: .atomic)
      return fileName
    } catch {
      return nil
    }
  }

  private func downscale(_ image: UIImage, maxSize: CGFloat) -> UIImage {
    let longest = max(image.size.width, image.size.height)
    guard longest > maxSize, longest > 0 else { return image }
    let scale = maxSize / longest
    let newSize = CGSize(
      width: image.size.width * scale, height: image.size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: newSize)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
  }

  private func sanitize(_ symbol: String) -> String {
    let allowed = CharacterSet.alphanumerics
    let scalars = symbol.unicodeScalars.map { allowed.contains($0) ? Character($0) : "_" }
    let cleaned = String(scalars)
    return cleaned.isEmpty ? "token" : cleaned
  }
}
