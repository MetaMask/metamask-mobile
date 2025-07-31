import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';

import WebviewModal, { WebviewModalParams } from './WebviewModal';
import useUserDetailsPolling from '../../../hooks/useUserDetailsPolling';
import { KycStatus } from '../../../constants';
import { createKycProcessingNavDetails } from '../../KycProcessing/KycProcessing';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';

interface KycWebviewModalParams extends WebviewModalParams {
  quote: BuyQuote;
}

export const createKycWebviewModalNavigationDetails =
  createNavigationDetails<KycWebviewModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
  );

function KycWebviewModal() {
  const navigation = useNavigation();
  const { quote } = useParams<KycWebviewModalParams>();

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
        navigation.navigate(...createKycProcessingNavDetails({ quote }));
      }
    }
  }, [
    userDetailsPolling?.kyc?.l1?.status,
    userDetailsPolling?.kyc?.l1?.type,
    stopPolling,
    navigation,
    quote,
  ]);

  return <WebviewModal />;
}

export default KycWebviewModal;
