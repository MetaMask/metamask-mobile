import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectMoneyNoFeeTokens } from '../../../../UI/Money/selectors/featureFlags';
import { isTokenInWildcardList } from '../../../../UI/Earn/utils/wildcardTokenList';
import { safeFormatChainIdToHex } from '../../../../UI/Card/util/safeFormatChainIdToHex';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';

export interface NoFeeTokenResult {
  address: Hex;
  balanceUsd: string;
  chainId: Hex;
  symbol: string;
}

/**
 * Finds the highest-balance no-fee token among available payment tokens.
 *
 * Accepts an optional `excludeToken` to de-duplicate against the preferred
 * token row — when the preferred token is already a no-fee token, this hook
 * returns the next-highest-balance no-fee token instead.
 */
export function usePayWithNoFeeToken({
  excludeToken,
}: {
  excludeToken?: { address: string; chainId: string };
} = {}): {
  noFeeToken: NoFeeTokenResult | undefined;
  isNoFeeToken: (address: string, chainId: string) => boolean;
} {
  const noFeeTokenList = useSelector(selectMoneyNoFeeTokens);
  const { availableTokens } = useTransactionPayAvailableTokens();

  const isNoFeeToken = useCallback(
    (address: string, chainId: string): boolean => {
      const token = availableTokens.find(
        (t) =>
          t.address.toLowerCase() === address.toLowerCase() &&
          t.chainId?.toLowerCase() === chainId.toLowerCase(),
      );

      if (!token?.chainId) return false;

      return isTokenInWildcardList(
        token.symbol,
        noFeeTokenList,
        safeFormatChainIdToHex(token.chainId),
      );
    },
    [availableTokens, noFeeTokenList],
  );

  const noFeeToken = useMemo(() => {
    const enabledTokens = availableTokens.filter((t) => !t.disabled);

    const eligible = enabledTokens.filter((token: AssetType) => {
      if (!token.chainId) return false;

      return isTokenInWildcardList(
        token.symbol,
        noFeeTokenList,
        safeFormatChainIdToHex(token.chainId),
      );
    });

    const sorted = [...eligible].sort(
      (a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0),
    );

    const match = sorted.find((token) => {
      if (!excludeToken) return true;

      return !(
        token.address.toLowerCase() === excludeToken.address.toLowerCase() &&
        token.chainId?.toLowerCase() === excludeToken.chainId.toLowerCase()
      );
    });

    if (!match?.chainId) return undefined;

    return {
      address: match.address as Hex,
      balanceUsd: `${match.fiat?.balance ?? 0}`,
      chainId: match.chainId as Hex,
      symbol: match.symbol,
    };
  }, [availableTokens, excludeToken, noFeeTokenList]);

  return { noFeeToken, isNoFeeToken };
}
