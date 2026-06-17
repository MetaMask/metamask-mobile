import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectMoneyNoFeeTokens } from '../../../../UI/Money/selectors/featureFlags';
import { isTokenInWildcardList } from '../../../../UI/Earn/utils/wildcardTokenList';
import { safeFormatChainIdToHex } from '../../../../UI/Card/util/safeFormatChainIdToHex';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';
import { NoFeeTag } from '../../components/UI/no-fee-tag';
import { TokenTagRenderer } from '../../components/UI/token';

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
  renderNoFeeTag: TokenTagRenderer;
} {
  const noFeeTokenList = useSelector(selectMoneyNoFeeTokens);
  const { availableTokens } = useTransactionPayAvailableTokens();

  const matchesNoFeeList = useCallback(
    (symbol: string, chainId: string | undefined): boolean => {
      if (!chainId) return false;
      return isTokenInWildcardList(
        symbol,
        noFeeTokenList,
        safeFormatChainIdToHex(chainId),
      );
    },
    [noFeeTokenList],
  );

  const isNoFeeToken = useCallback(
    (address: string, chainId: string): boolean => {
      const token = availableTokens.find(
        (t) =>
          t.address.toLowerCase() === address.toLowerCase() &&
          t.chainId?.toLowerCase() === chainId.toLowerCase(),
      );

      if (!token) return false;

      return matchesNoFeeList(token.symbol, token.chainId);
    },
    [availableTokens, matchesNoFeeList],
  );

  const noFeeToken = useMemo(() => {
    const eligible = availableTokens.filter(
      (token: AssetType) =>
        !token.disabled && matchesNoFeeList(token.symbol, token.chainId),
    );

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
  }, [availableTokens, excludeToken, matchesNoFeeList]);

  const renderNoFeeTag: TokenTagRenderer = useCallback(
    (token: AssetType) => {
      if (!matchesNoFeeList(token.symbol, token.chainId)) {
        return null;
      }
      return <NoFeeTag />;
    },
    [matchesNoFeeList],
  );

  return { noFeeToken, isNoFeeToken, renderNoFeeTag };
}
