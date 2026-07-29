import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AnyAction, Dispatch } from 'redux';
import { useDispatch } from 'react-redux';
import { parseUrl } from 'query-string';
import { v4 as uuidv4 } from 'uuid';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import type { RampsOrder } from '@metamask/ramps-controller';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import ErrorView from '../../Aggregator/components/ErrorView';
import Logger from '../../../../../util/Logger';
import { protectWalletModalVisible } from '../../../../../actions/user';
import { useRampsOrders } from '../../hooks/useRampsOrders';
import {
  emitOrderConfirmedAnalyticsFromCallback,
  emitTerminalOrderAnalyticsFromCallback,
  isTerminalOrderStatus,
} from '../../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics';
import { setHeadlessOrderContext } from '../../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry';
import {
  BottomSheet,
  HeaderStandard,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import {
  closeSession,
  failSession,
  getSession,
} from '../../headless/sessionRegistry';
import type { HeadlessSession } from '../../headless/types';
import {
  dismissHeadlessFlow,
  setHeadlessEntryCardTouchThrough,
} from '../../headless/headlessEntryNavigation';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './Checkout.styles';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { getProviderWebviewColors } from '../../utils/getProviderWebviewColors';
import Device from '../../../../../util/device';
import { shouldStartLoadWithRequest } from '../../../../../util/browser';
import { CHECKOUT_TEST_IDS } from './Checkout.testIds';
import { redactUrlForAnalytics } from '../../utils/redactUrlForAnalytics';
import {
  buildBaseProps,
  extractHostname,
  type CloseSource,
} from '../../utils/webviewFunnelAnalytics';
import type { RampSurface } from '../../types/depositAnalytics';

interface CheckoutParams {
  url: string;
  providerName: string;
  /** Optional provider-specific userAgent for the WebView (e.g. features.buy.userAgent). */
  userAgent?: string;
  /** V2 callback flow: provider code (e.g., "moonpay", "transak"). */
  providerCode?: string;
  /** V2: order ID from BuyWidget for polling. Prefer orderId; customOrderId kept for backward compatibility. */
  orderId?: string | null;
  /** @deprecated Use orderId instead. */
  customOrderId?: string | null;
  /** V2 callback flow: wallet address for this order. */
  walletAddress?: string;
  /** V2: network chain ID for the order. */
  network?: string;
  /** V2: fiat currency code (e.g., "USD"). Fallback when the callback order has no fiatCurrency yet. */
  currency?: string;
  /** V2: crypto currency symbol (e.g., "ETH"). Fallback when the callback order has no cryptoCurrency yet. */
  cryptocurrency?: string;
  /** V2: the Redux provider type for this order. Defaults to AGGREGATOR. */
  providerType?: FIAT_ORDER_PROVIDERS;
  /** Optional callback invoked on navigation state changes after URL de-duplication (e.g. redirect URLs). */
  onNavigationStateChange?: (navState: { url: string }) => void;
  /**
   * When set, Checkout is participating in a headless buy session. On
   * successful callback the screen fires the session's `onOrderCreated`
   * callback, closes the session, and pops the ramp stack instead of
   * resetting to `RAMPS_ORDER_DETAILS`. Headless consumers drive their own UI.
   */
  headlessSessionId?: string;
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.RAMP.CHECKOUT,
);

interface HandleHeadlessCheckoutCallbackParams {
  sessionId: string;
  session: HeadlessSession;
  providerCode: string;
  callbackUrl: string;
  walletAddress: string;
  headlessRampSurface: RampSurface | undefined;
  regionCode: string | undefined;
  getOrderFromCallback: (
    providerCode: string,
    callbackUrl: string,
    walletAddress: string,
  ) => Promise<RampsOrder>;
  addOrder: (order: RampsOrder) => void;
  dispatch: Dispatch<AnyAction>;
  dismissActiveHeadlessFlow: () => void;
}

/**
 * Headless checkout callback: fetch order, emit mid/terminal analytics, notify
 * consumer, and tear down the session. Caller must gate on session presence.
 */
async function handleHeadlessCheckoutCallback({
  sessionId,
  session,
  providerCode,
  callbackUrl,
  walletAddress,
  headlessRampSurface,
  regionCode,
  getOrderFromCallback,
  addOrder,
  dispatch,
  dismissActiveHeadlessFlow,
}: HandleHeadlessCheckoutCallbackParams): Promise<void> {
  const rampsOrder = await getOrderFromCallback(
    providerCode,
    callbackUrl,
    walletAddress,
  );
  if (!rampsOrder) {
    throw new Error('Order could not be retrieved from callback');
  }
  addOrder(rampsOrder);

  // TRAM-3623/3691: carry headless context for terminal RAMPS_TRANSACTION_FAILED.
  setHeadlessOrderContext(rampsOrder.providerOrderId, {
    rampSurface: headlessRampSurface,
    region: regionCode ?? '',
  });

  // TRAM-3738 / TRAM-3691: headless callback skips OrderDetails.
  if (isTerminalOrderStatus(rampsOrder.status)) {
    emitTerminalOrderAnalyticsFromCallback(rampsOrder);
  } else {
    emitOrderConfirmedAnalyticsFromCallback(rampsOrder, {
      rampType: 'HEADLESS',
      rampSurface: headlessRampSurface,
      region: regionCode,
    });
  }

  dispatch(protectWalletModalVisible());
  try {
    session.callbacks.onOrderCreated(rampsOrder.providerOrderId);
  } catch (callbackError) {
    Logger.error(
      callbackError as Error,
      'UnifiedCheckout: onOrderCreated callback threw',
    );
  }
  closeSession(sessionId, { reason: 'completed' });
  dismissActiveHeadlessFlow();
}

const Checkout = () => {
  // Must match redirectUrl from getRampCallbackBaseUrl() on quote fetch
  // (including Dev → on-ramp.dev-api), not Aggregator/sdk's content host.
  const callbackBaseUrl = getRampCallbackBaseUrl();
  const sheetRef = useRef<BottomSheetRef>(null);
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const isRedirectionHandledRef = useRef(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<CheckoutParams>();
  const { themeAppearance } = useTheme();
  const { addOrder, addPrecreatedOrder, getOrderFromCallback } =
    useRampsOrders();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { userRegion } = useRampsUserRegion();
  const {
    url: uri,
    providerName,
    providerCode,
    orderId: orderIdParam,
    customOrderId,
    walletAddress,
    network,
    userAgent,
    onNavigationStateChange,
    cryptocurrency,
    headlessSessionId,
  } = params ?? {};

  // Resolve the provider's iframe background color for the current theme.
  // Applied to both the MMDS BottomSheet (via twClassName) and the WebView
  // (via styles.webview) so the native chrome matches the embedded checkout
  // seamlessly. Unknown providers fall back to the BottomSheet default surface.
  const isDark = themeAppearance === AppThemeKey.dark;
  const providerBg = getProviderWebviewColors(providerCode, isDark);
  const { styles } = useStyles(styleSheet, { providerBg });
  const providerBgTwClassName = `bg-[${providerBg}]`;

  const effectiveOrderId = (orderIdParam ?? customOrderId)?.trim() || null;

  // Headless deposit (TRAM-3623): when a headless session drives this Checkout,
  // every `buildBaseProps` funnel event is tagged `ramp_type: 'HEADLESS'` plus
  // the seeded `ramp_surface`/`region`; non-headless UB2 keeps its defaults.
  const headlessRampSurface =
    getSession(headlessSessionId)?.params?.rampSurface;
  const regionCode = userRegion?.regionCode || undefined;
  const headlessBaseOverrides = useMemo(
    () =>
      headlessSessionId
        ? {
            rampType: 'HEADLESS' as const,
            rampSurface: headlessRampSurface,
            region: regionCode,
          }
        : {},
    [headlessSessionId, headlessRampSurface, regionCode],
  );
  // The non-`buildBaseProps` Checkout emits (RAMPS_SCREEN_VIEWED,
  // RAMPS_CLOSE_BUTTON_CLICKED) default to 'UNIFIED_BUY_2'; flip them the same
  // way (TRAM-3623).
  const headlessRampProps = useMemo(
    () =>
      headlessSessionId
        ? { ramp_type: 'HEADLESS' as const, ramp_surface: headlessRampSurface }
        : { ramp_type: 'UNIFIED_BUY_2' as const },
    [headlessSessionId, headlessRampSurface],
  );

  const initialUriRef = useRef(uri);
  const registeredOrderIdsRef = useRef<Set<string>>(new Set());
  const hasCallbackFlow = Boolean(providerCode && walletAddress);

  const checkoutSessionId = useMemo(
    () => effectiveOrderId ?? uuidv4(),
    [effectiveOrderId],
  );
  const urlHistoryRef = useRef<{
    current: string | null;
    previous: string | null;
  }>({ current: null, previous: null });
  const stepIndexRef = useRef(0);
  const openedAtRef = useRef<number>(Date.now());
  const closeSourceRef = useRef<CloseSource | null>(null);
  const hasTerminatedHeadlessSessionRef = useRef(false);
  const hasMadeHeadlessCheckoutInteractiveRef = useRef(false);
  const loadStartTimeRef = useRef<number | null>(null);
  const loadUrlErrorsRef = useRef<Set<string>>(new Set());
  const lastLoadCompleteUrlRef = useRef<string | null>(null);
  const previousNavStateUrlRef = useRef<string | null>(null);

  const hasTrackedScreenViewRef = useRef(false);

  useEffect(() => {
    if (!headlessSessionId) {
      return;
    }

    const touchThroughWhileLoading = Boolean(uri);
    hasMadeHeadlessCheckoutInteractiveRef.current = !touchThroughWhileLoading;
    setHeadlessEntryCardTouchThrough(navigation, touchThroughWhileLoading);

    return () => {
      setHeadlessEntryCardTouchThrough(navigation, false);
    };
  }, [navigation, headlessSessionId, uri]);

  useEffect(() => {
    if (uri && !hasTrackedScreenViewRef.current) {
      hasTrackedScreenViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
          .addProperties({
            location: 'Checkout',
            ...headlessRampProps,
            ...(headlessSessionId ? { region: regionCode } : {}),
          })
          .build(),
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_OPENED)
          .addProperties({
            ...buildBaseProps({
              checkoutSessionId,
              providerName,
              ...headlessBaseOverrides,
            }),
            initial_url_path: redactUrlForAnalytics(uri),
            has_callback_flow: hasCallbackFlow,
            order_id: effectiveOrderId ?? undefined,
          })
          .build(),
      );
    }
  }, [
    uri,
    createEventBuilder,
    trackEvent,
    checkoutSessionId,
    providerName,
    hasCallbackFlow,
    effectiveOrderId,
    headlessRampProps,
    headlessBaseOverrides,
    headlessSessionId,
    regionCode,
  ]);

  const dismissActiveHeadlessFlow = useCallback(() => {
    dismissHeadlessFlow(navigation);
  }, [navigation]);

  const failHeadlessCheckout = useCallback(
    (checkoutError: unknown) => {
      if (hasTerminatedHeadlessSessionRef.current) {
        return false;
      }
      // Snapshot the session BEFORE failSession tears it down so the HEADLESS
      // RAMPS_ORDER_FAILED event (TRAM-3623 §7) can carry the seeded
      // ramp_surface and quote/amount context; failSession can't emit itself.
      const session = getSession(headlessSessionId);
      if (!failSession(headlessSessionId, checkoutError)) {
        return false;
      }
      if (session) {
        const quoteRecord = session.params?.quote?.quote;
        trackEvent(
          createEventBuilder(MetaMetricsEvents.RAMPS_ORDER_FAILED)
            .addProperties({
              ramp_type: 'HEADLESS',
              ramp_surface: session.params?.rampSurface,
              amount_source: Number(
                quoteRecord?.amountIn ?? session.params?.amount ?? 0,
              ),
              amount_destination: Number(quoteRecord?.amountOut ?? 0),
              payment_method_id: quoteRecord?.paymentMethod ?? '',
              region: regionCode ?? '',
              chain_id: network ?? '',
              currency_destination: params?.cryptocurrency ?? '',
              currency_source: params?.currency ?? '',
              error_message:
                checkoutError instanceof Error
                  ? checkoutError.message
                  : String(checkoutError),
              is_authenticated: true,
            })
            .build(),
        );
      }
      hasTerminatedHeadlessSessionRef.current = true;
      dismissActiveHeadlessFlow();
      return true;
    },
    [
      headlessSessionId,
      dismissActiveHeadlessFlow,
      trackEvent,
      createEventBuilder,
      regionCode,
      network,
      params?.cryptocurrency,
      params?.currency,
    ],
  );

  useEffect(() => {
    // For external-browser flows (e.g. PayPal), addPrecreatedOrder is called in
    // BuildQuote; the user never reaches Checkout. For WebView flows,
    // providerCode and walletAddress are passed, so hasCallbackFlow is true
    // and we can register. hasCallbackFlow being false means we lack the data
    // required for addPrecreatedOrder anyway.
    // Note: network/chainId is optional in addPrecreatedOrder; do not require it
    // in the guard, otherwise orders with unusual chain ID formats (e.g. empty
    // string from chainId.split(':')[1]) would silently skip registration here
    // while external-browser flows would still register (BuildQuote passes
    // chainId: network || undefined without requiring network).
    const canRegister =
      hasCallbackFlow && effectiveOrderId && providerCode && walletAddress;
    if (!canRegister) return;
    if (registeredOrderIdsRef.current.has(effectiveOrderId)) return;
    registeredOrderIdsRef.current.add(effectiveOrderId);
    addPrecreatedOrder({
      orderId: effectiveOrderId,
      providerCode,
      walletAddress,
      chainId: network || undefined,
    });
  }, [
    hasCallbackFlow,
    effectiveOrderId,
    walletAddress,
    network,
    providerCode,
    addPrecreatedOrder,
  ]);

  const recordUrlChange = useCallback(
    (url: string): boolean => {
      if (!url) return false;
      const redacted = redactUrlForAnalytics(url);
      if (redacted === urlHistoryRef.current.current) return false;
      urlHistoryRef.current.previous = urlHistoryRef.current.current;
      urlHistoryRef.current.current = redacted;
      stepIndexRef.current += 1;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_URL_CHANGED)
          .addProperties({
            ...buildBaseProps({
              checkoutSessionId,
              providerName,
              ...headlessBaseOverrides,
            }),
            url_path: redacted,
            previous_url_path: urlHistoryRef.current.previous ?? undefined,
            step_index: stepIndexRef.current,
            is_callback_url: url.startsWith(callbackBaseUrl),
            order_id: effectiveOrderId ?? undefined,
          })
          .build(),
      );
      return true;
    },
    [
      createEventBuilder,
      trackEvent,
      checkoutSessionId,
      providerName,
      effectiveOrderId,
      headlessBaseOverrides,
      callbackBaseUrl,
    ],
  );

  const handleNavigationStateChange = useCallback(
    async (navState: WebViewNavigation) => {
      recordUrlChange(navState.url);

      if (
        !hasCallbackFlow ||
        isRedirectionHandledRef.current ||
        !navState.url.startsWith(callbackBaseUrl) ||
        navState.loading !== false
      ) {
        return;
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_CALLBACK_DETECTED)
          .addProperties({
            ...buildBaseProps({
              checkoutSessionId,
              providerName,
              ...headlessBaseOverrides,
            }),
            url_path: redactUrlForAnalytics(navState.url),
            order_id: effectiveOrderId ?? undefined,
            step_index: stepIndexRef.current,
            time_since_open_ms: Date.now() - openedAtRef.current,
          })
          .build(),
      );

      isRedirectionHandledRef.current = true;

      try {
        const parsedUrl = parseUrl(navState.url);
        if (Object.keys(parsedUrl.query).length === 0) {
          closeSourceRef.current = 'callback_success';
          if (headlessSessionId) {
            hasTerminatedHeadlessSessionRef.current = true;
            closeSession(headlessSessionId, { reason: 'user_dismissed' });
            dismissActiveHeadlessFlow();
            return;
          }
          // @ts-expect-error navigation prop mismatch
          navigation.getParent()?.pop();
          return;
        }

        if (!walletAddress || !providerCode) {
          throw new Error('No wallet address or provider code available');
        }

        // Headless mode: fetch the order, hand the orderId to the consumer,
        // close the session, and unwind out of the ramp stack so the caller
        // regains foreground. Skip RAMPS_ORDER_DETAILS — the headless consumer
        // drives its own UI.
        const headlessSession = headlessSessionId
          ? getSession(headlessSessionId)
          : undefined;
        if (headlessSessionId && headlessSession) {
          await handleHeadlessCheckoutCallback({
            sessionId: headlessSessionId,
            session: headlessSession,
            providerCode,
            callbackUrl: navState.url,
            walletAddress,
            headlessRampSurface,
            regionCode,
            getOrderFromCallback,
            addOrder,
            dispatch,
            dismissActiveHeadlessFlow,
          });
          hasTerminatedHeadlessSessionRef.current = true;
          closeSourceRef.current = 'callback_success';
          return;
        }

        dispatch(protectWalletModalVisible());

        closeSourceRef.current = 'callback_success';

        // Unified buy stack (non-headless): leave the WebView immediately; OrderDetails
        // resolves the order via callback params (same pattern as external-browser return).
        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: {
                callbackUrl: navState.url,
                providerCode,
                walletAddress,
                showCloseButton: true,
                ...(cryptocurrency ? { cryptocurrency } : {}),
              },
            },
          ],
        });
      } catch (navError) {
        closeSourceRef.current = 'callback_error';
        Logger.error(navError as Error, {
          message: 'UnifiedCheckout: error handling callback',
        });
        if (failHeadlessCheckout(navError)) {
          return;
        }
        setError((navError as Error)?.message);
      }
    },
    [
      dispatch,
      hasCallbackFlow,
      providerCode,
      walletAddress,
      navigation,
      cryptocurrency,
      addOrder,
      getOrderFromCallback,
      headlessSessionId,
      dismissActiveHeadlessFlow,
      failHeadlessCheckout,
      recordUrlChange,
      createEventBuilder,
      trackEvent,
      checkoutSessionId,
      providerName,
      effectiveOrderId,
      headlessBaseOverrides,
      headlessRampSurface,
      regionCode,
      callbackBaseUrl,
    ],
  );

  const handleCancelPress = useCallback(() => {
    closeSourceRef.current = 'user_close_button';
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CLOSE_BUTTON_CLICKED)
        .addProperties({
          location: 'Checkout',
          ...headlessRampProps,
        })
        .build(),
    );
  }, [createEventBuilder, trackEvent, headlessRampProps]);
  const handleClosePress = useCallback(() => {
    handleCancelPress();
    if (headlessSessionId) {
      if (hasTerminatedHeadlessSessionRef.current) {
        return;
      }
      hasTerminatedHeadlessSessionRef.current = true;
      closeSession(headlessSessionId, { reason: 'user_dismissed' });
      dismissActiveHeadlessFlow();
      return;
    }
    sheetRef.current?.onCloseBottomSheet();
  }, [handleCancelPress, headlessSessionId, dismissActiveHeadlessFlow]);

  const handleNavigationStateChangeWithDedup = useCallback(
    (navState: { url: string }) => {
      recordUrlChange(navState.url);
      if (navState.url !== previousNavStateUrlRef.current) {
        previousNavStateUrlRef.current = navState.url;
        onNavigationStateChange?.(navState);
      }
    },
    [onNavigationStateChange, recordUrlChange],
  );

  const handleLoadStart = useCallback(() => {
    loadStartTimeRef.current = Date.now();
  }, []);

  const handleLoadEnd = useCallback(
    (syntheticEvent: { nativeEvent: { url: string } }) => {
      if (headlessSessionId && !hasMadeHeadlessCheckoutInteractiveRef.current) {
        hasMadeHeadlessCheckoutInteractiveRef.current = true;
        setHeadlessEntryCardTouchThrough(navigation, false);
      }
      if (loadStartTimeRef.current === null) return;
      const { url: loadedUrl } = syntheticEvent.nativeEvent;
      const redactedLoadedUrl = redactUrlForAnalytics(loadedUrl);
      if (redactedLoadedUrl === lastLoadCompleteUrlRef.current) {
        loadStartTimeRef.current = null;
        return;
      }
      const durationMs = Date.now() - loadStartTimeRef.current;
      loadStartTimeRef.current = null;
      lastLoadCompleteUrlRef.current = redactedLoadedUrl;
      const loadSuccess = !loadUrlErrorsRef.current.delete(loadedUrl);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETED)
          .addProperties({
            ...buildBaseProps({
              checkoutSessionId,
              providerName,
              ...headlessBaseOverrides,
            }),
            url_path: redactedLoadedUrl,
            load_duration_ms: durationMs,
            load_success: loadSuccess,
          })
          .build(),
      );
    },
    [
      createEventBuilder,
      trackEvent,
      checkoutSessionId,
      providerName,
      headlessSessionId,
      navigation,
      headlessBaseOverrides,
    ],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    ({ url }: { url: string }) => shouldStartLoadWithRequest(url, Logger),
    [],
  );

  const fireClosedRef = useRef<() => void>(() => {
    /* no-op until initialized */
  });
  const closeHeadlessOnUnmountRef = useRef<() => void>(() => undefined);
  closeHeadlessOnUnmountRef.current = () => {
    if (!headlessSessionId || hasTerminatedHeadlessSessionRef.current) {
      return;
    }
    const session = getSession(headlessSessionId);
    if (!session) {
      return;
    }
    hasTerminatedHeadlessSessionRef.current = true;
    closeSession(headlessSessionId, { reason: 'user_dismissed' });
    dismissActiveHeadlessFlow();
  };
  fireClosedRef.current = () => {
    if (!hasTrackedScreenViewRef.current) return;
    const lastUrl = urlHistoryRef.current.current;
    const prevUrl = urlHistoryRef.current.previous;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED)
        .addProperties({
          ...buildBaseProps({
            checkoutSessionId,
            providerName,
            ...headlessBaseOverrides,
          }),
          close_source: closeSourceRef.current ?? 'background',
          order_id: effectiveOrderId ?? undefined,
          last_url_hostname: lastUrl ? extractHostname(lastUrl) : undefined,
          last_url_path: lastUrl ? redactUrlForAnalytics(lastUrl) : undefined,
          previous_url_hostname: prevUrl ? extractHostname(prevUrl) : undefined,
          previous_url_path: prevUrl
            ? redactUrlForAnalytics(prevUrl)
            : undefined,
          callback_reached: isRedirectionHandledRef.current,
          step_index: stepIndexRef.current,
          time_on_screen_ms: Date.now() - openedAtRef.current,
        })
        .build(),
    );
  };
  useEffect(
    () => () => {
      closeHeadlessOnUnmountRef.current();
      fireClosedRef.current();
    },
    [],
  );

  const sharedHeader = (
    <HeaderStandard
      onClose={handleClosePress}
      closeButtonProps={{
        testID: CHECKOUT_TEST_IDS.CLOSE_BUTTON,
      }}
      style={styles.headerWithoutPadding}
    />
  );

  if (error) {
    return (
      <BottomSheet
        ref={sheetRef}
        goBack={navigation.goBack}
        isFullscreen
        keyboardAvoidingViewEnabled={false}
      >
        {sharedHeader}
        <ScreenLayout>
          <ScreenLayout.Body>
            <ErrorView
              description={error}
              ctaOnPress={() => {
                setKey((prevKey) => prevKey + 1);
                setError('');
                isRedirectionHandledRef.current = false;
                lastLoadCompleteUrlRef.current = null;
                loadUrlErrorsRef.current.clear();
                loadStartTimeRef.current = null;
                closeSourceRef.current = null;
                urlHistoryRef.current = { current: null, previous: null };
                stepIndexRef.current = 0;
                previousNavStateUrlRef.current = null;
              }}
              location="Provider Webview"
            />
          </ScreenLayout.Body>
        </ScreenLayout>
      </BottomSheet>
    );
  }

  if (uri) {
    return (
      <BottomSheet
        ref={sheetRef}
        goBack={navigation.goBack}
        isFullscreen
        isInteractable={!Device.isAndroid()}
        keyboardAvoidingViewEnabled={false}
        twClassName={providerBgTwClassName}
      >
        {sharedHeader}
        <WebView
          key={key}
          style={styles.webview}
          source={{ uri }}
          userAgent={userAgent ?? undefined}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            const errorUrl = nativeEvent.url;
            const isInitialUrl = errorUrl === initialUriRef.current;
            const isTerminal =
              isInitialUrl || errorUrl.startsWith(callbackBaseUrl);

            loadUrlErrorsRef.current.add(errorUrl);
            trackEvent(
              createEventBuilder(
                MetaMetricsEvents.RAMPS_CHECKOUT_HTTP_ERROR_RECEIVED,
              )
                .addProperties({
                  ...buildBaseProps({
                    checkoutSessionId,
                    providerName,
                    ...headlessBaseOverrides,
                  }),
                  url_path: redactUrlForAnalytics(errorUrl),
                  status_code: nativeEvent.statusCode,
                  is_initial_url: isInitialUrl,
                  error_message: strings(
                    'fiat_on_ramp_aggregator.webview_received_error',
                    { code: nativeEvent.statusCode },
                  ),
                })
                .build(),
            );

            if (isTerminal) {
              closeSourceRef.current = 'http_error';
              const webviewHttpError = strings(
                'fiat_on_ramp_aggregator.webview_received_error',
                { code: nativeEvent.statusCode },
              );
              if (failHeadlessCheckout(new Error(webviewHttpError))) {
                return;
              }
              setError(webviewHttpError);
            } else {
              Logger.log(
                `Checkout: HTTP error ${nativeEvent.statusCode} for auxiliary resource: ${errorUrl}`,
              );
            }
          }}
          allowsInlineMediaPlayback
          enableApplePay
          paymentRequestEnabled
          mediaPlaybackRequiresUserAction={false}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={
            hasCallbackFlow
              ? handleNavigationStateChange
              : handleNavigationStateChangeWithDedup
          }
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          testID={CHECKOUT_TEST_IDS.WEBVIEW}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      isFullscreen
      keyboardAvoidingViewEnabled={false}
    >
      {sharedHeader}
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={strings(
              'fiat_on_ramp_aggregator.webview_no_url_provided',
            )}
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
};

export default Checkout;
