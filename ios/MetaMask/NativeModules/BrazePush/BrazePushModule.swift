import BrazeKit
import Foundation

@objc(BrazePushModule)
class BrazePushModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func unregisterPush(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: @escaping RCTPromiseRejectBlock
  ) {
    guard let braze = AppDelegate.braze else {
      resolve(Self.failurePayload(
        code: "SDK_UNAVAILABLE",
        isRetriable: false,
        message: "Braze is not initialized"
      ))
      return
    }

    // Completion-handler unregisterPush is gated on $NonescapableTypes in
    // BrazeKit 18 and is invisible under Xcode 26. The async overload is not.
    Task { @MainActor in
      do {
        try await braze.notifications.unregisterPush()
        resolve(["success": true])
      } catch {
        resolve(Self.failurePayload(from: error))
      }
    }
  }

  private static func failurePayload(from error: Error) -> [String: Any] {
    let nsError = error as NSError
    let message = error.localizedDescription
    let isRetriable = nsError.userInfo["isRetriable"] as? Bool ?? false

    return failurePayload(
      code: failureCode(message: message),
      isRetriable: isRetriable,
      message: message
    )
  }

  private static func failurePayload(
    code: String,
    isRetriable: Bool,
    message: String
  ) -> [String: Any] {
    [
      "success": false,
      "isRetriable": isRetriable,
      "code": code,
      "message": message,
    ]
  }

  private static func failureCode(message: String) -> String {
    let lowercasedMessage = message.lowercased()
    if lowercasedMessage.contains("no push token") {
      return "NO_PUSH_TOKEN"
    }
    if lowercasedMessage.contains("disabled") {
      return "SDK_DISABLED"
    }
    if lowercasedMessage.contains("rate") {
      return "RATE_LIMITED"
    }
    if lowercasedMessage.contains("deallocat") {
      return "SDK_DEALLOCATED"
    }
    return "REQUEST_FAILED"
  }
}
