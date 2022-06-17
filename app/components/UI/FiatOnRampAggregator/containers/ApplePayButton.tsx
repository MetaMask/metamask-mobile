import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Order, QuoteResponse } from '@consensys/on-ramp-sdk';
import { protectWalletModalNotVisible } from '../../../../actions/user';
import { addFiatOrder } from '../../../../reducers/fiatOrders';
import ApplePayButtonComponent from '../components/ApplePayButton';
import useApplePay, { ABORTED } from '../hooks/applePay';
import useAnalytics from '../hooks/useAnalytics';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { setLockTime } from '../../../../actions/settings';
import { aggregatorOrderToFiatOrder } from '../orderProcessor/aggregator';
import { FiatOrder, getNotificationDetails } from '../../FiatOrders';
import NotificationManager from '../../../../core/NotificationManager';
import { hexToBN } from '../../../../util/number';

const ApplePayButton = ({
  quote,
  label,
}: {
  quote: QuoteResponse;
  label: string;
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const trackEvent = useAnalytics();
  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const chainId = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.provider.chainId,
  );
  const [pay] = useApplePay(quote) as [() => Promise<Order | typeof ABORTED>];
  const lockTime = useSelector((state: any) => state.settings.lockTime);

  const addOrder = useCallback(
    (order) => dispatch(addFiatOrder(order)),
    [dispatch],
  );
  const protectWalletModalVisible = useCallback(
    () => dispatch(protectWalletModalNotVisible()),
    [dispatch],
  );

  const handlePress = useCallback(async () => {
    const prevLockTime = lockTime;
    setLockTime(-1);
    try {
      const order = await pay();
      if (order !== ABORTED) {
        if (order) {
          const fiatOrder: FiatOrder = {
            ...aggregatorOrderToFiatOrder(order),
            network: chainId,
            account: selectedAddress,
          };
          addOrder(fiatOrder);
          // @ts-expect-error pop is not defined
          navigation.dangerouslyGetParent()?.pop();
          protectWalletModalVisible();
          NotificationManager.showSimpleNotification(
            getNotificationDetails(fiatOrder),
          );
          trackEvent('ONRAMP_PURCHASE_SUBMITTED', {
            provider_onramp: (fiatOrder?.data as Order)?.provider?.name,
            chain_id_destination: chainId,
            is_apple_pay: true,
            has_zero_native_balance: accounts[selectedAddress]?.balance
              ? (hexToBN(accounts[selectedAddress].balance) as any)?.isZero?.()
              : undefined,
          });
        } else {
          Logger.error('FiatOnRampAgg::ApplePay empty order response', order);
        }
      }
    } catch (error: any) {
      NotificationManager.showSimpleNotification({
        duration: 5000,
        title: strings('fiat_on_ramp.notifications.purchase_failed_title', {
          currency: quote.crypto?.symbol,
        }),
        description: error.message,
        status: 'error',
      });
      Logger.error(error, 'FiatOrders::WyreApplePayProcessor Error');
    } finally {
      setLockTime(prevLockTime);
    }
  }, [
    accounts,
    addOrder,
    lockTime,
    navigation,
    chainId,
    pay,
    protectWalletModalVisible,
    quote.crypto?.symbol,
    selectedAddress,
    trackEvent,
  ]);

  return <ApplePayButtonComponent label={label} onPress={handlePress} />;
};

export default ApplePayButton;
