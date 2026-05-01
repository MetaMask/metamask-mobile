import { useCallback } from 'react';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { updateMoneyAccountDepositTokenAmount } from '../../../../UI/Money/utils/moneyAccountTransactions';
import Logger from '../../../../../util/Logger';

export function useUpdateCustomTokenAmount() {
  const transactionMeta = useTransactionMetadataRequest();

  const updateCustomTokenAmount = useCallback(
    (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      const updates = updateMoneyAccountDepositTokenAmount(
        transactionMeta,
        amountHuman,
      );

      for (const { nestedTransactionIndex, transactionData } of updates) {
        updateAtomicBatchData({
          transactionId: transactionMeta.id,
          transactionIndex: nestedTransactionIndex,
          transactionData,
        }).catch((error) => {
          Logger.error(
            error,
            'Failed to update custom token amount in nested transaction',
          );
        });
      }
    },
    [transactionMeta],
  );

  return { updateCustomTokenAmount };
}
