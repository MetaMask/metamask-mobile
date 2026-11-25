import { TransactionMeta } from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';

/**
 * Fiat amount the user entered for a card deposit. `totalFiat` is that amount
 * plus the provider and network fees, so subtracting them restores it.
 */
export const getFiatDepositAttemptedAmount = (
  transactionMeta: TransactionMeta,
): string | undefined => {
  const { bridgeFeeFiat, fiat, networkFeeFiat, totalFiat } =
    transactionMeta.metamaskPay ?? {};
  // Non-direct quotes add a MetaMask fee and target-network fee this cannot subtract.
  if (fiat?.isDirectMusd === false) {
    return undefined;
  }
  const total = new BigNumber(totalFiat ?? NaN);
  if (!total.isFinite() || total.lte(0)) {
    return undefined;
  }
  const fees = new BigNumber(bridgeFeeFiat ?? 0).plus(networkFeeFiat ?? 0);
  if (!fees.isFinite() || fees.lt(0)) {
    return undefined;
  }
  const attempted = total.minus(fees);
  return attempted.gt(0) ? attempted.toFixed(2) : undefined;
};
