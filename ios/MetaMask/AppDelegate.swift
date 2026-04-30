import UIKit
import Expo
import React
import ReactAppDependencyProvider
import FirebaseCore
import RNBranch

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
