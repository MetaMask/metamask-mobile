import { Hex } from '@metamask/utils';
import { useCallback } from 'react';

import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { BalanceChange } from '../../../../UI/SimulationDetails/types';
import { ERC20_DEFAULT_DECIMALS } from '../../utils/token';
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
        approvalAmount || '0',
        Number(decimals || ERC20_DEFAULT_DECIMALS),
      );

      await updateAtomicBatchData({
        transactionId: id,
        transactionData: data,
        transactionIndex: nestedTransactionIndex,
      });
    },
    [id, nestedTransactions],
  );

  return { onApprovalAmountUpdate };
};
