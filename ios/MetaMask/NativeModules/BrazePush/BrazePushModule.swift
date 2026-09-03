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

    braze.notifications.unregisterPush { result in
      switch result {
      case .success:
        resolve(["success": true])
      case .failure(let error):
        resolve(Self.failurePayload(
          code: Self.failureCode(for: error),
          isRetriable: error.isRetriable,
          message: error.message
        ))
      }
    }
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

  private static func failureCode(for error: Braze.PushUnregistrationError) -> String {
    switch error {
    case .sdkDisabled:
      "SDK_DISABLED"
    case .noPushToken, .noPushToStartTokens:
      "NO_PUSH_TOKEN"
    case .rateLimited:
      "RATE_LIMITED"
    case .sdkDeallocated:
      "SDK_DEALLOCATED"
    case .requestFailed:
      "REQUEST_FAILED"
    @unknown default:
      "UNKNOWN"
    }
  }
}
