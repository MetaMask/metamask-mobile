import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { DUST_THRESHOLD } from '../../../../UI/Money/utils/moneyFormatFiat';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Message key for the insufficient pay token balance alert.
 *
 * A Money Account withdraw with a balance at or below dust means the account
 * was never funded, so the user has to add funds rather than lower the amount.
 * Every other flow uses the generic copy.
 */
export function useInsufficientPayTokenBalanceMessageKey(
  balanceUsd: string,
): string {
  const transactionMeta = useTransactionMetadataRequest();

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);

  return useMemo(
    () =>
      isMoneyAccountWithdraw && new BigNumber(balanceUsd).lt(DUST_THRESHOLD)
        ? 'alert_system.money_account_no_funds.message'
        : 'alert_system.insufficient_pay_token_balance.message',
    [balanceUsd, isMoneyAccountWithdraw],
  );
}
