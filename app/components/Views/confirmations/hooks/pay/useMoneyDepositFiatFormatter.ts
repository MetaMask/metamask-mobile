import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';

/**
 * Normalizes USD strings emitted by Intl.NumberFormat on non-US locales
 * (e.g. `US$ 100`, `100 $US`, `USD 100`, `$\u00a0104,00`) to `$` with no
 * trailing whitespace before digits/signs, while preserving locale separators.
 */
export function normalizeUsdFiatString(formatted: string): string {
  return formatted
    .replace(/US\$|\$US|\bUSD\b/gu, '$')
    .replace(/\$\s+(?=[-\d])/gu, '$');
}

export function useMoneyDepositFiatFormatter(options?: {
  fractionDigits?: number;
}): (amount: BigNumber) => string {
  const formatUsd = useFiatFormatter({
    currency: 'usd',
    fractionDigits: options?.fractionDigits,
  });

  return useCallback(
    (amount: BigNumber) => normalizeUsdFiatString(formatUsd(amount)),
    [formatUsd],
  );
}
