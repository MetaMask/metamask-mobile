import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { QuoteResponse } from '@consensys/on-ramp-sdk';
import {
  addAuthenticationUrl,
  FiatOrder,
} from '../../../../reducers/fiatOrders';
import ApplePayButtonComponent from '../components/ApplePayButton';
import useApplePay, { ABORTED } from '../hooks/useApplePay';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { setLockTime } from '../../../../actions/settings';
import { aggregatorOrderToFiatOrder } from '../orderProcessor/aggregator';
import NotificationManager from '../../../../core/NotificationManager';
import { useFiatOnRampSDK } from '../sdk';
import useHandleSuccessfulOrder from '../hooks/useHandleSuccessfulOrder';

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
  const { selectedAddress, selectedChainId, callbackBaseUrl } =
    useFiatOnRampSDK();
  const dispatch = useDispatch();
  const [pay] = useApplePay(quote);
  const handleSuccessfulOrder = useHandleSuccessfulOrder();
  const lockTime = useSelector((state: any) => state.settings.lockTime);

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
        if (paymentResult.order) {
          const fiatOrder: FiatOrder = {
            ...aggregatorOrderToFiatOrder(paymentResult.order),
            network: selectedChainId,
            account: selectedAddress,
          };
          handleSuccessfulOrder(fiatOrder, { isApplePay: true });
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
      dispatch(setLockTime(prevLockTime));
    }
  }, [
    lockTime,
    dispatch,
    pay,
    callbackBaseUrl,
    selectedChainId,
    selectedAddress,
    handleSuccessfulOrder,
    quote.crypto?.symbol,
  ]);

  return <ApplePayButtonComponent label={label} onPress={handlePress} />;
};

export default ApplePayButton;
