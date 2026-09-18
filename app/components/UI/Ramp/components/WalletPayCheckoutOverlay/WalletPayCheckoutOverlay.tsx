import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Linking, Platform, StyleSheet } from 'react-native';
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
import { AnimationDuration } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import { useTheme } from '../../../../../util/theme';
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
 * Reveal deadline once the page has posted anything, proving the bridge
 * works: the ready event is expected and this only guards against it never
 * coming. Their ready lands ~1.7s after load end, so the short deadline
 * above would reveal an empty slot first.
 */
const READY_WITH_BRIDGE_FALLBACK_MS = 8000;

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

/**
 * Crossfade from Continue to the payment button. Short enough to read as the
 * button appearing, long enough to cover a paint that lands a frame late.
 */
const REVEAL_DURATION_MS = AnimationDuration.Promptly;

/**
 * Where the caller's Continue button sits while the overlay is off-layout:
 * flush with the action section's inner bottom edge, above its bottom
 * padding (`actionSection.paddingBottom` in BuildQuote.styles). Anchoring
 * here lets the overlay fade in over Continue and then join the layout in
 * the same place, so the swap moves nothing.
 */
const ACTION_SECTION_BOTTOM_PADDING = 16;

/**
 * hidden: loading off-layout, invisible, so WebKit paints the button early.
 * revealing: fading in over the caller's Continue button.
 * revealed: in the layout, Continue gone.
 */
type RevealPhase = 'hidden' | 'revealing' | 'revealed';

interface WalletPayCheckoutOverlayProps {
  checkoutUrl: string;
  /** Whether the WebView takes taps. Stays mounted either way, for order events. */
  interactive: boolean;
  /**
   * Hides the checkout again after it was shown, keeping it mounted for
   * order events, so the caller can put its own state in the slot.
   */
  concealed?: boolean;
  webviewHeight?: number;
  onMessage: (event: WebViewMessageEvent) => void;
  /**
   * Fires once the button has rendered and faded in over Continue, so the
   * caller can drop Continue without a visible swap.
   */
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
  return (
    // Mirrors the provider attribution it replaces (alternative color,
    // centered, 16px gap down to the button), but at 10px so the legal line
    // stays subordinate to the payment button.
    <Box twClassName="pb-4">
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('fiat_on_ramp_aggregator.wallet_pay_terms')}{' '}
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          // Underlined, not colored: an accent link would pull attention off
          // the payment button.
          twClassName="underline"
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
  concealed = false,
  webviewHeight = DEFAULT_WEBVIEW_HEIGHT,
  onMessage,
  onReady,
}: WalletPayCheckoutOverlayProps) {
  const userAgent = useMemo(() => getCrossmintCheckoutUserAgent(), []);
  const { colors } = useTheme();
  const [phase, setPhase] = useState<RevealPhase>('hidden');
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRevealed = useRef(false);
  const sawReadyEvent = useRef(false);
  const sawAnyMessage = useRef(false);
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const isRevealed = phase === 'revealed' && !concealed;

  // Read at fade end rather than captured by the effect, so a caller that
  // re-creates onReady mid-fade neither restarts the fade nor gets stale.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (phase !== 'revealing') {
      return;
    }
    let cancelled = false;
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: REVEAL_DURATION_MS,
      useNativeDriver: true,
    }).start(() => {
      if (cancelled) {
        return;
      }
      setPhase('revealed');
      onReadyRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [phase, revealOpacity]);

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
    setPhase('revealing');
  }, []);

  const armFallback = useCallback(
    (delayMs: number = READY_FALLBACK_MS) => {
      if (hasRevealed.current) {
        return;
      }
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
      }
      fallbackTimer.current = setTimeout(markReady, delayMs);
    },
    [markReady],
  );

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

      // First word from the page: the bridge works, so the ready event will
      // come and the load-end deadline must not reveal ahead of it.
      if (!sawAnyMessage.current) {
        sawAnyMessage.current = true;
        if (!sawReadyEvent.current) {
          armFallback(READY_WITH_BRIDGE_FALLBACK_MS);
        }
      }

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
    armFallback(
      sawAnyMessage.current ? READY_WITH_BRIDGE_FALLBACK_MS : undefined,
    );
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
        // Off the layout while loading and fading, anchored where the button
        // will end up. Absolute rather than zero-height: the caller's action
        // section uses a `gap`, which a zero-height child still earns. Kept
        // at full size rather than clipped: WebKit only paints what is
        // exposed, so a zero-height box left the button unpainted until the
        // reveal, which then showed an empty slot for a few frames.
        floating: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: ACTION_SECTION_BOTTOM_PADDING,
        },
        hidden: {
          opacity: 0,
        },
        // Above Continue, on the screen surface, so the fade covers it
        // rather than blending the two.
        revealing: {
          zIndex: 1,
          backgroundColor: colors.background.default,
        },
      }),
    [height, colors.background.default],
  );

  const phaseStyle = useMemo(() => {
    if (concealed) {
      return [styles.floating, styles.hidden];
    }
    switch (phase) {
      case 'hidden':
        return [styles.floating, styles.hidden];
      case 'revealing':
        return [styles.floating, styles.revealing, { opacity: revealOpacity }];
      default:
        return undefined;
    }
  }, [concealed, phase, styles, revealOpacity]);

  return (
    // Off-layout it overlaps Continue; nothing in it (the terms link
    // included) may take a tap until it is the only thing there.
    <Animated.View
      style={phaseStyle}
      pointerEvents={isRevealed ? 'auto' : 'none'}
      testID={WALLET_PAY_CHECKOUT_OVERLAY_TEST_IDS.ROOT}
    >
      {CROSSMINT_RENDERS_TERMS ? null : <CrossmintTermsNotice />}
      <Box
        style={styles.host}
        pointerEvents={interactive && isRevealed ? 'auto' : 'none'}
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
    </Animated.View>
  );
}

export default WalletPayCheckoutOverlay;
