import React, { useEffect, useRef } from 'react';
import { BuyQuote } from '@consensys/native-ramps-sdk';

import WebviewModal, { WebviewModalParams } from './WebviewModal';
import useIdProofPolling from '../../../hooks/useIdProofPolling';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useDepositRouting } from '../../../hooks/useDepositRouting';
import { endTrace, TraceName } from '../../../../../../../util/trace';

interface KycWebviewModalParams extends WebviewModalParams {
  quote: BuyQuote;
  workFlowRunId: string;
}

export const createKycWebviewModalNavigationDetails =
  createNavigationDetails<KycWebviewModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
  );

function KycWebviewModal() {
  const { quote, workFlowRunId } = useParams<KycWebviewModalParams>();
  const hasNavigatedRef = useRef(false);

  const { routeAfterAuthentication } = useDepositRouting({
    screenLocation: 'KycWebviewModal Screen',
  });

  const { idProofStatus } = useIdProofPolling(workFlowRunId, 1000, true, 0);

  useEffect(() => {
    endTrace({
      name: TraceName.DepositContinueFlow,
      data: {
        destination: Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
      },
    });

    endTrace({
      name: TraceName.DepositInputOtp,
      data: {
        destination: Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
      },
    });
  }, []);

  useEffect(() => {
    if (idProofStatus === 'SUBMITTED' && quote && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      routeAfterAuthentication(quote);
    }
  }, [idProofStatus, quote, routeAfterAuthentication]);

  return <WebviewModal />;
}

export default KycWebviewModal;
