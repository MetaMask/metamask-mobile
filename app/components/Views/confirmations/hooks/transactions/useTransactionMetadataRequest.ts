import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import type { RootState } from '../../../../../reducers';
import { useGasFeeModalTransaction } from '../../context/gas-fee-modal-transaction';
import useApprovalRequest from '../useApprovalRequest';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';

export function useTransactionMetadataRequest() {
  const { transactionId: overrideTransactionId } = useGasFeeModalTransaction();
  const { approvalRequest } = useApprovalRequest();

  const effectiveId = overrideTransactionId ?? (approvalRequest?.id as string);

  const transactionMetadata = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, effectiveId),
  );

  if (
    !overrideTransactionId &&
    approvalRequest?.type === ApprovalType.Transaction &&
    !transactionMetadata
  ) {
    return undefined;
  }

  return transactionMetadata as TransactionMeta;
}

export function useTransactionMetadataOrThrow(): TransactionMeta {
  return (
    useTransactionMetadataRequest() ?? {
      id: '',
      chainId: '0x123456',
      networkClientId: '',
      status: TransactionStatus.rejected,
      time: 0,
      txParams: {
        from: EMPTY_ADDRESS,
      },
      type: TransactionType.simpleSend,
    }
  );
}
