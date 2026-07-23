import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
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
import { prefixError } from '../../../../../util/transactions/error-prefix';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';

const DEPOSIT_ERROR_PREFIX = 'Money Account Deposit: ';
const WITHDRAW_ERROR_PREFIX = 'Money Account Withdrawal: ';

type MoneyAccountAmountUpdater = (
  transactionMeta: TransactionMeta,
  amountHuman: string,
  recipientOverride?: Hex,
) => Promise<UpdateTransactionPayAmountCall[]>;

export function useUpdateTransactionPayAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount } = useUpdateTokenAmount();
  const requiredTokens = useTransactionPayRequiredTokens();
  const accountOverride = useTransactionAccountOverride();

  const applyMoneyAccountAmountUpdates = useCallback(
    async (
      amountHuman: string,
      updater: MoneyAccountAmountUpdater,
      errorPrefix: string,
      recipientOverride?: Hex,
    ) => {
      if (!transactionMeta) {
        return;
      }

      let updates: UpdateTransactionPayAmountCall[];
      try {
        updates = await updater(
          transactionMeta,
          amountHuman,
          recipientOverride,
        );
      } catch (error) {
        throw prefixError(error, errorPrefix);
      }

      try {
        await Promise.all(
          updates.map(({ nestedTransactionIndex, transactionData }) =>
            updateAtomicBatchData({
              transactionId: transactionMeta.id,
              transactionIndex: nestedTransactionIndex,
              transactionData,
            }),
          ),
        );
      } catch (error) {
        throw prefixError(error, errorPrefix);
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
        syncMoneyAccountDepositRequiredAssets(
          transactionMeta,
          amountHuman,
          requiredTokens?.[0]?.decimals,
        );
        await applyMoneyAccountAmountUpdates(
          amountHuman,
          updateMoneyAccountDepositTokenAmount,
          DEPOSIT_ERROR_PREFIX,
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
          WITHDRAW_ERROR_PREFIX,
          accountOverride,
        );
        return;
      }

      await updateTokenAmount(amountHuman);
    },
    [
      transactionMeta,
      applyMoneyAccountAmountUpdates,
      updateTokenAmount,
      requiredTokens,
      accountOverride,
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
        txParams: { ...transactionMeta.txParams },
        requiredAssets: [{ ...existing[0], amount }, ...existing.slice(1)],
      },
      'Money Account deposit: sync requiredAssets amount',
    );
  } catch (error) {
    throw prefixError(error, DEPOSIT_ERROR_PREFIX);
  }
}
