import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useNavigation } from '@react-navigation/native';
import { Order, OrderStatusEnum, Provider } from '@consensys/on-ramp-sdk';
import BuyAction from '@consensys/on-ramp-sdk/dist/regions/BuyAction';
import useAnalytics from './useAnalytics';
import { callbackBaseDeeplink, SDK, useFiatOnRampSDK } from '../sdk';
import { createCustomOrderIdData } from '../orderProcessor/customOrderId';
import { aggregatorOrderToFiatOrder } from '../orderProcessor/aggregator';
import {
  addFiatCustomIdData,
  addFiatOrder,
  FiatOrder,
  removeFiatCustomIdData,
} from '../../../../reducers/fiatOrders';
import { setLockTime } from '../../../../actions/settings';
import { getNotificationDetails } from '..';
import { protectWalletModalVisible } from '../../../../actions/user';
import NotificationManager from '../../../../core/NotificationManager';
import { hexToBN } from '../../../../util/number';
import Logger from '../../../../util/Logger';

export default function useInAppBrowser() {
  const {
    selectedAddress,
    selectedPaymentMethodId,
    selectedAsset,
    selectedChainId,
  } = useFiatOnRampSDK();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const lockTime = useSelector((state: any) => state.settings.lockTime);
  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const handleSuccessfulOrder = useCallback(
    (order: Order, orderId: string) => {
      const transformedOrder: FiatOrder = {
        ...aggregatorOrderToFiatOrder(order),
        id: orderId,
        account: selectedAddress,
        network: selectedChainId,
      };

      // add the order to the redux global store
      dispatch(addFiatOrder(transformedOrder));

      // prompt user to protect his/her wallet
      dispatch(protectWalletModalVisible());
      // close the checkout webview
      // @ts-expect-error navigation prop mismatch
      navigation.dangerouslyGetParent()?.pop();
      NotificationManager.showSimpleNotification(
        getNotificationDetails(transformedOrder as any),
      );
      trackEvent('ONRAMP_PURCHASE_SUBMITTED', {
        provider_onramp: ((transformedOrder as FiatOrder)?.data as Order)
          ?.provider?.name,
        payment_method_id: ((transformedOrder as FiatOrder)?.data as Order)
          ?.paymentMethod?.id,
        currency_source: ((transformedOrder as FiatOrder)?.data as Order)
          ?.fiatCurrency.symbol,
        currency_destination: ((transformedOrder as FiatOrder)?.data as Order)
          ?.cryptoCurrency.symbol,
        chain_id_destination: selectedChainId,
        is_apple_pay: false,
        order_type: (transformedOrder as FiatOrder)?.orderType,
        has_zero_native_balance: accounts[selectedAddress]?.balance
          ? (hexToBN(accounts[selectedAddress].balance) as any)?.isZero?.()
          : undefined,
      });
    },
    [
      accounts,
      dispatch,
      navigation,
      selectedAddress,
      selectedChainId,
      trackEvent,
    ],
  );

  const renderInAppBrowser = useCallback(
    async (
      buyAction: BuyAction,
      provider: Provider,
      amount?: number,
      fiatSymbol?: string,
    ) => {
      const deeplinkRedirectUrl = `${callbackBaseDeeplink}on-ramp${provider.id}`;
      const { url, orderId: customOrderId } = await buyAction.createWidget(
        deeplinkRedirectUrl,
      );

      let customIdData;

      if (customOrderId) {
        customIdData = createCustomOrderIdData(
          customOrderId,
          selectedChainId,
          selectedAddress,
        );
        dispatch(addFiatCustomIdData(customIdData));
      }

      if (!(await InAppBrowser.isAvailable())) {
        Linking.openURL(url);
      } else {
        const prevLockTime = lockTime;
        try {
          dispatch(setLockTime(-1));
          const result = await InAppBrowser.openAuth(url, deeplinkRedirectUrl);
          let orderId;
          let orders;

          if (result.type === 'success' && result.url) {
            orders = await SDK.orders();
            orderId = await orders.getOrderIdFromCallback(
              provider.id,
              result.url,
            );
          } else {
            trackEvent('ONRAMP_PURCHASE_CANCELLED', {
              amount: amount as number,
              chain_id_destination: selectedChainId,
              currency_destination: selectedAsset?.symbol as string,
              currency_source: fiatSymbol as string,
              payment_method_id: selectedPaymentMethodId as string,
              provider_onramp: provider.name,
            });

            return;
          }

          if (!orderId) {
            return;
          }

          const order = await orders.getOrder(orderId, selectedAddress);

          if (!order) return;

          // If the order is unknown, we don't remove it from custom order ids
          // (or we add it if customOrderId option is not active for the provider)
          // and also we don't add it to the orders.
          if (order.status === OrderStatusEnum.Unknown) {
            return;
          }
          if (customIdData) {
            dispatch(removeFiatCustomIdData(customIdData));
          }

          if (
            order.status === OrderStatusEnum.Precreated ||
            order.status === OrderStatusEnum.IdExpired
          ) {
            return;
          }

          handleSuccessfulOrder(order, orderId);
        } catch (error) {
          Logger.error(error as Error, {
            message:
              'FiatOrders::CustomActionButton error while using custom action browser',
          });
        } finally {
          InAppBrowser.closeAuth();
          dispatch(setLockTime(prevLockTime));
        }
      }
    },
    [
      dispatch,
      handleSuccessfulOrder,
      lockTime,
      selectedAddress,
      selectedAsset?.symbol,
      selectedChainId,
      selectedPaymentMethodId,
      trackEvent,
    ],
  );

  return renderInAppBrowser;
}
