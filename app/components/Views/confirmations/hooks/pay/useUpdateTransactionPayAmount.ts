import { useCallback } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import { updateMoneyAccountDepositTokenAmount } from '../../../../UI/Money/utils/moneyAccountTransactions';
import { hasTransactionType } from '../../utils/transaction';
import Logger from '../../../../../util/Logger';

export function useUpdateTransactionPayAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount } = useUpdateTokenAmount();

  const updateTransactionPayAmount = useCallback(
    (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
        TransactionType.moneyAccountDeposit,
      ]);

      if (isMoneyAccountDeposit) {
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
              'Failed to update transaction pay amount in nested transaction',
            );
          });
        }
        return;
      }

      updateTokenAmount(amountHuman);
    },
    [transactionMeta, updateTokenAmount],
  );

  return { updateTransactionPayAmount };
}
