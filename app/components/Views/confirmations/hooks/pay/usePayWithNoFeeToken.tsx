import React, { ReactNode, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { isSubsidizedSource } from '../../utils/relayFixedSpread';
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

export type NoFeeTokenTagRenderer = (
  address: string,
  chainId: string,
  options?: { testID?: string },
) => ReactNode;

/**
 * Identifies payment tokens whose `(chainId, address)` matches a subsidised
 * source declared by the `confirmationsRelayFixedSpread` LD flag.
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
  renderNoFeeTagForToken: NoFeeTokenTagRenderer;
} {
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const { availableTokens } = useTransactionPayAvailableTokens();

  const matchesSubsidizedSource = useCallback(
    (address: string | undefined, chainId: string | undefined): boolean => {
      if (!address || !chainId) return false;
      return isSubsidizedSource(relayFixedSpread, {
        address,
        chainId: safeFormatChainIdToHex(chainId),
      });
    },
    [relayFixedSpread],
  );

  const isNoFeeToken = useCallback(
    (address: string, chainId: string): boolean => {
      const token = availableTokens.find(
        (t) =>
          t.address.toLowerCase() === address.toLowerCase() &&
          t.chainId?.toLowerCase() === chainId.toLowerCase(),
      );

      if (!token) return false;

      return matchesSubsidizedSource(token.address, token.chainId);
    },
    [availableTokens, matchesSubsidizedSource],
  );

  const noFeeToken = useMemo(() => {
    const eligible = availableTokens.filter(
      (token: AssetType) =>
        !token.disabled &&
        matchesSubsidizedSource(token.address, token.chainId),
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
  }, [availableTokens, excludeToken, matchesSubsidizedSource]);

  const renderNoFeeTag: TokenTagRenderer = useCallback(
    (token: AssetType) => {
      if (!matchesSubsidizedSource(token.address, token.chainId)) {
        return null;
      }
      return <NoFeeTag />;
    },
    [matchesSubsidizedSource],
  );

  const renderNoFeeTagForToken: NoFeeTokenTagRenderer = useCallback(
    (address, chainId, options) =>
      matchesSubsidizedSource(address, chainId) ? (
        <NoFeeTag testID={options?.testID} />
      ) : null,
    [matchesSubsidizedSource],
  );

  return { noFeeToken, isNoFeeToken, renderNoFeeTag, renderNoFeeTagForToken };
}
