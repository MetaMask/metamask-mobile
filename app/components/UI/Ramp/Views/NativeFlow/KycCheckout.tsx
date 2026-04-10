import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import Checkout from '../Checkout';
import useTransakIdProofPolling from '../../hooks/useTransakIdProofPolling';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';

interface KycCheckoutParams {
  url: string;
  providerName: string;
  workFlowRunId: string;
}

export const createKycCheckoutNavDetails =
  createNavigationDetails<KycCheckoutParams>(Routes.RAMP.KYC_CHECKOUT);

function KycCheckout() {
  const { workFlowRunId } = useParams<KycCheckoutParams>();
  const hasNavigatedRef = useRef(false);
  const navigation = useNavigation();

  const { idProofStatus } = useTransakIdProofPolling(
    workFlowRunId,
    2000,
    true,
    0,
  );

  useEffect(() => {
    if (idProofStatus === 'SUBMITTED' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigation.goBack();
    }
  }, [idProofStatus, navigation]);

  return <Checkout />;
}

export default KycCheckout;
