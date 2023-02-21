import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Order, QuoteResponse } from '@consensys/on-ramp-sdk';
import { protectWalletModalNotVisible } from '../../../../actions/user';
import {
  addAuthenticationUrl,
  addFiatOrder,
  FiatOrder,
} from '../../../../reducers/fiatOrders';
import ApplePayButtonComponent from '../components/ApplePayButton';
import useApplePay, { ABORTED } from '../hooks/useApplePay';
import useAnalytics from '../hooks/useAnalytics';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { setLockTime } from '../../../../actions/settings';
import { aggregatorOrderToFiatOrder } from '../orderProcessor/aggregator';
import { getNotificationDetails } from '..';
import NotificationManager from '../../../../core/NotificationManager';
import { hexToBN } from '../../../../util/number';
import { useFiatOnRampSDK } from '../sdk';

function buildAuthenticationUrl(url: string, redirectUrl: string) {
  const urlObject = new URL(url);
  const searchParams = urlObject.searchParams;
  searchParams.set('autoRedirect', 'true');
  searchParams.set('redirectUrl', redirectUrl);
  searchParams.set('failureRedirectUrl', redirectUrl);
  return urlObject.toString();
}

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
  const { selectedAddress, selectedChainId, callbackBaseUrl } =
    useFiatOnRampSDK();
  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const [pay] = useApplePay(quote);
  const lockTime = useSelector((state: any) => state.settings.lockTime);

  const addOrder = useCallback(
    (order) => dispatch(addFiatOrder(order)),
    [dispatch],
  );
  const protectWalletModalVisible = useCallback(
    () => dispatch(protectWalletModalNotVisible()),
    [dispatch],
  );

  const handleSuccessfulOrder = useCallback(
    (order) => {
      const fiatOrder: FiatOrder = {
        ...aggregatorOrderToFiatOrder(order),
        network: selectedChainId,
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
        payment_method_id: (fiatOrder?.data as Order)?.paymentMethod?.id,
        currency_source: (fiatOrder?.data as Order)?.fiatCurrency.symbol,
        currency_destination: (fiatOrder?.data as Order)?.cryptoCurrency.symbol,
        chain_id_destination: selectedChainId,
        is_apple_pay: true,
        order_type: fiatOrder.orderType,
        has_zero_native_balance: accounts[selectedAddress]?.balance
          ? (hexToBN(accounts[selectedAddress].balance) as any)?.isZero?.()
          : undefined,
      });
    },
    [
      accounts,
      addOrder,
      selectedChainId,
      navigation,
      protectWalletModalVisible,
      selectedAddress,
      trackEvent,
    ],
  );

  const handlePress = useCallback(async () => {
    const prevLockTime = lockTime;
    dispatch(setLockTime(-1));
    try {
      const paymentResult = await pay();
      if (paymentResult !== ABORTED) {
        if (paymentResult.authenticationUrl) {
          const authenticationUrl = buildAuthenticationUrl(
            paymentResult.authenticationUrl,
            callbackBaseUrl,
          );
          dispatch(addAuthenticationUrl(authenticationUrl));
        }

        handleSuccessfulOrder(paymentResult.order);
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
      dispatch(setLockTime(prevLockTime));
    }
  }, [
    lockTime,
    dispatch,
    pay,
    callbackBaseUrl,
    handleSuccessfulOrder,
    quote.crypto?.symbol,
  ]);

  return <ApplePayButtonComponent label={label} onPress={handlePress} />;
};

export default ApplePayButton;
