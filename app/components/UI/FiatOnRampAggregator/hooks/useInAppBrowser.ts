import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { OrderStatusEnum, Provider } from '@consensys/on-ramp-sdk';
import BuyAction from '@consensys/on-ramp-sdk/dist/regions/BuyAction';
import useAnalytics from './useAnalytics';
import { callbackBaseDeeplink, SDK, useFiatOnRampSDK } from '../sdk';
import { createCustomOrderIdData } from '../orderProcessor/customOrderId';
import { aggregatorOrderToFiatOrder } from '../orderProcessor/aggregator';
import {
  addFiatCustomIdData,
  FiatOrder,
  removeFiatCustomIdData,
} from '../../../../reducers/fiatOrders';
import { setLockTime } from '../../../../actions/settings';
import Logger from '../../../../util/Logger';
import useHandleSuccessfulOrder from './useHandleSuccessfulOrder';

export default function useInAppBrowser() {
  const {
    selectedAddress,
    selectedPaymentMethodId,
    selectedAsset,
    selectedChainId,
  } = useFiatOnRampSDK();

  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const lockTime = useSelector((state: any) => state.settings.lockTime);
  const handleSuccessfulOrder = useHandleSuccessfulOrder();

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

          if (result.type !== 'success' || !result.url) {
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

          const orders = await SDK.orders();
          const order = await orders.getOrderFromCallback(
            provider.id,
            result.url,
            selectedAddress,
          );

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

          const transformedOrder: FiatOrder = {
            ...aggregatorOrderToFiatOrder(order),
            account: selectedAddress,
            network: selectedChainId,
          };

          handleSuccessfulOrder(transformedOrder);
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
