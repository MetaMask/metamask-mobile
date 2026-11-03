import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { DUST_THRESHOLD } from '../../../../UI/Money/utils/moneyFormatFiat';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Alert message key for an under-funded Money Account withdraw.
 *
 * A Money balance at or below dust means the account was never funded, so the
 * user has to add funds rather than lower the amount. Returns undefined for
 * every other transaction type and for a funded balance, leaving the caller
 * with the generic pay token balance message.
 */
export function useMoneyAccountNoFundsMessageKey(
  balanceUsd: string,
): string | undefined {
  const transactionMeta = useTransactionMetadataRequest();

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);

  return useMemo(
    () =>
      isMoneyAccountWithdraw && new BigNumber(balanceUsd).lt(DUST_THRESHOLD)
        ? 'alert_system.money_account_no_funds.message'
        : undefined,
    [balanceUsd, isMoneyAccountWithdraw],
  );
}
