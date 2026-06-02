import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import {
  updateAtomicBatchData,
  updateTransaction,
} from '../../../../../util/transaction-controller';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from '../../../../UI/Money/utils/moneyAccountTransactions';
import { UpdateTransactionPayAmountCall } from '../../types/transactions';
import { hasTransactionType } from '../../utils/transaction';
import Logger from '../../../../../util/Logger';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';

type MoneyAccountAmountUpdater = (
  transactionMeta: TransactionMeta,
  amountHuman: string,
) => Promise<UpdateTransactionPayAmountCall[]>;

export function useUpdateTransactionPayAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount } = useUpdateTokenAmount();
  const requiredTokens = useTransactionPayRequiredTokens();

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

  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isPerpsWithdrawToMoneyAccount =
    hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw]) &&
    paymentOverride === PaymentOverride.MoneyAccount;

  const updateTransactionPayAmount = useCallback(
    async (amountHuman: string) => {
      if (!transactionMeta) {
        return;
      }

      if (
        hasTransactionType(transactionMeta, [
          TransactionType.moneyAccountDeposit,
        ]) ||
        isPerpsWithdrawToMoneyAccount
      ) {
        syncMoneyAccountDepositRequiredAssets(
          transactionMeta,
          amountHuman,
          requiredTokens?.[0]?.decimals,
        );
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
    [
      transactionMeta,
      isPerpsWithdrawToMoneyAccount,
      applyMoneyAccountAmountUpdates,
      updateTokenAmount,
      requiredTokens,
    ],
  );

  return { updateTransactionPayAmount };
}

function syncMoneyAccountDepositRequiredAssets(
  transactionMeta: TransactionMeta,
  amountHuman: string,
  decimals: number | undefined,
): void {
  const existing = transactionMeta.requiredAssets;
  if (!existing?.length || decimals === undefined) return;

  try {
    const amount = toHex(
      new BigNumber(amountHuman)
        .shiftedBy(decimals)
        .decimalPlaces(0, BigNumber.ROUND_UP)
        .toFixed(0),
    ) as Hex;
    if (existing[0].amount === amount) return;

    updateTransaction(
      {
        ...transactionMeta,
        requiredAssets: [{ ...existing[0], amount }, ...existing.slice(1)],
      },
      'Money Account deposit: sync requiredAssets amount',
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to sync Money Account deposit requiredAssets amount',
    );
  }
}
