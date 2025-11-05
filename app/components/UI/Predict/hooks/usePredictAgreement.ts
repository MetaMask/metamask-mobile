import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectPredictAccountMetaByAddress } from '../selectors/predictController';
import { AcceptAgreementParams } from '../types';

interface UsePredictAgreementParams {
  providerId: string;
}

interface UsePredictAgreementReturn {
  isAgreementAccepted: boolean;
  acceptAgreement: () => boolean;
}

/**
 * Hook for managing Predict agreement acceptance
 * @param params Configuration options for the hook
 * @returns Agreement state and acceptance function
 */
export function usePredictAgreement(
  params: UsePredictAgreementParams,
): UsePredictAgreementReturn {
  const { providerId } = params;

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const isAgreementAccepted = useSelector(
    selectPredictAccountMetaByAddress({
      providerId,
      address: selectedInternalAccountAddress || '',
    }),
  )?.acceptedToS;

  const acceptAgreement = useCallback(() => {
    if (!selectedInternalAccountAddress) {
      return false;
    }

    const controller = Engine.context.PredictController;
    const acceptParams: AcceptAgreementParams = {
      providerId,
      address: selectedInternalAccountAddress,
    };

    return controller.acceptAgreement(acceptParams);
  }, [providerId, selectedInternalAccountAddress]);

  return {
    isAgreementAccepted,
    acceptAgreement,
  };
}
