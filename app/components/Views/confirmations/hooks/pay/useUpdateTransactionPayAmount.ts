import { useCallback } from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import { updateAtomicBatchData } from '../../../../../util/transaction-controller';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from '../../../../UI/Money/utils/moneyAccountTransactions';
import { UpdateTransactionPayAmountCall } from '../../types/transactions';
import { hasTransactionType } from '../../utils/transaction';
import Logger from '../../../../../util/Logger';

type MoneyAccountAmountUpdater = (
  transactionMeta: TransactionMeta,
  amountHuman: string,
) => Promise<UpdateTransactionPayAmountCall[]>;

export function useUpdateTransactionPayAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount } = useUpdateTokenAmount();

  const applyMoneyAccountAmountUpdates = useCallback(
    async (
      amountHuman: string,
      updater: MoneyAccountAmountUpdater,
      preparationErrorMessage: string,
    ) => {
      if (!transactionMeta) {
        return;
      }

      try {
        const updates = await updater(transactionMeta, amountHuman);

        const results = await Promise.allSettled(
          updates.map(({ nestedTransactionIndex, transactionData }) =>
            updateAtomicBatchData({
              transactionId: transactionMeta.id,
              transactionIndex: nestedTransactionIndex,
              transactionData,
            }),
          ),
        );

        for (const result of results) {
          if (result.status === 'rejected') {
            Logger.error(
              result.reason as Error,
              'Failed to update transaction pay amount in nested transaction',
            );
          }
        }
      } catch (error) {
        Logger.error(error as Error, preparationErrorMessage);
      }
    },
    [transactionMeta],
  );

  const updateTransactionPayAmount = useCallback(
    async (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      if (
        hasTransactionType(transactionMeta, [
          TransactionType.moneyAccountDeposit,
        ])
      ) {
        await applyMoneyAccountAmountUpdates(
          amountHuman,
          updateMoneyAccountDepositTokenAmount,
          'Failed to prepare Money Account deposit amount update',
        );
        return;
      }

      if (
        hasTransactionType(transactionMeta, [
          TransactionType.moneyAccountWithdraw,
        ])
      ) {
        await applyMoneyAccountAmountUpdates(
          amountHuman,
          updateMoneyAccountWithdrawTokenAmount,
          'Failed to prepare Money Account withdraw amount update',
        );
        return;
      }

      updateTokenAmount(amountHuman);
    },
    [transactionMeta, applyMoneyAccountAmountUpdates, updateTokenAmount],
  );

  return { updateTransactionPayAmount };
}
