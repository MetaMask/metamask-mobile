import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import { Box } from '@metamask/design-system-react-native';
import Device from '../../../../../util/device';
import { colors as commonColors } from '../../../../../styles/common';
import { APPLE_PAY_CHECKOUT_OVERLAY_TEST_IDS } from './ApplePayCheckoutOverlay.testIds';

const MIN_WEBVIEW_HEIGHT = 74;

interface ApplePayCheckoutOverlayProps {
  checkoutUrl: string;
  /**
   * When true, the WebView receives taps (user presses the real Apple Pay
   * button). When false, keep mounted for order events but ignore touches.
   */
  interactive: boolean;
  webviewHeight?: number;
  onMessage: (event: WebViewMessageEvent) => void;
}

/**
 * Builds a Safari-on-iPhone user agent.
 * Crossmint's RN SDK does this so the hosted Apple Pay button can initialize.
 */
function getCrossmintCheckoutUserAgent(): string | undefined {
  if (!Device.isIos()) {
    return 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  }
  const osVersion = String(Platform.Version).replace(/\./g, '_');
  const major = Math.floor(Number(Platform.Version)) || 18;
  return `Mozilla/5.0 (iPhone; CPU iPhone OS ${osVersion} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${major}.0 Mobile/15E148 Safari/604.1`;
}

/**
 * Crossmint embedded Apple Pay button (SDK-less WebView).
 *
 * The checkout URL comes from the on-ramp API buy-widget endpoint for the
 * Crossmint provider; no Crossmint API is called from the client.
 *
 * Matches working MetaMask Ramp checkout WebViews:
 * - `enableApplePay` (required on iOS; `paymentRequestEnabled` is Android-only)
 * - Visible WebView so the user taps the real Apple Pay control
 * - Safari-like iOS userAgent (Crossmint's RN SDK does the same)
 *
 * Note: `enableApplePay` disables injectJavaScript and the usual
 * `window.ReactNativeWebView.postMessage` polyfill, so order completion is
 * primarily observed through precreated-order polling; the onMessage handler
 * is a best-effort accelerator.
 */
function ApplePayCheckoutOverlay({
  checkoutUrl,
  interactive,
  webviewHeight = MIN_WEBVIEW_HEIGHT,
  onMessage,
}: ApplePayCheckoutOverlayProps) {
  const height = Math.max(webviewHeight, MIN_WEBVIEW_HEIGHT);
  const userAgent = useMemo(() => getCrossmintCheckoutUserAgent(), []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        host: {
          width: '100%',
          height,
          overflow: 'hidden',
        },
        webView: {
          width: '100%',
          height,
          backgroundColor: commonColors.transparent,
        },
      }),
    [height],
  );

  return (
    <Box
      style={styles.host}
      pointerEvents={interactive ? 'auto' : 'none'}
      testID={APPLE_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY}
    >
      <WebView
        testID={APPLE_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW}
        source={{ uri: checkoutUrl }}
        style={styles.webView}
        // Same flags as the Ramp Checkout WebView (working Apple Pay).
        enableApplePay
        paymentRequestEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        onMessage={onMessage}
        userAgent={userAgent}
      />
    </Box>
  );
}

export default ApplePayCheckoutOverlay;
