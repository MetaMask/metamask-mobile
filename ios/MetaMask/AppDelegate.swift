import UIKit
import Expo
import React
import ReactAppDependencyProvider
import FirebaseCore
import RNBranch
import BrazeKit

private enum E2ENativeAppProxy {
  private static let launchArgumentName = "e2eIosProxyPort"
  private static let proxyHost = "127.0.0.1"
  private static let httpEnableKey = "HTTPEnable"
  private static let httpProxyKey = "HTTPProxy"
  private static let httpPortKey = "HTTPPort"
  private static let httpsEnableKey = "HTTPSEnable"
  private static let httpsProxyKey = "HTTPSProxy"
  private static let httpsPortKey = "HTTPSPort"
  private static let exceptionsListKey = "ExceptionsList"
  private static let excludeSimpleHostnamesKey = "ExcludeSimpleHostnames"

  static func configureIfNeeded() {
    guard let proxyPort = launchArgumentValue(launchArgumentName).flatMap(Int.init),
          proxyPort > 0,
          proxyPort <= 65535 else {
      return
    }

    RCTSetCustomNSURLSessionConfigurationProvider {
      let configuration = URLSessionConfiguration.default
      configuration.httpShouldSetCookies = true
      configuration.httpCookieAcceptPolicy = .always
      configuration.httpCookieStorage = .shared
      configuration.connectionProxyDictionary = [
        httpEnableKey: NSNumber(value: 1),
        httpProxyKey: proxyHost,
        httpPortKey: NSNumber(value: proxyPort),
        httpsEnableKey: NSNumber(value: 1),
        httpsProxyKey: proxyHost,
        httpsPortKey: NSNumber(value: proxyPort),
        exceptionsListKey: [
          "localhost",
          "127.0.0.1",
          "10.0.2.2",
          "*.local",
        ],
        excludeSimpleHostnamesKey: NSNumber(value: 1),
      ]

      return configuration
    }

    NSLog("[E2E_IOS_NATIVE_APP_PROXY_ENABLED] RN HTTP and SocketRocket WebSocket traffic will use \(proxyHost):\(proxyPort)")
  }

  private static func launchArgumentValue(_ name: String) -> String? {
    let arguments = ProcessInfo.processInfo.arguments

    for (index, argument) in arguments.enumerated() {
      if argument == name || argument == "-\(name)" {
        let nextIndex = arguments.index(after: index)
        return nextIndex < arguments.count ? arguments[nextIndex] : nil
      }

      let assignmentPrefixes = ["\(name)=", "-\(name)="]
      for assignmentPrefix in assignmentPrefixes where argument.hasPrefix(assignmentPrefix) {
        return String(argument.dropFirst(assignmentPrefix.count))
      }
    }

    return ProcessInfo.processInfo.environment[name]
  }
}

final class MetaMaskReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  private var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  private var reactNativeFactory: RCTReactNativeFactory?

  @objc static var braze: Braze?

  // Detox's `+[ReactNativeSupport reloadApp]` does
  // `[appDelegate valueForKey:@"rootViewFactory"]` to grab RN's RootViewFactory
  // for hot-reload. In older RN, `RCTAppDelegate` exposed `rootViewFactory`
  // directly; in RN 0.81 + Expo's `ExpoAppDelegate` it now lives inside
  // `RCTReactNativeFactory` (which we hold privately above). Without this
  // forwarding accessor, `device.reloadReactNative()` between tests crashes
  // with `NSUnknownKeyException ... rootViewFactory`. Tracked upstream in
  // wix/Detox#4849. Remove this once Detox uses the new key path.
  @objc var rootViewFactory: NSObject? {
    return reactNativeFactory?.value(forKey: "rootViewFactory") as? NSObject
  }

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    E2ENativeAppProxy.configureIfNeeded()

    let delegate = MetaMaskReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    window = UIWindow(frame: UIScreen.main.bounds)
    window?.makeKeyAndVisible()

    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    let foxCode = (Bundle.main.object(forInfoDictionaryKey: "fox_code") as? String) ?? "debug"
    let initialProps: [AnyHashable: Any] = ["foxCode": foxCode]

    RNBranch.branch.checkPasteboardOnInstall()
    RNBranch.initSession(launchOptions: launchOptions, isReferrable: true)

    // Setup Braze
    if let brazeApiKey = Bundle.main.object(forInfoDictionaryKey: "braze_api_key") as? String,
       let brazeEndpoint = Bundle.main.object(forInfoDictionaryKey: "braze_sdk_endpoint") as? String,
       !brazeApiKey.isEmpty, !brazeEndpoint.isEmpty {
      let configuration = Braze.Configuration(apiKey: brazeApiKey, endpoint: brazeEndpoint)
      configuration.logger.level = .info
      // push.automation handles APNs token registration and Braze-originated notification display.
      // requestAuthorizationAtLaunch is false so the existing permission flow (Firebase/Notifee) is preserved.
      configuration.push.automation = true
      configuration.push.automation.requestAuthorizationAtLaunch = false
      configuration.forwardUniversalLinks = true
      // swiftlint:disable:next force_cast
      let braze = BrazeHelperInit(configuration) as! Braze
      braze.delegate = self
      AppDelegate.braze = braze
      BrazeHelperPopulateInitialPayload(launchOptions)
    }

    factory.startReactNative(
      withModuleName: "MetaMask",
      in: window,
      initialProperties: initialProps,
      launchOptions: launchOptions
    )

    let superResult = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    return superResult
  }

  override func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
#if DEBUG
    return super.application(application, open: url, options: options) ||
      RCTLinkingManager.application(application, open: url, options: options)
#else
    return RNBranch.application(application, open: url, options: options)
#endif
  }

  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RNBranch.continue(userActivity)
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }

  override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    super.application(
      application,
      didReceiveRemoteNotification: userInfo,
      fetchCompletionHandler: completionHandler
    )
  }
}

// MARK: - BrazeDelegate

extension AppDelegate: BrazeDelegate {
  // Route Braze deep link URLs ourselves instead of letting BrazeKit open them
  // via UIApplication.open (which would cause a duplicate delivery — once from
  // the Braze RN bridge JS event and once from the system URL handler).
  //
  // Universal links (Branch domains) are forwarded to Branch for proper routing.
  // All other URLs are suppressed here; they are handled exclusively through
  // the JS PUSH_NOTIFICATION_EVENT, tagged with ORIGIN_BRAZE.
  func braze(_ braze: Braze, shouldOpenURL context: Braze.URLContext) -> Bool {
    if let host = context.url.host,
       host.contains("app.link") ||
       host.contains("test-app.link") ||
       host.contains("link.metamask.io") ||
       host.contains("link-test.metamask.io") {
      Branch.getInstance().handleDeepLink(context.url)
      return false
    }
    return false
  }
}
