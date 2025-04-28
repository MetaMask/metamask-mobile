import { useEffect } from 'react';
import { ApprovalType } from '@metamask/controller-utils';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useApprovalRequest from '../useApprovalRequest';

export function useTransactionMetadataRequest() {
  const { approvalRequest } = useApprovalRequest();

  const transactionMetadata = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, approvalRequest?.id as string),
  );

  useEffect(() => {
    // This is a temporary solution to force the token list to be fetched for the chainId of the transaction in order to get proper display names for simulation details.
    // We may remove this once we have a better way to single token information.
    if (transactionMetadata?.chainId) {
      Engine.context.TokenListController.fetchTokenList(
        transactionMetadata.chainId,
      );
    }
  }, [transactionMetadata?.chainId]);

  if (
    approvalRequest?.type === ApprovalType.Transaction &&
    !transactionMetadata
  ) {
    return undefined;
  }

  return transactionMetadata as TransactionMeta;
}
