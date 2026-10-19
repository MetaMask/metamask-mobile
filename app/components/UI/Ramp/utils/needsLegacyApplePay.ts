import { Platform } from 'react-native';

/**
 * Whether the checkout WebView must set `enableApplePay`.
 *
 * Apple Pay is on by default in every WKWebView. The prop does not turn it on;
 * it only skips every injected `WKUserScript` (the `ReactNativeWebView.postMessage`
 * polyfill, `injectJavaScript`, the history shim) because on iOS 13 to 15 any
 * injected script disabled Apple Pay for that view (Safari 13 release notes).
 * iOS 16 lifted that restriction (Safari 16 release notes), so on iOS 16+ the
 * prop is pure cost: it silences provider `postMessage` events for nothing.
 *
 * Android has no equivalent restriction.
 */
export const needsLegacyApplePay = (): boolean =>
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 16;
