//
//  RCTWidgetBridge.swift
//  MetaMask
//
//  Thin bridge between React Native and the home-screen widget. The JS side owns
//  all the logic: it builds the final widget payload (symbols, prices, deeplinks,
//  24h change, sparkline) AND downloads the token logos directly into the App
//  Group container (via react-native-fs). This native module only exposes the
//  two things JS can't do itself:
//    1. resolve the absolute App Group logos directory path, and
//    2. persist the JSON string and reload the widget timelines.
//
//  Mirrors the Swift + RCT_EXTERN_MODULE pattern used by RnTar.swift / RNTar.m.
//

import Foundation
import WidgetKit

/// Shared between the app and the widget extension. Keep in sync with
/// `WidgetSharedStore` in the MetaMaskWidget target.
enum WidgetSharedStore {
  static let appGroupId = "group.io.metamask.MetaMask"
  static let tokensKey = "widgetTokens"
  static let logosDirectory = "TokenLogos"
}

@objc(RCTWidgetBridge)
class RCTWidgetBridge: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Resolves (creating if needed) the App Group directory where JS writes token
  /// logo files, and returns its absolute path. The widget reads logos from the
  /// same directory by filename. Rejects if the App Group is unavailable.
  @objc(getLogosDirectoryPath:rejecter:)
  func getLogosDirectoryPath(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: WidgetSharedStore.appGroupId)
    else {
      rejecter(
        "app_group_unavailable",
        "App Group \(WidgetSharedStore.appGroupId) is not available. Check entitlements and provisioning profile.",
        nil
      )
      return
    }

    let logosDir = container.appendingPathComponent(
      WidgetSharedStore.logosDirectory, isDirectory: true)
    do {
      try FileManager.default.createDirectory(
        at: logosDir, withIntermediateDirectories: true)
      resolver(logosDir.path)
    } catch {
      rejecter("logos_dir_unavailable", "Could not create logos directory", error)
    }
  }

  /// Persists the final widget payload (built entirely in JS) verbatim to the
  /// shared UserDefaults and reloads the widget timelines.
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

    defaults.set(json, forKey: WidgetSharedStore.tokensKey)

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    resolver(nil)
  }
}
