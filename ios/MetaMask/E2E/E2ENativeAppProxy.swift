import Foundation

#if METAMASK_E2E
/// Configures React Native's shared `NSURLSession` to use a local HTTP proxy
/// during E2E runs (plus SocketRocket WebSockets via the Podfile patch).
///
/// Scope is intentionally not process-wide: Nitro/WKWebView/Firebase/Braze/
/// Sentry and other stacks that use their own sessions bypass this path.
/// Android uses OS-level `adb` global proxy instead.
///
/// The proxy port is supplied via the `e2eIosProxyPort` launch argument (or
/// environment variable) by the E2E test harness; when it is absent this type
/// does nothing, so even E2E binaries behave normally outside a test run.
///
/// This file is only compiled when the `METAMASK_E2E` Swift compilation
/// condition is set (see `scripts/build.sh`, which sets it for
/// `METAMASK_ENVIRONMENT=e2e` builds). Production binaries get the empty stub
/// at the bottom of this file instead.
enum E2ENativeAppProxy {
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
      // ExcludeSimpleHostnames already bypasses bare hostnames (localhost);
      // keep explicit loopback / mDNS exceptions for dotted forms.
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
          "*.local",
        ],
        excludeSimpleHostnamesKey: NSNumber(value: 1),
      ]

      return configuration
    }

    NSLog("[E2E_IOS_NATIVE_APP_PROXY_ENABLED] RN NSURLSession + SocketRocket traffic will use \(proxyHost):\(proxyPort)")
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
#else
/// No-op stub compiled into non-E2E builds so the `AppDelegate` call site
/// stays unconditional while production binaries carry none of the proxy code.
enum E2ENativeAppProxy {
  static func configureIfNeeded() {}
}
#endif
