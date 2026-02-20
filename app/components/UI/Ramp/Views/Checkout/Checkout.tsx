import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { parseUrl } from 'query-string';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { RampsOrder } from '@metamask/ramps-controller';
import { orderStatusToFiatOrderState } from '../../orderProcessor/unifiedOrderProcessor';
import { useTheme } from '../../../../../util/theme';
import { getDepositNavbarOptions } from '../../../Navbar';
import { callbackBaseUrl } from '../../Aggregator/sdk';
import {
  addFiatOrder,
  addFiatCustomIdData,
  removeFiatCustomIdData,
  FiatOrder,
} from '../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
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
import Engine from '../../../../../core/Engine';
import NotificationManager from '../../../../../core/NotificationManager';
import getNotificationDetails from '../../utils/getNotificationDetails';
import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import stateHasOrder from '../../utils/stateHasOrder';
import { protectWalletModalVisible } from '../../../../../actions/user';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
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
  /** Optional callback invoked on every navigation state change (e.g. to intercept redirect URLs). */
  onNavigationStateChange?: (navState: { url: string }) => void;
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.RAMP.CHECKOUT,
);

/**
 * Creates the initial FiatOrder for a V2 order immediately after the provider
 * callback is received.
 *
 * Uses deposit-style ID format (/providers/{code}/orders/{id}) so that
 * extractProviderAndOrderCode in the unified processor can parse it on
 * subsequent polls without relying on data.provider.
 *
 * The V2 API now returns a full provider object (with name and links) and a
 * full fiatCurrency object (with decimals and denomSymbol) in the order
 * response, so we derive everything we can from rampsOrder and use the nav
 * params only as fallbacks for when the order is still UNKNOWN.
 */
export function createInitialFiatOrder(params: {
  providerCode: string;
  providerName: string;
  orderId: string;
  walletAddress: string;
  network: string;
  currency: string;
  cryptocurrency: string;
  rampsOrder?: RampsOrder;
  providerType?: FIAT_ORDER_PROVIDERS;
}): FiatOrder {
  const {
    providerCode,
    providerName,
    orderId,
    walletAddress,
    network,
    currency,
    cryptocurrency,
    rampsOrder,
    providerType = FIAT_ORDER_PROVIDERS.RAMPS_V2,
  } = params;

  const id = `/providers/${providerCode}/orders/${orderId}`;

  // If we have a full RampsOrder, use it directly
  if (rampsOrder) {
    const orderState = orderStatusToFiatOrderState(rampsOrder.status);
    const isTerminalState =
      orderState === FIAT_ORDER_STATES.FAILED ||
      orderState === FIAT_ORDER_STATES.COMPLETED ||
      orderState === FIAT_ORDER_STATES.CANCELLED;

    return {
      id,
      provider: providerType,
      createdAt: rampsOrder.createdAt,
      amount: rampsOrder.fiatAmount,
      fee: rampsOrder.totalFeesFiat,
      cryptoAmount: rampsOrder.cryptoAmount || 0,
      cryptoFee: rampsOrder.totalFeesFiat || 0,
      currency: rampsOrder.fiatCurrency?.symbol || currency,
      currencySymbol: rampsOrder.fiatCurrency?.denomSymbol || '',
      cryptocurrency: rampsOrder.cryptoCurrency?.symbol || cryptocurrency,
      network: rampsOrder.network?.chainId || network,
      state: orderState,
      forceUpdate: !isTerminalState,
      account: walletAddress,
      txHash: rampsOrder.txHash,
      excludeFromPurchases: rampsOrder.excludeFromPurchases,
      orderType: rampsOrder.orderType as FiatOrder['orderType'],
      errorCount: 0,
      lastTimeFetched: isTerminalState ? Date.now() : 0,
      data: rampsOrder,
    };
  }

  // Fallback for when rampsOrder is not yet available (UNKNOWN status)
  return {
    id,
    provider: providerType,
    createdAt: Date.now(),
    amount: 0,
    fee: 0,
    cryptoAmount: 0,
    cryptoFee: 0,
    currency,
    currencySymbol: '',
    cryptocurrency,
    network,
    state: FIAT_ORDER_STATES.PENDING,
    forceUpdate: true,
    account: walletAddress,
    excludeFromPurchases: false,
    orderType: 'BUY' as FiatOrder['orderType'],
    errorCount: 0,
    lastTimeFetched: 0,
    data: {
      id,
      isOnlyLink: false,
      provider: {
        id: `/providers/${providerCode}`,
        name: providerName,
      },
      success: false,
      cryptoAmount: 0,
      fiatAmount: 0,
      providerOrderId: orderId,
      providerOrderLink: '',
      createdAt: Date.now(),
      totalFeesFiat: 0,
      txHash: '',
      walletAddress,
      status: 'PENDING',
      network: { chainId: network, name: '' },
      canBeUpdated: false,
      idHasExpired: false,
      excludeFromPurchases: false,
      timeDescriptionPending: '',
      orderType: 'BUY',
    } as RampsOrder,
  };
}

const Checkout = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();
  const [error, setError] = useState('');
  const [customIdData, setCustomIdData] = useState<CustomIdData>();
  const isRedirectionHandledRef = useRef(false);
  const [key, setKey] = useState(0);
  const navigation = useNavigation();
  const params = useParams<CheckoutParams>();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, {});

  const {
    url: uri,
    providerCode,
    providerName,
    customOrderId,
    walletAddress,
    network,
    currency,
    cryptocurrency,
    userAgent,
    providerType,
    onNavigationStateChange,
  } = params ?? {};

  const headerTitle = providerName ?? '';
  const initialUriRef = useRef(uri);
  const hasCallbackFlow = Boolean(providerCode && walletAddress);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: providerName ?? headerTitle },
        theme,
        () => {
          // Cancel analytics could go here
        },
      ),
    );
  }, [navigation, theme, providerName, headerTitle]);

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

  const handleOrderCreated = useCallback(
    (order: FiatOrder) => {
      dispatch(protectWalletModalVisible());
      // @ts-expect-error navigation prop mismatch
      navigation.dangerouslyGetParent()?.pop();

      dispatchThunk((_dispatch, getState) => {
        const state = getState();
        if (stateHasOrder(state, order)) {
          return;
        }
        _dispatch(addFiatOrder(order));
        const notificationDetails = getNotificationDetails(order);
        if (notificationDetails) {
          NotificationManager.showSimpleNotification(notificationDetails);
        }
      });
    },
    [dispatch, dispatchThunk, navigation],
  );

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
          navigation.dangerouslyGetParent()?.pop();
          return;
        }

        if (!walletAddress || !providerCode) {
          throw new Error('No wallet address or provider code available');
        }

        const rampsOrder =
          await Engine.context.RampsController.getOrderFromCallback(
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

        const orderId =
          rampsOrder.providerOrderId || rampsOrder.id || customOrderId;
        if (!orderId) {
          throw new Error('Order response did not contain an order ID');
        }

        const fiatOrder = createInitialFiatOrder({
          providerCode,
          providerName: providerName ?? providerCode,
          orderId,
          walletAddress,
          network: network ?? '',
          currency: currency ?? '',
          cryptocurrency: cryptocurrency ?? '',
          rampsOrder,
          providerType,
        });

        handleOrderCreated(fiatOrder);
      } catch (navError) {
        Logger.error(navError as Error, {
          message: 'UnifiedCheckout: error handling callback',
        });
        setError((navError as Error)?.message);
      }
    },
    [
      hasCallbackFlow,
      customOrderId,
      customIdData,
      providerCode,
      providerName,
      providerType,
      walletAddress,
      network,
      currency,
      cryptocurrency,
      navigation,
      dispatch,
      handleOrderCreated,
    ],
  );

  const handleCancelPress = useCallback(() => {
    // TODO: Add analytics tracking when analytics events are defined for unified flow
  }, []);
  const handleClosePress = useCallback(() => {
    handleCancelPress();
    sheetRef.current?.onCloseBottomSheet();
  }, [handleCancelPress]);

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
