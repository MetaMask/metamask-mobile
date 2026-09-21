import { useMemo } from 'react';
import {
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayRequiredTokens,
} from './useTransactionPayData';

/**
 * Whether a required amount has not reached the pay controller yet.
 *
 * The amount arrives through a chain of effects, so for a moment after the
 * amount or the pay token changes the controller still holds a zero amount. It
 * skips zero amount tokens when building source amounts, so no quote is
 * requested and nothing reports the pay system as loading. Use this to keep a
 * CTA disabled until the real amount lands.
 *
 * An empty token list is not stale: flows such as claims never fund through
 * MetaMask Pay and would otherwise never be able to confirm.
 */
export function useIsTransactionPayAmountStale() {
  const requiredTokens = useTransactionPayRequiredTokens();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const isPostQuote = useTransactionPayIsPostQuote();

  // Post-quote max flows source from the token balance, so a zero amount is
  // expected there and quotes are still requested.
  const usesBalanceAsAmount = Boolean(isPostQuote && isMaxAmount);

  return useMemo(
    () =>
      !usesBalanceAsAmount &&
      (requiredTokens ?? []).some(
        (token) => !token.skipIfBalance && token.amountRaw === '0',
      ),
    [requiredTokens, usesBalanceAsAmount],
  );
}
