import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';

const ZERO_ADDRESS = '0x0' as Hex;

// payToken.balanceUsd is a one-time snapshot that can be stale (race with
// AccountTracker polling). Read from the same reactive asset source the
// token selector uses so the balance stays in sync.
export function usePayTokenAccountBalance(): {
  balanceUsd: string;
  balanceRaw: string;
} {
  const { payToken } = useTransactionPayToken();
  const accountTokens = useAccountTokens({ includeNoBalance: true });
  const usdRate = useTokenFiatRate(
    (payToken?.address ?? ZERO_ADDRESS) as Hex,
    (payToken?.chainId ?? ZERO_ADDRESS) as Hex,
    'usd',
  );

  return useMemo(() => {
    if (!payToken) {
      return { balanceUsd: '0', balanceRaw: '0' };
    }

    const matchingToken = accountTokens.find(
      (t) =>
        t.address?.toLowerCase() === payToken.address.toLowerCase() &&
        t.chainId === payToken.chainId,
    );

    if (!matchingToken?.rawBalance) {
      return {
        balanceUsd: payToken.balanceUsd ?? '0',
        balanceRaw: payToken.balanceRaw ?? '0',
      };
    }

    const rawBalanceDecimal = new BigNumber(matchingToken.rawBalance).toString(
      10,
    );
    const decimals = matchingToken.decimals ?? payToken.decimals;
    const humanBalance = new BigNumber(rawBalanceDecimal).shiftedBy(-decimals);
    const balanceUsd = usdRate
      ? humanBalance.multipliedBy(usdRate).toString(10)
      : (payToken.balanceUsd ?? '0');

    return { balanceUsd, balanceRaw: rawBalanceDecimal };
  }, [payToken, accountTokens, usdRate]);
}
