import { ApprovalType } from '@metamask/controller-utils';
import { TransactionMeta } from '@metamask/transaction-controller';

import { useSelector } from 'react-redux';

import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import { RootState } from '../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useApprovalRequest from './useApprovalRequest';

const APPROVAL_TRANSACTION_TYPES = [ApprovalType.Transaction];

export function useTransactionMetadata() {
  const { approvalRequest } = useApprovalRequest();

  const transactionMetadata = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, approvalRequest?.id as string),
  );

  if (
    !APPROVAL_TRANSACTION_TYPES.includes(
      approvalRequest?.type as ApprovalType,
    ) ||
    !transactionMetadata
  ) {
    return undefined;
  }

  return transactionMetadata as TransactionMeta;
}
