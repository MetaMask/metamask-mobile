import { useMemo } from 'react';
import { useAccountTokens } from '../send/useAccountTokens';
import { getAvailableTokens } from '../../utils/transaction-pay';

export function useTransactionPayAvailableTokens() {
  const tokens = useAccountTokens({ includeNoBalance: true });

  const availableTokens = useMemo(
    () =>
      getAvailableTokens({
        tokens,
      }),
    [tokens],
  );

  return availableTokens;
}
