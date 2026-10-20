import { useEffect, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';

import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import {
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import { useUpdateTransactionPayAmount } from '../pay/useUpdateTransactionPayAmount';

type UsePerpsWithdrawMaxAmountRefreshProps = {
  transactionMeta: TransactionMeta;
  isMaxAmount: boolean;
};

/**
 * Re-sync the committed amount for a perps withdraw Max flow when the live
 * withdrawable balance changes, so the existing quote pipeline can refresh
 * against the new snapshot.
 *
 * The normal quote refresh cadence is not frequent enough to keep this flow in
 * sync when HyperLiquid withdrawable drifts between refreshes.
 */
export function usePerpsWithdrawMaxAmountRefresh({
  transactionMeta,
  isMaxAmount,
}: UsePerpsWithdrawMaxAmountRefreshProps): void {
  const { balanceRaw, balanceUsd } = useTransactionPayBalance();
  const requiredTokens = useTransactionPayRequiredTokens();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const { updateTransactionPayAmount } = useUpdateTransactionPayAmount();
  const lastPerpsMaxBalanceRef = useRef<string | undefined>(undefined);

  const sourceAmount = sourceAmounts?.[0]?.sourceAmountRaw;
  const decimals = requiredTokens?.[0]?.decimals;
  const committedAmountHuman =
    sourceAmount && decimals !== undefined
      ? new BigNumber(sourceAmount).shiftedBy(-decimals).toFixed()
      : undefined;

  const liveAmountHuman = new BigNumber(balanceUsd).toFixed();

  useEffect(() => {
    if (
      !isMaxAmount ||
      !hasTransactionType(transactionMeta, [TransactionType.perpsWithdraw])
    ) {
      lastPerpsMaxBalanceRef.current = undefined;
      return;
    }

    if (lastPerpsMaxBalanceRef.current === undefined) {
      lastPerpsMaxBalanceRef.current = balanceRaw;
      return;
    }

    if (lastPerpsMaxBalanceRef.current === balanceRaw) {
      return;
    }

    lastPerpsMaxBalanceRef.current = balanceRaw;

    if (committedAmountHuman === undefined) {
      return;
    }

    if (liveAmountHuman === committedAmountHuman) {
      return;
    }

    updateTransactionPayAmount(liveAmountHuman);
  }, [
    balanceRaw,
    balanceUsd,
    committedAmountHuman,
    isMaxAmount,
    liveAmountHuman,
    transactionMeta,
    updateTransactionPayAmount,
  ]);
}
