import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { parseUrl } from 'query-string';
import { WebView, WebViewNavigation } from '@metamask/react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { RampsOrder } from '@metamask/ramps-controller';
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
  /** V2: fiat currency code (e.g., "USD"). */
  currency?: string;
  /** V2: crypto currency symbol (e.g., "ETH"). */
  cryptocurrency?: string;
}

export const createCheckoutNavDetails = createNavigationDetails<CheckoutParams>(
  Routes.RAMP.CHECKOUT,
);

/**
 * Creates the initial FiatOrder for a V2 order.
 * Uses deposit-style ID format (/providers/{code}/orders/{id}) so that
 * extractProviderAndOrderCode in the unified processor can parse it on
 * subsequent polls without relying on data.provider.
 */
function createInitialFiatOrder(params: {
  providerCode: string;
  orderId: string;
  walletAddress: string;
  network: string;
  currency: string;
  cryptocurrency: string;
  rampsOrder?: RampsOrder;
}): FiatOrder {
  const {
    providerCode,
    orderId,
    walletAddress,
    network,
    currency,
    cryptocurrency,
    rampsOrder,
  } = params;

  const id = `/providers/${providerCode}/orders/${orderId}`;

  return {
    id,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: rampsOrder?.createdAt ?? Date.now(),
    amount: rampsOrder?.fiatAmount ?? 0,
    fee: rampsOrder?.totalFeesFiat ?? 0,
    cryptoAmount: rampsOrder?.cryptoAmount ?? 0,
    cryptoFee: 0,
    currency: rampsOrder?.fiatCurrency ?? currency,
    currencySymbol: '',
    cryptocurrency,
    network,
    state: FIAT_ORDER_STATES.PENDING,
    account: walletAddress,
    txHash: rampsOrder?.txHash,
    excludeFromPurchases: rampsOrder?.excludeFromPurchases ?? false,
    orderType: (rampsOrder?.orderType ?? 'buy') as FiatOrder['orderType'],
    errorCount: 0,
    lastTimeFetched: Date.now(),
    data: {
      _v2Order: rampsOrder ?? null,
      provider: providerCode,
      pollingSecondsMinimum: rampsOrder?.pollingSecondsMinimum,
    } as unknown as FiatOrder['data'],
  };
}

const Checkout = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();
  const [error, setError] = useState('');
  const [customIdData, setCustomIdData] = useState<CustomIdData>();
  const [isRedirectionHandled, setIsRedirectionHandled] = useState(false);
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
        isRedirectionHandled ||
        !navState.url.startsWith(callbackBaseUrl) ||
        navState.loading !== false
      ) {
        return;
      }
      setIsRedirectionHandled(true);

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
          throw new Error(
            `Order could not be retrieved. Callback was ${navState.url}`,
          );
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
          orderId,
          walletAddress,
          network: network ?? '',
          currency: currency ?? '',
          cryptocurrency: cryptocurrency ?? '',
          rampsOrder,
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
      isRedirectionHandled,
      customOrderId,
      customIdData,
      providerCode,
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

  if (error) {
    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack
        isFullscreen
        keyboardAvoidingViewEnabled={false}
      >
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
        <ScreenLayout>
          <ScreenLayout.Body>
            <ErrorView
              description={error}
              ctaOnPress={() => {
                setKey((prevKey) => prevKey + 1);
                setError('');
                setIsRedirectionHandled(false);
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
            hasCallbackFlow ? handleNavigationStateChange : undefined
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
