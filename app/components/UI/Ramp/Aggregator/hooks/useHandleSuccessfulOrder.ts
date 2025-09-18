import { Order } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { protectWalletModalVisible } from '../../../../../actions/user';
import NotificationManager from '../../../../../core/NotificationManager';
import { addFiatOrder, FiatOrder } from '../../../../../reducers/fiatOrders';

import useThunkDispatch from '../../../../hooks/useThunkDispatch';
import { getNotificationDetails } from '../utils';
import stateHasOrder from '../../utils/stateHasOrder';
import useAnalytics from '../../hooks/useAnalytics';
import Routes from '../../../../../constants/navigation/Routes';

function useHandleSuccessfulOrder() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();
  const trackEvent = useAnalytics();

  const handleDispatchUserWalletProtection = useCallback(() => {
    dispatch(protectWalletModalVisible());
  }, [dispatch]);

  const handleSuccessfulOrder = useCallback(
    async (
      order: FiatOrder,
      params?: {
        isApplePay?: boolean;
      },
    ) => {
      handleDispatchUserWalletProtection();
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

        const payload = {
          payment_method_id: (order?.data as Order)?.paymentMethod?.id,
          order_type: order?.orderType,
          is_apple_pay: Boolean(params?.isApplePay),
        };

        if (order.orderType === OrderOrderTypeEnum.Sell) {
          trackEvent('OFFRAMP_PURCHASE_SUBMITTED', {
            ...payload,
            provider_offramp: (order?.data as Order)?.provider?.name,
            chain_id_source: (order?.data as Order)?.cryptoCurrency?.network
              ?.chainId,
            currency_source: (order?.data as Order)?.cryptoCurrency?.symbol,
            currency_destination: (order?.data as Order)?.fiatCurrency?.symbol,
          });
          navigation.navigate(Routes.TRANSACTIONS_VIEW, {
            screen: Routes.RAMP.ORDER_DETAILS,
            initial: false,
            params: {
              orderId: order.id,
              redirectToSendTransaction: true,
            },
          });
        } else {
          trackEvent('ONRAMP_PURCHASE_SUBMITTED', {
            ...payload,
            provider_onramp: (order?.data as Order)?.provider?.name,
            chain_id_destination: (order?.data as Order)?.cryptoCurrency
              ?.network?.chainId,
            has_zero_currency_destination_balance: false,
            has_zero_native_balance: true, // TODO: Replace with actual balance check
            currency_source: (order?.data as Order)?.fiatCurrency?.symbol,
            currency_destination: (order?.data as Order)?.cryptoCurrency
              ?.symbol,
          });
        }
      });
    },
    [dispatchThunk, handleDispatchUserWalletProtection, navigation, trackEvent],
  );

  return handleSuccessfulOrder;
}

export default useHandleSuccessfulOrder;
