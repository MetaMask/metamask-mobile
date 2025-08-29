import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import useApprovalRequest from '../useApprovalRequest';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { useDeepMemo } from '../useDeepMemo';
import { useMemo } from 'react';

export function useTransactionMetadataRequest() {
  const { approvalRequest } = useApprovalRequest();

  const transactionMetadata = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, approvalRequest?.id as string),
  );

  const finalTransaction = {
    ...transactionMetadata,
    gasFeeEstimates: undefined,
  };

  const isTransaction =
    approvalRequest?.type === ApprovalType.Transaction && transactionMetadata;

  return useDeepMemo(() => {
    if (!isTransaction) {
      return undefined;
    }

    return finalTransaction as TransactionMeta;
  }, [isTransaction, finalTransaction]);
}

export function useTransactionMetadataOrThrow(): TransactionMeta {
  const transaction = useTransactionMetadataRequest();

  return useMemo(
    () =>
      transaction ?? {
        id: '',
        chainId: '0x123456',
        networkClientId: '',
        status: TransactionStatus.rejected,
        time: 0,
        txParams: {
          from: EMPTY_ADDRESS,
        },
        type: TransactionType.simpleSend,
      },
    [transaction],
  );
}
