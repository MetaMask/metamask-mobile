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
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import ErrorView from '../../Aggregator/components/ErrorView';
import Routes from '../../../../../constants/navigation/Routes';
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
  /** The provider widget URL to display in the WebView. */
  url: string;
  /** Provider code extracted from the quote (e.g., "moonpay", "transak"). */
  providerCode: string;
  /** Provider display name for navbar and analytics. */
  providerName: string;
  /**
   * Pre-order/custom order ID from BuyWidget (optional).
   * Like the aggregator's customOrderId: a tracking ID created at widget
   * generation time. NOT the final order ID -- that comes from the callback.
   */
  customOrderId?: string | null;
  /** The wallet address for this order. */
  walletAddress: string;
  /** Network chain ID for the order. */
  network: string;
  /** Fiat currency code (e.g., "USD"). */
  currency: string;
  /** Crypto currency symbol (e.g., "ETH"). */
  cryptocurrency: string;
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

const UnifiedCheckout = () => {
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
  } = params;

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: providerName },
        theme,
        () => {
          // Cancel analytics could go here
        },
      ),
    );
  }, [navigation, theme, providerName]);

  // Custom order ID tracking (matches aggregator pattern).
  // If BuyWidget returned an orderId, store it as CustomIdData so the
  // background polling loop can track it as a backup.
  useEffect(() => {
    if (!customOrderId || !walletAddress || !network) {
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
  }, [customOrderId, walletAddress, network, dispatch]);

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
          // No query params -- user likely cancelled in the widget.
          // @ts-expect-error navigation prop mismatch
          navigation.dangerouslyGetParent()?.pop();
          return;
        }

        if (!walletAddress) {
          throw new Error('No wallet address available');
        }

        // Get the order from the callback URL via the V2 backend.
        // This mirrors the aggregator's SDK.orders().getOrderFromCallback():
        // 1. Sends the callback URL to the backend for provider-specific parsing
        // 2. Backend extracts the order ID using provider logic
        // 3. Fetches and returns the full order
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

        // Remove custom order ID tracking if it existed (like aggregator does).
        if (customIdData) {
          dispatch(removeFiatCustomIdData(customIdData));
        }

        // Use the providerOrderId from the V2 response as the canonical order ID.
        const orderId =
          rampsOrder.providerOrderId || rampsOrder.id || customOrderId;
        if (!orderId) {
          throw new Error('Order response did not contain an order ID');
        }

        const fiatOrder = createInitialFiatOrder({
          providerCode,
          orderId,
          walletAddress,
          network,
          currency,
          cryptocurrency,
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

  const handleShouldStartLoadWithRequest = useCallback(
    ({ url }: { url: string }) => shouldStartLoadWithRequest(url, Logger),
    [],
  );

  const handleClosePress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

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
        />
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
        />
        <WebView
          key={key}
          style={styles.webview}
          source={{ uri }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (
              nativeEvent.url === uri ||
              nativeEvent.url.startsWith(callbackBaseUrl)
            ) {
              setError(
                `Provider returned an error (HTTP ${nativeEvent.statusCode})`,
              );
            }
          }}
          allowsInlineMediaPlayback
          enableApplePay
          paymentRequestEnabled
          mediaPlaybackRequiresUserAction={false}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          testID="unified-checkout-webview"
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
      />
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description="No widget URL was provided."
            location="Provider Webview"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
};

export default UnifiedCheckout;
