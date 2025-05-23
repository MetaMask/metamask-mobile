import { Hex } from '@metamask/utils';
import { useCallback } from 'react';

import Engine from '../../../../../core/Engine';
import { BalanceChange } from '../../../../UI/SimulationDetails/types';
import { updateApprovalAmount } from '../../utils/approvals';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { ApprovalBalanceChange } from './useBatchApproveBalanceChanges';

export const useBatchApproveBalanceActions = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { id, nestedTransactions } = transactionMeta ?? {};

  const onApprovalAmountUpdate = useCallback(
    async (balanceChange: BalanceChange, approvalAmount: string) => {
      if (!nestedTransactions || !id) {
        return;
      }

      const { nestedTransactionIndex, decimals } =
        balanceChange as ApprovalBalanceChange;
      const trxn = nestedTransactions[nestedTransactionIndex];
      const data = updateApprovalAmount(
        trxn.data as Hex,
        (approvalAmount || '0').replace('#', ''),
        Number(decimals || 0),
      );

      await Engine.context.TransactionController.updateAtomicBatchData({
        transactionId: id,
        transactionData: data,
        transactionIndex: nestedTransactionIndex,
      });
    },
    [id, nestedTransactions],
  );

  return { onApprovalAmountUpdate };
};
