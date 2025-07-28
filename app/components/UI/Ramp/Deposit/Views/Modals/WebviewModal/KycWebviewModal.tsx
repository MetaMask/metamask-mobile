import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';

import WebviewModal, { WebviewModalParams } from './WebviewModal';
import useUserDetailsPolling from '../../../hooks/useUserDetailsPolling';
import { KycStatus } from '../../../constants';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useDepositRouting } from '../../../hooks/useDepositRouting';

interface KycWebviewModalParams extends WebviewModalParams {
  quote: BuyQuote;
  cryptoCurrencyChainId: string;
  paymentMethodId: string;
}

export const createKycWebviewModalNavigationDetails =
  createNavigationDetails<KycWebviewModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
  );

function KycWebviewModal() {
  const navigation = useNavigation();
  const { quote, cryptoCurrencyChainId, paymentMethodId } =
    useParams<KycWebviewModalParams>();

  const { routeAfterAuthentication } = useDepositRouting({
    cryptoCurrencyChainId,
    paymentMethodId,
  });

  const {
    userDetails: userDetailsPolling,
    startPolling,
    stopPolling,
  } = useUserDetailsPolling(5000, false, 0);

  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    const kycStatus = userDetailsPolling?.kyc?.l1?.status;
    const kycType = userDetailsPolling?.kyc?.l1?.type;

    if (
      kycStatus &&
      kycStatus !== KycStatus.NOT_SUBMITTED &&
      kycType !== null &&
      kycType !== 'SIMPLE'
    ) {
      stopPolling();
      if (quote) {
        routeAfterAuthentication(quote);
      }
    }
  }, [
    userDetailsPolling?.kyc?.l1?.status,
    userDetailsPolling?.kyc?.l1?.type,
    stopPolling,
    navigation,
    quote,
    routeAfterAuthentication,
  ]);

  return <WebviewModal />;
}

export default KycWebviewModal;
