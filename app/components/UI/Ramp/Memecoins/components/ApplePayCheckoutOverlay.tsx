import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import { Box } from '@metamask/design-system-react-native';
import Device from '../../../../../util/device';
import { colors as commonColors } from '../../../../../styles/common';
import { MEMECOINS_TEST_IDS } from '../Memecoins.testIds';

interface ApplePayCheckoutOverlayProps {
  checkoutUrl: string;
  /**
   * When true, the WebView receives taps (user presses the real Apple Pay
   * button). When false, keep mounted for order events but ignore touches.
   */
  interactive: boolean;
  webviewHeight: number;
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
 * Matches working MetaMask Ramp checkout WebViews:
 * - `enableApplePay` (required on iOS; `paymentRequestEnabled` is Android-only)
 * - Visible WebView so the user taps the real Apple Pay control
 * - Safari-like iOS userAgent (Crossmint RN SDK)
 *
 * Note: `enableApplePay` disables injectJavaScript and the usual
 * `window.ReactNativeWebView.postMessage` polyfill. Amount also polls the
 * order API as a fallback when postMessage events are unavailable.
 */
function ApplePayCheckoutOverlay({
  checkoutUrl,
  interactive,
  webviewHeight,
  onMessage,
}: ApplePayCheckoutOverlayProps) {
  const height = Math.max(webviewHeight, 74);
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
      testID={MEMECOINS_TEST_IDS.CHECKOUT_OVERLAY}
    >
      <WebView
        testID={MEMECOINS_TEST_IDS.CHECKOUT_WEBVIEW}
        source={{ uri: checkoutUrl }}
        style={styles.webView}
        // Same flags as Ramp/Views/Checkout/Checkout.tsx (working Apple Pay).
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
