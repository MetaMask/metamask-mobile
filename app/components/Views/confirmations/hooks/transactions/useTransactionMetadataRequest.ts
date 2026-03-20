import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useApprovalRequest from '../useApprovalRequest';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import Engine from '../../../../../core/Engine';

export function useTransactionMetadataRequest() {
  const { approvalRequest } = useApprovalRequest();

  const reduxMetadata = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, approvalRequest?.id as string),
  );

  const controllerMetadata = useMemo(() => {
    if (!approvalRequest?.id) {
      return undefined;
    }

    return Engine.context.TransactionController.state.transactions.find(
      (tx: TransactionMeta) => tx.id === approvalRequest.id,
    );
  }, [approvalRequest?.id]);

  const transactionMetadata = reduxMetadata ?? controllerMetadata;

  if (
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
