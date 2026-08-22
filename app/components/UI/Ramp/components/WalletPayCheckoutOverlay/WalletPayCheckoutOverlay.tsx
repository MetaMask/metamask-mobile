import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import { colors as commonColors } from '../../../../../styles/common';
import { parseCrossmintCheckoutMessage } from '../../utils/crossmintCheckoutMessage';
import { WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS } from './WalletPayCheckoutOverlay.testIds';

/** Undocumented: posted once the Apple Pay / Google Pay button has rendered. */
const CHECKOUT_READY_EVENT = 'ui:express-checkout.ready';

/**
 * Undocumented: content height, from a `ResizeObserver` on their body. Also the
 * reveal signal, because Crossmint paints their own terms line until the order
 * resolves, so revealing on {@link CHECKOUT_READY_EVENT} alone shows that flash.
 */
const CHECKOUT_HEIGHT_EVENT = 'ui:height.changed';

/** Floor stops a mid-render measurement collapsing the button; ceiling rejects runaways. */
const MIN_WEBVIEW_HEIGHT = 44;
const MAX_WEBVIEW_HEIGHT = 400;

/**
 * Reveal deadline. `enableApplePay` blocks the postMessage polyfill on iOS, so
 * no events arrive there and this timeout is the only signal.
 */
const READY_FALLBACK_MS = 1200;

/**
 * Crossmint drops their in-checkout terms line per project. Must stay in step
 * with their setting: ahead of them ours vanishes too, behind them it shows
 * twice. Off for staging; production is a separate project.
 */
const CROSSMINT_RENDERS_TERMS: boolean = false;

/** The regional agreement Crossmint requires the notice to point at. */
const CROSSMINT_TERMS_URL =
  'https://www.crossmint.com/legal/crossmint-terms-of-service/FRGUSAALLALLALL';

/**
 * Pixels clipped off the top: Crossmint's leading margin plus their branding
 * line, neither reachable by an appearance rule. Back to 16 if they drop the
 * branding per project.
 */
const TOP_CROP = 24;

/** iOS fallback, where no events arrive: room for the payment button alone. */
const DEFAULT_WEBVIEW_HEIGHT = 50;

interface WalletPayCheckoutOverlayProps {
  checkoutUrl: string;
  /** Whether the WebView takes taps. Stays mounted either way, for order events. */
  interactive: boolean;
  webviewHeight?: number;
  onMessage: (event: WebViewMessageEvent) => void;
  /** Fires once the button has rendered and settled; nothing is drawn before it. */
  onReady: () => void;
}

/** Safari / Chrome UA, as Crossmint's RN SDK sends, so the payment button initializes. */
function getCrossmintCheckoutUserAgent(): string | undefined {
  if (!Device.isIos()) {
    return 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  }
  const osVersion = String(Platform.Version).replace(/\./g, '_');
  const major = Math.floor(Number(Platform.Version)) || 18;
  return `Mozilla/5.0 (iPhone; CPU iPhone OS ${osVersion} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${major}.0 Mobile/15E148 Safari/604.1`;
}

/**
 * Crossmint's required terms line, in our theme. The wording and the URL are
 * theirs and must not be reworded.
 */
function CrossmintTermsNotice() {
  const tw = useTailwind();

  return (
    // Mirrors the provider attribution it replaces: BodySm, alternative color,
    // centered, and a 16px gap down to the button.
    <Box twClassName="pb-4">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={tw.style('text-center')}
      >
        {strings('fiat_on_ramp_aggregator.wallet_pay_terms')}{' '}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          // Underlined, not colored: an accent link would pull attention off
          // the payment button.
          style={tw.style('underline')}
          testID={WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.TERMS_LINK}
          onPress={() => {
            Linking.openURL(CROSSMINT_TERMS_URL);
          }}
        >
          {strings('fiat_on_ramp_aggregator.terms_of_service')}
        </Text>
        {'.'}
      </Text>
    </Box>
  );
}

/**
 * Crossmint embedded wallet-pay checkout (SDK-less WebView): the hosted
 * Apple Pay button on iOS or Google Pay button on Android, rendered with a
 * transparent background so it can replace the Continue button inline.
 *
 * The terms notice above it is ours; everything from the button down is
 * Crossmint's. Their appearance API hides the inputs and fee summary but gives
 * no control over layout order or branding, so the WebView is sized to fit
 * what they render and the screen is built natively around it.
 *
 * The URL comes from the on-ramp API buy-widget endpoint; no Crossmint API is
 * called from the client. `enableApplePay` disables injectJavaScript and the
 * postMessage polyfill on iOS, so completion is really observed through
 * precreated-order polling and onMessage is only an accelerator.
 */
function WalletPayCheckoutOverlay({
  checkoutUrl,
  interactive,
  webviewHeight = DEFAULT_WEBVIEW_HEIGHT,
  onMessage,
  onReady,
}: WalletPayCheckoutOverlayProps) {
  const userAgent = useMemo(() => getCrossmintCheckoutUserAgent(), []);
  const [isReady, setIsReady] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRevealed = useRef(false);
  const sawReadyEvent = useRef(false);

  // What Crossmint reports, less the crop; the fixed size on iOS.
  const height = contentHeight
    ? Math.max(contentHeight - TOP_CROP, MIN_WEBVIEW_HEIGHT)
    : webviewHeight;

  const markReady = useCallback(() => {
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
    // Events repeat and the fallback races them; tell the caller once.
    if (hasRevealed.current) {
      return;
    }
    hasRevealed.current = true;
    setIsReady(true);
    onReady();
  }, [onReady]);

  const armFallback = useCallback(() => {
    if (hasRevealed.current) {
      return;
    }
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
    }
    fallbackTimer.current = setTimeout(markReady, READY_FALLBACK_MS);
  }, [markReady]);

  useEffect(
    () => () => {
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
      }
    },
    [],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseCrossmintCheckoutMessage(event.nativeEvent.data);

      if (message?.event === CHECKOUT_READY_EVENT) {
        // Not the reveal: their terms line is still on screen. Wait for a
        // height, and restart the clock in case none comes.
        sawReadyEvent.current = true;
        armFallback();
      }

      if (message?.event === CHECKOUT_HEIGHT_EVENT) {
        const reported = Number(message.data?.height);
        // Their observer fires on every body resize, which our own resize can
        // cause, so implausible values are dropped rather than fed back in.
        if (
          Number.isFinite(reported) &&
          reported > TOP_CROP &&
          reported <= MAX_WEBVIEW_HEIGHT
        ) {
          setContentHeight(reported);
        }

        // Revealing keys off any real measurement, not only one worth sizing
        // to: a rejected height still means the checkout has settled.
        if (
          sawReadyEvent.current &&
          Number.isFinite(reported) &&
          reported > 0
        ) {
          markReady();
        }
      }

      onMessage(event);
    },
    [armFallback, markReady, onMessage],
  );

  const handleLoadEnd = useCallback(() => {
    if (fallbackTimer.current) {
      return;
    }
    armFallback();
  }, [armFallback]);

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
          height: height + TOP_CROP,
          marginTop: -TOP_CROP,
          backgroundColor: commonColors.transparent,
        },
        // Stays mounted so the page keeps loading, but draws nothing and joins
        // no layout. Absolute rather than zero-height: the caller's action
        // section uses a `gap`, which a zero-height child still earns.
        loading: {
          position: 'absolute',
          height: 0,
          opacity: 0,
          overflow: 'hidden',
        },
      }),
    [height],
  );

  return (
    <Box style={isReady ? undefined : styles.loading}>
      {CROSSMINT_RENDERS_TERMS ? null : <CrossmintTermsNotice />}
      <Box
        style={styles.host}
        pointerEvents={interactive && isReady ? 'auto' : 'none'}
        testID={WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.OVERLAY}
      >
        <WebView
          testID={WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.WEBVIEW}
          source={{ uri: checkoutUrl }}
          style={styles.webView}
          onLoadEnd={handleLoadEnd}
          // Same flags as the Ramp Checkout WebView (working Apple Pay).
          enableApplePay
          paymentRequestEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          // `scrollEnabled` is iOS-only, and Android has no equivalent, so
          // there it stays unscrollable by fitting the height to the content.
          scrollEnabled={false}
          overScrollMode="never"
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          onMessage={handleMessage}
          userAgent={userAgent}
        />
      </Box>
    </Box>
  );
}

export default WalletPayCheckoutOverlay;
