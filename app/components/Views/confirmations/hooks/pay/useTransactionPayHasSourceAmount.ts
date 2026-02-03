import { useMemo } from 'react';
import {
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from './useTransactionPayData';

/**
 * Returns whether there are non-optional source amounts that require a quote.
 * This is true when the user needs to bridge/swap tokens to complete the transaction.
 */
export function useTransactionPayHasSourceAmount() {
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();

  return useMemo(
    () =>
      sourceAmounts?.some((a) =>
        requiredTokens.some(
          (rt) =>
            rt.address.toLowerCase() === a.targetTokenAddress.toLowerCase() &&
            !rt.skipIfBalance,
        ),
      ) ?? false,
    [sourceAmounts, requiredTokens],
  );
}
