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

  const updateMoneyAccountDepositAmount = useCallback(
    async (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      try {
        const updates = await updateMoneyAccountDepositTokenAmount(
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
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to prepare Money Account deposit amount update',
        );
      }
    },
    [transactionMeta],
  );

  const updateTransactionPayAmount = useCallback(
    async (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
        TransactionType.moneyAccountDeposit,
      ]);

      if (isMoneyAccountDeposit) {
        await updateMoneyAccountDepositAmount(amountHuman);
        return;
      }

      updateTokenAmount(amountHuman);
    },
    [transactionMeta, updateMoneyAccountDepositAmount, updateTokenAmount],
  );

  return { updateTransactionPayAmount };
}
