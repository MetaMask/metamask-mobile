import { useCallback, useMemo, useRef, useState } from 'react';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';
import type { BuyWidgetFallback } from '@metamask/ramps-controller';

import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import type { FunnelBaseProps } from '../utils/webviewFunnelAnalytics';
import { getCheckoutPageEventAdapter } from '../utils/checkoutPageEvents';
import { getProviderDeeplinkRedirectUrl } from '../utils/buildQuoteWithRedirectUrl';
import { useRampsQuotes } from './useRampsQuotes';
import { useOpenHostedBuyWidget } from './useOpenHostedBuyWidget';

/** Which CTA Checkout's error view should render for a given error. */
export type CheckoutErrorCtaMode = 'retry' | 'go_back';

export interface UseCheckoutPageEventsParams {
  /** Resolves the page-event adapter; providers without one get no `onMessage`. */
  providerCode?: string;
  fallbackBuyWidget?: BuyWidgetFallback;
  walletAddress?: string | null;
  chainId?: string;
  /** Headless has no UI for the fallback action, so a limit event fails like any error. */
  isHeadless: boolean;
  analyticsBaseProps: FunnelBaseProps;
  onCompleted: () => void;
  onError: (message: string, ctaMode?: CheckoutErrorCtaMode) => void;
  onFallbackOpened: () => void;
}

export interface UseCheckoutPageEventsResult {
  onMessage: ((event: WebViewMessageEvent) => void) | undefined;
  limitErrorCode: string | undefined;
  isFallbackPending: boolean;
  onFallbackPress: () => Promise<void>;
}

// Runs trusted WebView messages through the provider adapter and drives the
// page state, analytics and limit fallback; navigation stays with the caller.
export function useCheckoutPageEvents({
  providerCode,
  fallbackBuyWidget,
  walletAddress,
  chainId,
  isHeadless,
  analyticsBaseProps,
  onCompleted,
  onError,
  onFallbackOpened,
}: UseCheckoutPageEventsParams): UseCheckoutPageEventsResult {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { getFallbackBuyWidgetData } = useRampsQuotes();
  const { openHostedBuyWidget } = useOpenHostedBuyWidget();
  const adapter = useMemo(
    () => getCheckoutPageEventAdapter(providerCode),
    [providerCode],
  );

  // A single-use page URL can't be reloaded, so its errors offer go back.
  const errorCtaMode: CheckoutErrorCtaMode = adapter?.singleUseCheckoutUrl
    ? 'go_back'
    : 'retry';
  const [limitErrorCode, setLimitErrorCode] = useState<string | undefined>(
    undefined,
  );
  const trackedEventNamesRef = useRef<Set<string>>(new Set());

  // Ref guards re-entrancy (a second tap can land before the re-render);
  // state only drives the button's isLoading.
  const isFallbackPendingRef = useRef(false);
  const [isFallbackPending, setIsFallbackPending] = useState(false);

  // Track each page event name once per session so repeats don't flood analytics.
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
      if (!adapter) {
        return;
      }
      // Only trust messages posted from the provider's checkout origin.
      if (!adapter.isTrustedUrl(event.nativeEvent.url)) {
        return;
      }
      const pageEvent = adapter.parse(event.nativeEvent.data);
      if (!pageEvent) {
        return;
      }
      const { kind, name, errorCode, reason } = pageEvent;
      trackProviderEvent(name, errorCode);
      if (kind !== 'limit_reached') {
        setLimitErrorCode(undefined);
      }

      switch (kind) {
        case 'load_failed':
          // Fixed copy only; an expired link always needs go back.
          if (reason === 'link_expired') {
            onError(
              strings('fiat_on_ramp_aggregator.checkout_link_expired'),
              'go_back',
            );
          } else {
            onError(
              strings('fiat_on_ramp_aggregator.something_went_wrong'),
              errorCtaMode,
            );
          }
          break;
        case 'completed':
          onCompleted();
          break;
        case 'payment_failed':
          onError(
            strings('fiat_on_ramp_aggregator.checkout_payment_failed'),
            errorCtaMode,
          );
          break;
        case 'limit_reached':
          if (!isHeadless && fallbackBuyWidget) {
            setLimitErrorCode(errorCode);
          } else {
            onError(
              strings('fiat_on_ramp_aggregator.something_went_wrong'),
              errorCtaMode,
            );
          }
          break;
        case 'failed':
          onError(
            strings('fiat_on_ramp_aggregator.something_went_wrong'),
            errorCtaMode,
          );
          break;
        // Sheet stays open on cancel; after commit, polling owns the order state.
        case 'cancelled':
        case 'loaded':
        case 'payment_started':
        case 'committed':
        case 'tracked_only':
        default:
          break;
      }
    },
    [
      adapter,
      trackProviderEvent,
      onCompleted,
      onError,
      errorCtaMode,
      isHeadless,
      fallbackBuyWidget,
    ],
  );

  // Don't pop the sheet here: openHostedBuyWidget resets the stack once the
  // hand-off actually happens, so a rejected hand-off still has UI to show.
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
      const redirectUrl = getProviderDeeplinkRedirectUrl(providerCode);
      const hostedBuyWidget = await getFallbackBuyWidgetData(
        fallbackBuyWidget,
        { redirectUrl },
      );
      if (!hostedBuyWidget?.url) {
        throw new Error('No hosted widget URL available for provider');
      }

      await openHostedBuyWidget({
        url: hostedBuyWidget.url,
        redirectUrl,
        providerCode,
        orderId: hostedBuyWidget.orderId,
        walletAddress,
        chainId,
        browser: hostedBuyWidget.browser,
      });
    } catch (fallbackError) {
      Logger.error(fallbackError as Error, {
        message: 'UnifiedCheckout: error opening hosted checkout fallback',
      });
      resetPending();
      // Retry, not go back: the limit code survives the retry, so Checkout
      // shows the fallback action again (a fresh fetch, not the used link).
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
    getFallbackBuyWidgetData,
    openHostedBuyWidget,
    walletAddress,
    chainId,
    onError,
  ]);

  return {
    onMessage: adapter ? handleMessage : undefined,
    limitErrorCode,
    isFallbackPending,
    onFallbackPress,
  };
}

export default useCheckoutPageEvents;
