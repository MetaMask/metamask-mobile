import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { parseUrl } from 'query-string';
import { v4 as uuidv4 } from 'uuid';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { callbackBaseUrl } from '../../Aggregator/sdk';
import { getRampRoutingDecision } from '../../../../../reducers/fiatOrders';
import { normalizeProviderCode } from '@metamask/ramps-controller';
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
  BottomSheet,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import useRampsUnifiedV2Enabled from '../../hooks/useRampsUnifiedV2Enabled';
import { showV2OrderToast } from '../../utils/v2OrderToast';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './Checkout.styles';
import Device from '../../../../../util/device';
import { shouldStartLoadWithRequest } from '../../../../../util/browser';
import { CHECKOUT_TEST_IDS } from './Checkout.testIds';
import { redactUrlForAnalytics } from '../../utils/redactUrlForAnalytics';
import {
  buildBaseProps,
  extractHostname,
  type CloseSource,
} from '../../utils/webviewFunnelAnalytics';

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
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.RAMP.CHECKOUT,
);

const Checkout = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const isRedirectionHandledRef = useRef(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<CheckoutParams>();
  const { styles } = useStyles(styleSheet, {});
  const { addOrder, addPrecreatedOrder, getOrderFromCallback } =
    useRampsOrders();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const isV2Enabled = useRampsUnifiedV2Enabled();

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
  } = params ?? {};
  const effectiveOrderId = (orderIdParam ?? customOrderId)?.trim() || null;

  const initialUriRef = useRef(uri);
  const registeredOrderIdsRef = useRef<Set<string>>(new Set());
  const hasCallbackFlow = Boolean(providerCode && walletAddress);

  const flowId = useMemo(
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
  const loadStartTimeRef = useRef<number | null>(null);
  const loadUrlErrorsRef = useRef<Set<string>>(new Set());
  const lastLoadCompleteUrlRef = useRef<string | null>(null);

  const hasTrackedScreenViewRef = useRef(false);
  useEffect(() => {
    if (uri && !hasTrackedScreenViewRef.current) {
      hasTrackedScreenViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
          .addProperties({
            location: 'Checkout',
            ramp_type: 'UNIFIED_BUY_2',
            ramp_routing: rampRoutingDecision ?? undefined,
          })
          .build(),
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_OPENED)
          .addProperties({
            ...buildBaseProps({
              flowId,
              providerName,
              rampRouting: rampRoutingDecision,
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
    rampRoutingDecision,
    flowId,
    providerName,
    hasCallbackFlow,
    effectiveOrderId,
  ]);

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
      providerCode: normalizeProviderCode(providerCode),
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
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_URL_CHANGE)
          .addProperties({
            ...buildBaseProps({
              flowId,
              providerName,
              rampRouting: rampRoutingDecision,
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
      flowId,
      providerName,
      rampRoutingDecision,
      effectiveOrderId,
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
              flowId,
              providerName,
              rampRouting: rampRoutingDecision,
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
          // @ts-expect-error navigation prop mismatch
          navigation.getParent()?.pop();
          return;
        }

        if (!walletAddress || !providerCode) {
          throw new Error('No wallet address or provider code available');
        }

        const rampsOrder = await getOrderFromCallback(
          providerCode,
          navState.url,
          walletAddress,
        );

        if (!rampsOrder) {
          throw new Error('Order could not be retrieved from callback');
        }

        addOrder(rampsOrder);
        dispatch(protectWalletModalVisible());

        if (isV2Enabled) {
          showV2OrderToast({
            orderId: rampsOrder.providerOrderId,
            cryptocurrency:
              rampsOrder.cryptoCurrency?.symbol ?? params?.cryptocurrency ?? '',
            cryptoAmount: rampsOrder.cryptoAmount,
            status: rampsOrder.status,
          });
        }

        closeSourceRef.current = 'callback_success';

        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: {
                orderId: rampsOrder.providerOrderId,
                showCloseButton: true,
              },
            },
          ],
        });
      } catch (navError) {
        closeSourceRef.current = 'callback_error';
        Logger.error(navError as Error, {
          message: 'UnifiedCheckout: error handling callback',
        });
        setError((navError as Error)?.message);
      }
    },
    [
      dispatch,
      hasCallbackFlow,
      providerCode,
      walletAddress,
      navigation,
      addOrder,
      getOrderFromCallback,
      isV2Enabled,
      params?.cryptocurrency,
      recordUrlChange,
      createEventBuilder,
      trackEvent,
      flowId,
      providerName,
      rampRoutingDecision,
      effectiveOrderId,
    ],
  );

  const handleCancelPress = useCallback(() => {
    closeSourceRef.current = 'user_close_button';
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CLOSE_BUTTON_CLICKED)
        .addProperties({
          location: 'Checkout',
          ramp_type: 'UNIFIED_BUY_2',
          ramp_routing: rampRoutingDecision ?? undefined,
        })
        .build(),
    );
  }, [createEventBuilder, trackEvent, rampRoutingDecision]);
  const handleClosePress = useCallback(() => {
    handleCancelPress();
    sheetRef.current?.onCloseBottomSheet();
  }, [handleCancelPress]);

  const handleNavigationStateChangeWithDedup = useCallback(
    (navState: { url: string }) => {
      const isNewUrl = recordUrlChange(navState.url);
      if (isNewUrl) {
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
      const loadSuccess = !loadUrlErrorsRef.current.has(loadedUrl);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_LOAD_COMPLETE)
          .addProperties({
            ...buildBaseProps({
              flowId,
              providerName,
              rampRouting: rampRoutingDecision,
            }),
            url_path: redactedLoadedUrl,
            load_duration_ms: durationMs,
            load_success: loadSuccess,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent, flowId, providerName, rampRoutingDecision],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    ({ url }: { url: string }) => shouldStartLoadWithRequest(url, Logger),
    [],
  );

  const fireClosedRef = useRef<() => void>(() => {
    /* no-op until initialized */
  });
  fireClosedRef.current = () => {
    if (!hasTrackedScreenViewRef.current) return;
    const lastUrl = urlHistoryRef.current.current;
    const prevUrl = urlHistoryRef.current.previous;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_CLOSED)
        .addProperties({
          ...buildBaseProps({
            flowId,
            providerName,
            rampRouting: rampRoutingDecision,
          }),
          close_source: closeSourceRef.current ?? 'background',
          last_hostname: lastUrl ? extractHostname(lastUrl) : undefined,
          last_sanitized_path: lastUrl
            ? redactUrlForAnalytics(lastUrl)
            : undefined,
          previous_hostname: prevUrl ? extractHostname(prevUrl) : undefined,
          previous_sanitized_path: prevUrl
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
      fireClosedRef.current();
    },
    [],
  );

  const sharedHeader = (
    <HeaderCompactStandard
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
            const isTerminal =
              errorUrl === initialUriRef.current ||
              errorUrl.startsWith(callbackBaseUrl);

            loadUrlErrorsRef.current.add(errorUrl);
            trackEvent(
              createEventBuilder(MetaMetricsEvents.RAMPS_CHECKOUT_HTTP_ERROR)
                .addProperties({
                  ...buildBaseProps({
                    flowId,
                    providerName,
                    rampRouting: rampRoutingDecision,
                  }),
                  url_path: redactUrlForAnalytics(errorUrl),
                  status_code: nativeEvent.statusCode,
                  is_initial_url: isTerminal,
                })
                .build(),
            );

            if (isTerminal) {
              closeSourceRef.current = 'http_error';
              const webviewHttpError = strings(
                'fiat_on_ramp_aggregator.webview_received_error',
                { code: nativeEvent.statusCode },
              );
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
