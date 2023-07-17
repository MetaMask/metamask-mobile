import { CryptoCurrency, Order } from '@consensys/on-ramp-sdk';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getNotificationDetails } from '..';
import { protectWalletModalVisible } from '../../../../actions/user';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import Engine from '../../../../core/Engine';
import NotificationManager from '../../../../core/NotificationManager';
import { addFiatOrder, FiatOrder } from '../../../../reducers/fiatOrders';
import { toLowerCaseEquals } from '../../../../util/general';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { useFiatOnRampSDK } from '../sdk';
import { stateHasOrder } from '../utils';
import useAnalytics from './useAnalytics';
import { hexToBN } from '../../../../util/number';
import { selectAccounts } from '../../../../selectors/accountTrackerController';

function useHandleSuccessfulOrder() {
  const { selectedChainId, selectedAddress } = useFiatOnRampSDK();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const dispatchThunk = useThunkDispatch();
  const trackEvent = useAnalytics();
  const accounts = useSelector(selectAccounts);

  const addTokenToTokensController = useCallback(
    async (token: CryptoCurrency) => {
      if (!token) return;

      const { address, symbol, decimals, network, name } = token;
      const chainId = network?.chainId;

      if (
        Number(chainId) !== Number(selectedChainId) ||
        address === NATIVE_ADDRESS
      ) {
        return;
      }

      const { TokensController } = Engine.context;

      if (
        !TokensController.state.tokens.includes((t: any) =>
          toLowerCaseEquals(t.address, address),
        )
      ) {
        await TokensController.addToken(address, symbol, decimals, null, name);
      }
    },
    [selectedChainId],
  );

  const handleDispatchUserWalletProtection = useCallback(() => {
    dispatch(protectWalletModalVisible());
  }, [dispatch]);

  const handleAddFiatOrder = useCallback(
    (order) => {
      dispatch(addFiatOrder(order));
    },
    [dispatch],
  );

  const handleSuccessfulOrder = useCallback(
    async (
      order: FiatOrder,
      params?: {
        isApplePay?: boolean;
      },
    ) => {
      await addTokenToTokensController((order as any)?.data?.cryptoCurrency);
      handleDispatchUserWalletProtection();
      // @ts-expect-error navigation prop mismatch
      navigation.dangerouslyGetParent()?.pop();

      dispatchThunk((_, getState) => {
        const state = getState();
        if (stateHasOrder(state, order)) {
          return;
        }
        handleAddFiatOrder(order);
        NotificationManager.showSimpleNotification(
          getNotificationDetails(order as any),
        );
        trackEvent('ONRAMP_PURCHASE_SUBMITTED', {
          provider_onramp: (order?.data as Order)?.provider?.name,
          payment_method_id: (order?.data as Order)?.paymentMethod?.id,
          currency_source: (order?.data as Order)?.fiatCurrency.symbol,
          currency_destination: (order?.data as Order)?.cryptoCurrency.symbol,
          chain_id_destination: selectedChainId,
          order_type: order?.orderType,
          is_apple_pay: Boolean(params?.isApplePay),
          has_zero_native_balance: accounts[selectedAddress]?.balance
            ? (hexToBN(accounts[selectedAddress].balance) as any)?.isZero?.()
            : undefined,
        });
      });
    },
    [
      accounts,
      addTokenToTokensController,
      dispatchThunk,
      handleAddFiatOrder,
      handleDispatchUserWalletProtection,
      navigation,
      selectedAddress,
      selectedChainId,
      trackEvent,
    ],
  );

  return handleSuccessfulOrder;
}

export default useHandleSuccessfulOrder;
