import { useCallback, useRef, useState } from 'react';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';

import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import type { FunnelBaseProps } from '../utils/webviewFunnelAnalytics';
import {
  parseCoinbaseCheckoutEvent,
  isCoinbaseCheckoutUrl,
  COINBASE_LIMIT_ERROR_CODES,
  type BuyWidgetFallback,
} from '../utils/coinbaseEmbedded';
import {
  buildFallbackWidgetQuote,
  getProviderDeeplinkRedirectUrl,
} from '../utils/buildQuoteWithRedirectUrl';
import { useRampsQuotes } from './useRampsQuotes';
import { useOpenHostedBuyWidget } from './useOpenHostedBuyWidget';

/**
 * Local state machine for the Coinbase embedded checkout page events. Order
 * state stays authoritative from the existing precreated-order polling; this
 * only tracks what the page itself is doing so Checkout can react (close on
 * completion, show a fixed error, or offer the guest-limit fallback).
 */
export type EmbeddedCheckoutState =
  | 'loading'
  | 'ready'
  | 'paying'
  | 'committed'
  | 'done'
  | 'limit_error'
  | 'error';

/** Which CTA Checkout's error view should render for a given error. */
export type CheckoutErrorCtaMode = 'retry' | 'go_back';

export interface UseCoinbaseEmbeddedCheckoutParams {
  /** Only parse WebView messages when this is a Coinbase embedded checkout. */
  enabled: boolean;
  /** Hosted-widget fallback the API attached to the quote, if any. */
  fallbackBuyWidget?: BuyWidgetFallback;
  providerCode?: string;
  walletAddress?: string | null;
  chainId?: string;
  /**
   * A headless Checkout has no UI to show the fallback action on, so a
   * guest-limit session_error fails like any other error.
   */
  isHeadless: boolean;
  /** Checkout funnel base props attached to every event this hook tracks. */
  analyticsBaseProps: FunnelBaseProps;
  /** `polling_success`: funds were sent, leave the WebView. */
  onCompleted: () => void;
  /** Any terminal page error; the caller decides between headless fail and in-app ErrorView. */
  onError: (message: string, ctaMode?: CheckoutErrorCtaMode) => void;
  /** Called when the user taps the guest-limit fallback action, before the hand-off starts. */
  onFallbackOpened: () => void;
}

export interface UseCoinbaseEmbeddedCheckoutResult {
  /** WebView `onMessage` handler, or undefined when not enabled. */
  onMessage: ((event: WebViewMessageEvent) => void) | undefined;
  /** Set while the page reports a guest-limit error and a fallback exists. */
  limitErrorCode: string | undefined;
  /** True while the hosted-widget hand-off is in flight. */
  isFallbackPending: boolean;
  /** Fetches the hosted widget from the fallback URL and hands off to the OS browser flow. */
  onFallbackPress: () => Promise<void>;
}

/**
 * Owns the Coinbase embedded checkout page-event state machine for
 * Checkout: parses trusted `onramp_api.*` messages from the WebView, maps
 * them to a local state, tracks the provider-event and fallback analytics,
 * and drives the guest-limit fallback hand-off. Navigation and
 * headless-session teardown stay with the caller via the `on*` callbacks.
 */
export function useCoinbaseEmbeddedCheckout({
  enabled,
  fallbackBuyWidget,
  providerCode,
  walletAddress,
  chainId,
  isHeadless,
  analyticsBaseProps,
  onCompleted,
  onError,
  onFallbackOpened,
}: UseCoinbaseEmbeddedCheckoutParams): UseCoinbaseEmbeddedCheckoutResult {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { getBuyWidgetData } = useRampsQuotes();
  const { openHostedBuyWidget } = useOpenHostedBuyWidget();

  // The ref is authoritative for logic that runs inside the message handler;
  // the state mirrors only the part the UI needs (the limit-error fallback).
  const stateRef = useRef<EmbeddedCheckoutState>('loading');
  const [limitErrorCode, setLimitErrorCode] = useState<string | undefined>(
    undefined,
  );
  const trackedEventNamesRef = useRef<Set<string>>(new Set());

  // Guest-limit fallback hand-off in flight. The ref is authoritative for the
  // re-entrancy guard (a second tap can land before React re-renders the
  // disabled button and a stale closure would still read the old state); the
  // state mirror only drives the button's isLoading UI.
  const isFallbackPendingRef = useRef(false);
  const [isFallbackPending, setIsFallbackPending] = useState(false);

  const setState = useCallback((next: EmbeddedCheckoutState) => {
    stateRef.current = next;
    if (next !== 'limit_error') {
      setLimitErrorCode(undefined);
    }
  }, []);

  // Track every distinct page event name once per Checkout session so
  // repeats (e.g. polling_start while the order settles) do not flood
  // analytics.
  const trackProviderEvent = useCallback(
    (eventName: string, errorCode?: string) => {
      if (trackedEventNamesRef.current.has(eventName)) {
        return;
      }
      trackedEventNamesRef.current.add(eventName);
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.RAMPS_CHECKOUT_PROVIDER_EVENT_RECEIVED,
        )
          .addProperties({
            ...analyticsBaseProps,
            event_name: eventName,
            error_code: errorCode,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, analyticsBaseProps],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      // Only trust messages posted from the Coinbase checkout origin; never
      // parse or track anything else, even if its body happens to look like
      // a Coinbase event.
      if (!isCoinbaseCheckoutUrl(event.nativeEvent.url)) {
        return;
      }
      const parsed = parseCoinbaseCheckoutEvent(event.nativeEvent.data);
      if (!parsed) {
        return;
      }
      const { eventName, errorCode } = parsed;
      trackProviderEvent(eventName, errorCode);

      switch (eventName) {
        case 'load_success':
          setState('ready');
          break;
        case 'load_error':
          setState('error');
          // The page never renders its own error text; every load_error is
          // shown with a fixed, non-page-provided message. A reused
          // single-use link needs the user to go back rather than retry
          // (retrying would just remount the same expired link).
          if (errorCode === 'expired_session_token') {
            onError(
              strings('fiat_on_ramp_aggregator.checkout_link_expired'),
              'go_back',
            );
          } else {
            onError(strings('fiat_on_ramp_aggregator.something_went_wrong'));
          }
          break;
        case 'apple_pay_button_pressed':
        case 'google_pay_button_pressed':
        case 'pending_payment_auth':
        case 'payment_authorized':
          setState('paying');
          break;
        case 'commit_success':
          setState('committed');
          break;
        case 'polling_success':
          setState('done');
          onCompleted();
          break;
        case 'commit_error':
        case 'polling_error':
          setState('error');
          // Fixed copy only; the page's errorMessage is never rendered.
          onError(strings('fiat_on_ramp_aggregator.checkout_payment_failed'));
          break;
        case 'cancel':
          // Before commit_success: the user closed the page, do nothing
          // destructive, the sheet stays and the user can close it. After
          // commit_success (or once the order is done): ignored, polling
          // already owns the final order state.
          break;
        case 'session_error':
          if (
            errorCode &&
            COINBASE_LIMIT_ERROR_CODES.has(errorCode) &&
            !isHeadless &&
            fallbackBuyWidget
          ) {
            setState('limit_error');
            setLimitErrorCode(errorCode);
          } else {
            // Headless, no fallback from the API, or a non-limit code: all
            // fail like any other error with fixed copy.
            setState('error');
            onError(strings('fiat_on_ramp_aggregator.something_went_wrong'));
          }
          break;
        default:
          // load_pending, verification_success, upgrade_submit_success,
          // upgrade_approved, polling_start: tracked above, no state change.
          break;
      }
    },
    [
      trackProviderEvent,
      setState,
      onCompleted,
      onError,
      isHeadless,
      fallbackBuyWidget,
    ],
  );

  // The user tapped "Continue with your Coinbase account" on the limit
  // error. Fetches the hosted widget from the fallback URL and hands off to
  // the OS-browser hosted flow, which registers its own new precreated
  // order. The existing `cdp-` precreated order is left as-is.
  //
  // Nothing pops the Checkout sheet here: `openHostedBuyWidget` resets the
  // navigation stack on every path that doesn't throw, so the sheet is
  // replaced only once the hand-off has actually happened. Popping first
  // would strand the user with neither the sheet, the browser, nor an error
  // if the hand-off rejected.
  const onFallbackPress = useCallback(async () => {
    if (isFallbackPendingRef.current) {
      return;
    }
    isFallbackPendingRef.current = true;
    setIsFallbackPending(true);
    onFallbackOpened();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_FALLBACK_OPENED)
        .addProperties({
          ...analyticsBaseProps,
          error_code: limitErrorCode,
        })
        .build(),
    );

    const resetPending = () => {
      isFallbackPendingRef.current = false;
      setIsFallbackPending(false);
    };

    if (!fallbackBuyWidget || !providerCode) {
      resetPending();
      onError(strings('fiat_on_ramp_aggregator.something_went_wrong'));
      return;
    }

    try {
      const hostedBuyWidget = await getBuyWidgetData(
        buildFallbackWidgetQuote(fallbackBuyWidget.url, providerCode),
      );
      if (!hostedBuyWidget?.url) {
        throw new Error('No hosted widget URL available for provider');
      }

      await openHostedBuyWidget({
        url: hostedBuyWidget.url,
        redirectUrl: getProviderDeeplinkRedirectUrl(providerCode),
        providerCode,
        orderId: hostedBuyWidget.orderId,
        walletAddress,
        chainId,
      });
    } catch (fallbackError) {
      Logger.error(fallbackError as Error, {
        message: 'UnifiedCheckout: error opening Coinbase hosted fallback',
      });
      resetPending();
      onError(strings('fiat_on_ramp_aggregator.something_went_wrong'));
    }
  }, [
    onFallbackOpened,
    trackEvent,
    createEventBuilder,
    analyticsBaseProps,
    limitErrorCode,
    fallbackBuyWidget,
    providerCode,
    getBuyWidgetData,
    openHostedBuyWidget,
    walletAddress,
    chainId,
    onError,
  ]);

  return {
    onMessage: enabled ? handleMessage : undefined,
    limitErrorCode,
    isFallbackPending,
    onFallbackPress,
  };
}

export default useCoinbaseEmbeddedCheckout;
