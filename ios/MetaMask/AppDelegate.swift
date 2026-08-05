import UIKit
internal import Expo
import React
import ReactAppDependencyProvider
import FirebaseCore
import UserNotifications
import RNBranch
import BrazeKit

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
  private weak var displacedNotificationCenterDelegate: UNUserNotificationCenterDelegate?
  private var isForwardingNotificationResponse = false

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
    let delegate = MetaMaskReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    window?.makeKeyAndVisible()

    // Safe Firebase configuration — validates plist before configure() to prevent
    // FIRInstallations from throwing an uncatchable NSException on launch when
    // GoogleService-Info.plist is missing or contains a blank/placeholder/mock API_KEY.
    // Real Firebase API keys always start with "AIzaSy"; anything else (empty, mock-*, etc.)
    // would cause validateAPIKey: to throw an NSException that Swift cannot catch.
    if FirebaseApp.app() == nil,
       let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
       let plist = NSDictionary(contentsOfFile: path),
       let apiKey = plist["API_KEY"] as? String,
       apiKey.hasPrefix("AIzaSy") {
      FirebaseApp.configure()
    }

    let foxCode = (Bundle.main.object(forInfoDictionaryKey: "fox_code") as? String) ?? "debug"
    let initialProps: [AnyHashable: Any] = ["foxCode": foxCode]

    RNBranch.branch.checkPasteboardOnInstall()
    RNBranch.initSession(launchOptions: launchOptions, isReferrable: true)

    // Seed native prefetch queue before JS loads (iOS fires it automatically via
    // NitroBootstrap.mm on UIApplicationDidFinishLaunchingNotification).
    // Covers first-launch since JS-side prefetchOnAppStart() only runs after first JS execution.
    // Feature flags omitted — environment value isn't available natively;
    // JS registers the correct URL after its first run.
    NitroAutoPrefetcher.registerPrefetch(
      withUrl: "https://phishing-detection.api.cx.metamask.io/v1/stalelist",
      prefetchKey: "phishing-stalelist",
      headers: [:])
    NitroAutoPrefetcher.registerPrefetch(
      withUrl: "https://client-side-detection.api.cx.metamask.io/v1/request-blocklist",
      prefetchKey: "phishing-c2-blocklist",
      headers: [:])

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

    // Claim UNUserNotificationCenterDelegate AFTER all SDK initializations.
    // Braze (push.automation=true) and Notifee both try to set themselves as delegate
    // during startup; we must win so our willPresent forwards to Firebase and triggers
    // messaging().onMessage() in JS. We reassert on every foreground entry (see below).
    claimNotificationCenterDelegate()

    return superResult
  }

  override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    // Re-assert our delegate on every foreground entry so Braze/Notifee cannot reclaim
    // it asynchronously. Notifee tap forwarding is handled explicitly in didReceive
    // (via NotifeeCoreUNUserNotificationCenter.instance()) rather than through Notifee's
    // own delegate chain, so holding this slot does not break Notifee press events.
    claimNotificationCenterDelegate()
  }

  private func claimNotificationCenterDelegate() {
    let center = UNUserNotificationCenter.current()
    if let currentDelegate = center.delegate,
       (currentDelegate as AnyObject) !== self {
      displacedNotificationCenterDelegate = currentDelegate
    }
    center.delegate = self
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

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
  // Called when a notification arrives while the app is in the foreground.
  // Braze's push.automation would have consumed this without forwarding to
  // Firebase, so we own the delegate and do both here.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    // Tell Firebase about the message — this triggers messaging().onMessage() in JS.
    Messaging.messaging().appDidReceiveMessage(userInfo)
    // Show the notification visually in the foreground.
    completionHandler([.sound, .badge, .banner, .list])
  }

  // Called when the user taps a notification or one of its action buttons.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo

    // RNFirebase/Notifee may have captured AppDelegate as their original
    // delegate before we reclaimed the center. Stop that delegate chain when
    // it returns here, otherwise forwarding would recurse indefinitely.
    if isForwardingNotificationResponse {
      completionHandler()
      return
    }

    // Notifee-created notification: forward to Notifee so onForegroundEvent(PRESS) fires.
    // We own the delegate (see applicationDidBecomeActive), so Notifee never receives this
    // through its own delegate chain — explicit forwarding is required.
    if userInfo["__notifee_notification"] != nil {
      NotifeeCoreUNUserNotificationCenter.instance().userNotificationCenter(
        center, didReceive: response, withCompletionHandler: completionHandler)
      return
    }

    // Braze-originated notification: let Braze track the open and handle deep links.
    if AppDelegate.braze?.notifications.handleUserNotification(
      response: response, withCompletionHandler: completionHandler) == true {
      return
    }

    let responseSelector = #selector(
      UNUserNotificationCenterDelegate.userNotificationCenter(
        _:didReceive:withCompletionHandler:))
    if let delegate = displacedNotificationCenterDelegate,
       delegate.responds(to: responseSelector) {
      isForwardingNotificationResponse = true
      delegate.userNotificationCenter?(
        center,
        didReceive: response,
        withCompletionHandler: completionHandler)
      isForwardingNotificationResponse = false
      return
    }

    completionHandler()
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
