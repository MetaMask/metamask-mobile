import { TransactionBatchMeta } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { selectTransactionBatchMetadataById } from '../../../../../selectors/transactionController';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useApprovalRequest from '../useApprovalRequest';

export function useTransactionBatchesMetadata() {
  const { approvalRequest } = useApprovalRequest();

  const transactionBatchMetadata = useSelector((state: RootState) =>
    selectTransactionBatchMetadataById(state, approvalRequest?.id as string),
  );

  if (
    // TODO: substitute with approval type from transaction controller
    approvalRequest?.type === 'transaction_batch' &&
    !transactionBatchMetadata
  ) {
    return undefined;
  }

  return transactionBatchMetadata as TransactionBatchMeta;
}
