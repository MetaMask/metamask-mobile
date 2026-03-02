import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { parseUrl } from 'query-string';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import { getDepositNavbarOptions } from '../../../Navbar';
import { callbackBaseUrl } from '../../Aggregator/sdk';
import {
  addFiatCustomIdData,
  removeFiatCustomIdData,
  getRampRoutingDecision,
} from '../../../../../reducers/fiatOrders';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import { CustomIdData } from '../../../../../reducers/fiatOrders/types';
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
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import useRampsUnifiedV2Enabled from '../../hooks/useRampsUnifiedV2Enabled';
import { showV2OrderToast } from '../../utils/v2OrderToast';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './Checkout.styles';
import Device from '../../../../../util/device';
import { shouldStartLoadWithRequest } from '../../../../../util/browser';
import {
  getCheckoutCallback,
  removeCheckoutCallback,
} from '../../utils/checkoutCallbackRegistry';

interface CheckoutParams {
  url: string;
  providerName: string;
  /** Optional provider-specific userAgent for the WebView (e.g. features.buy.userAgent). */
  userAgent?: string;
  /** V2 callback flow: provider code (e.g., "moonpay", "transak"). */
  providerCode?: string;
  /** V2: pre-order/custom order ID from BuyWidget. */
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
  /**
   * Key into the checkout callback registry. Used by Transak/Deposit flows.
   * The actual callback lives outside navigation state so that route params stay serializable.
   */
  callbackKey?: string;
  /** Optional callback invoked on every navigation state change (e.g. to intercept redirect URLs). */
  onNavigationStateChange?: (navState: { url: string }) => void;
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.RAMP.CHECKOUT,
);

const Checkout = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const previousUrlRef = useRef<string | null>(null);
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const [customIdData, setCustomIdData] = useState<CustomIdData>();
  const isRedirectionHandledRef = useRef(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<CheckoutParams>();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { addOrder, getOrderFromCallback } = useRampsOrders();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const isV2Enabled = useRampsUnifiedV2Enabled();

  const {
    url: uri,
    providerCode,
    providerName,
    customOrderId,
    walletAddress,
    network,
    userAgent,
    onNavigationStateChange,
    callbackKey,
  } = params ?? {};

  const headerTitle = providerName ?? '';
  const initialUriRef = useRef(uri);
  const callbackKeyRef = useRef(callbackKey);
  const hasCallbackFlow = Boolean(providerCode && walletAddress);

  useEffect(() => {
    callbackKeyRef.current = callbackKey;
    return () => {
      if (callbackKey) {
        removeCheckoutCallback(callbackKey);
      }
    };
  }, [callbackKey]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: providerName ?? headerTitle },
        theme,
        () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
              .addProperties({
                location: 'Checkout',
                ramp_type: 'UNIFIED_BUY_2',
                ramp_routing: rampRoutingDecision ?? undefined,
              })
              .build(),
          );
        },
      ),
    );
  }, [
    navigation,
    theme,
    providerName,
    headerTitle,
    createEventBuilder,
    trackEvent,
    rampRoutingDecision,
  ]);

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
    }
  }, [uri, createEventBuilder, trackEvent, rampRoutingDecision]);

  useEffect(() => {
    if (!hasCallbackFlow || !customOrderId || !walletAddress || !network) {
      return;
    }
    const data: CustomIdData = {
      id: customOrderId,
      chainId: network,
      account: walletAddress,
      orderType: 'buy' as CustomIdData['orderType'],
      createdAt: Date.now(),
      lastTimeFetched: 0,
      errorCount: 0,
    };
    setCustomIdData(data);
    dispatch(addFiatCustomIdData(data));
  }, [customOrderId, walletAddress, network, dispatch, hasCallbackFlow]);

  const handleNavigationStateChange = useCallback(
    async (navState: WebViewNavigation) => {
      if (
        !hasCallbackFlow ||
        isRedirectionHandledRef.current ||
        !navState.url.startsWith(callbackBaseUrl) ||
        navState.loading !== false
      ) {
        return;
      }
      isRedirectionHandledRef.current = true;

      try {
        const parsedUrl = parseUrl(navState.url);
        if (Object.keys(parsedUrl.query).length === 0) {
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

        if (customIdData) {
          dispatch(removeFiatCustomIdData(customIdData));
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
        Logger.error(navError as Error, {
          message: 'UnifiedCheckout: error handling callback',
        });
        setError((navError as Error)?.message);
      }
    },
    [
      hasCallbackFlow,
      customIdData,
      providerCode,
      walletAddress,
      navigation,
      dispatch,
      addOrder,
      getOrderFromCallback,
      isV2Enabled,
      params?.cryptocurrency,
    ],
  );

  const handleCancelPress = useCallback(() => {
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
      if (navState.url !== previousUrlRef.current) {
        previousUrlRef.current = navState.url;
        if (callbackKeyRef.current) {
          getCheckoutCallback(callbackKeyRef.current)?.(navState);
        }
      }
    },
    [],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    ({ url }: { url: string }) => shouldStartLoadWithRequest(url, Logger),
    [],
  );

  const sharedHeader = (
    <BottomSheetHeader
      endAccessory={
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSizes.Lg}
          iconColor={IconColor.Default}
          testID="checkout-close-button"
          onPress={handleClosePress}
        />
      }
      style={styles.headerWithoutPadding}
    >
      {headerTitle}
    </BottomSheetHeader>
  );

  if (error) {
    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack
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
        shouldNavigateBack
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
            if (
              errorUrl === initialUriRef.current ||
              errorUrl.startsWith(callbackBaseUrl)
            ) {
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
          onNavigationStateChange={
            hasCallbackFlow
              ? handleNavigationStateChange
              : callbackKey
                ? handleNavigationStateChangeWithDedup
                : onNavigationStateChange
          }
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          testID="checkout-webview"
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
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
