import React, { useEffect, useRef } from 'react';
import { type TransakBuyQuote } from '@metamask/ramps-controller';

import Checkout from '../Checkout';
import useTransakIdProofPolling from '../../hooks/useTransakIdProofPolling';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useTransakRouting } from '../../hooks/useTransakRouting';

interface KycWebviewParams {
  url: string;
  providerName: string;
  workFlowRunId: string;
  quote: TransakBuyQuote;
  amount?: number;
}

export const createKycWebviewNavDetails =
  createNavigationDetails<KycWebviewParams>(Routes.RAMP.KYC_WEBVIEW);

function KycWebview() {
  const { workFlowRunId, quote, amount } = useParams<KycWebviewParams>();
  const hasNavigatedRef = useRef(false);

  const { routeAfterAuthentication } = useTransakRouting({
    screenLocation: 'KycWebview Screen',
  });

  const { idProofStatus } = useTransakIdProofPolling(
    workFlowRunId,
    2000,
    true,
    0,
  );

  useEffect(() => {
    if (idProofStatus === 'SUBMITTED' && quote && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      routeAfterAuthentication(quote, amount);
    }
  }, [idProofStatus, quote, amount, routeAfterAuthentication]);

  return <Checkout />;
}

export default KycWebview;
