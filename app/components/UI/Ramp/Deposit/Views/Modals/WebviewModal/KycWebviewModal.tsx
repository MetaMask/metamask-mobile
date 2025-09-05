import React, { useEffect } from 'react';

import WebviewModal from './WebviewModal';
import useIdProofPolling from '../../../hooks/useIdProofPolling';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../../../util/navigation/types';
import { useDepositRouting } from '../../../hooks/useDepositRouting';
import { endTrace, TraceName } from '../../../../../../../util/trace';

type KycWebviewModalProps = StackScreenProps<
  RootParamList,
  'DepositKycWebviewModal'
>;

function KycWebviewModal({ route }: KycWebviewModalProps) {
  const {
    quote,
    cryptoCurrencyChainId,
    paymentMethodId,
    workFlowRunId,
    sourceUrl,
    handleNavigationStateChange,
  } = route.params;

  const { routeAfterAuthentication } = useDepositRouting({
    cryptoCurrencyChainId,
    paymentMethodId,
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
    if (idProofStatus === 'SUBMITTED' && quote) {
      routeAfterAuthentication(quote);
    }
  }, [idProofStatus, quote, routeAfterAuthentication]);

  return (
    <WebviewModal
      route={{ params: { sourceUrl, handleNavigationStateChange } }}
    />
  );
}

export default KycWebviewModal;
