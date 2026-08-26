import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { bigIntToHex, Hex, isStrictHexString } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';

const ZERO_ADDRESS = '0x0' as Hex;

interface PayTokenAccountBalance {
  balanceUsd: string;
  balanceRaw: string;
}

interface LivePayTokenAccountBalance {
  balanceUsd: string | undefined;
  balanceRaw: string | undefined;
}

const normalizeEvmChainId = (chainId: string) =>
  isStrictHexString(chainId) ? bigIntToHex(BigInt(chainId)) : chainId;

export function usePayTokenAccountBalance(options: {
  requireLiveBalance: true;
}): LivePayTokenAccountBalance;
export function usePayTokenAccountBalance(options?: {
  requireLiveBalance?: false;
}): PayTokenAccountBalance;
/**
 * Reads the reactive account-token balance. Existing confirmation callers keep
 * the controller snapshot fallback; Perps can require live data and distinguish
 * an unresolved balance from a measured zero.
 */
export function usePayTokenAccountBalance(
  options: { requireLiveBalance?: boolean } = {},
): PayTokenAccountBalance | LivePayTokenAccountBalance {
  const { requireLiveBalance = false } = options;
  const { payToken } = useTransactionPayToken();
  const accountTokens = useAccountTokens({ includeNoBalance: true });
  const payTokenChainId = payToken
    ? requireLiveBalance
      ? normalizeEvmChainId(payToken.chainId)
      : payToken.chainId
    : undefined;
  const usdRate = useTokenFiatRate(
    (payToken?.address ?? ZERO_ADDRESS) as Hex,
    (payTokenChainId ?? ZERO_ADDRESS) as Hex,
    'usd',
  );

  return useMemo(() => {
    if (!payToken) {
      return requireLiveBalance
        ? { balanceUsd: undefined, balanceRaw: undefined }
        : { balanceUsd: '0', balanceRaw: '0' };
    }

    const matchingToken = accountTokens.find((token) => {
      if (
        token.address?.toLowerCase() !== payToken.address.toLowerCase() ||
        !token.chainId
      ) {
        return false;
      }

      const tokenChainId = requireLiveBalance
        ? normalizeEvmChainId(token.chainId)
        : token.chainId;
      return tokenChainId === payTokenChainId;
    });

    if (!matchingToken?.rawBalance) {
      if (requireLiveBalance) {
        return { balanceUsd: undefined, balanceRaw: undefined };
      }

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

    if (requireLiveBalance) {
      return {
        balanceUsd: humanBalance.isZero()
          ? '0'
          : usdRate != null
            ? humanBalance.multipliedBy(usdRate).toString(10)
            : undefined,
        balanceRaw: rawBalanceDecimal,
      };
    }

    const balanceUsd = usdRate
      ? humanBalance.multipliedBy(usdRate).toString(10)
      : (payToken.balanceUsd ?? '0');

    return { balanceUsd, balanceRaw: rawBalanceDecimal };
  }, [accountTokens, payToken, payTokenChainId, requireLiveBalance, usdRate]);
}
