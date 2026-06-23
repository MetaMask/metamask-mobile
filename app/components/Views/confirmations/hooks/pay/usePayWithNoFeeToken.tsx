import React, { ReactNode, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import {
  isSubsidizedRoute,
  isSubsidizedSource,
  RouteEndpoint,
} from '../../utils/relayFixedSpread';
import { safeFormatChainIdToHex } from '../../../../UI/Card/util/safeFormatChainIdToHex';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
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
 * Flags subsidised ("no fee") tokens from the `confirmations_relay_fixed_spread`
 * flag, directionally: deposits match the relay source, withdrawals match an
 * exact source→target route (no tag when the source is unknown pre-quote).
 *
 * `excludeToken` skips the already-shown preferred token, returning the next
 * eligible no-fee token instead.
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
  const transactionMeta = useTransactionMetadataRequest();
  const requiredTokens = useTransactionPayRequiredTokens();
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);

  const withdrawSource: RouteEndpoint | undefined = useMemo(() => {
    if (!isWithdraw) return undefined;
    const source = requiredTokens?.find((token) => !token.allowUnderMinimum);
    if (!source) return undefined;
    return {
      address: source.address,
      chainId: safeFormatChainIdToHex(source.chainId),
    };
  }, [isWithdraw, requiredTokens]);

  const matchesSubsidizedSource = useCallback(
    (address: string | undefined, chainId: string | undefined): boolean => {
      if (!address || !chainId) return false;

      const candidate = {
        address,
        chainId: safeFormatChainIdToHex(chainId),
      };

      if (isWithdraw) {
        return withdrawSource
          ? isSubsidizedRoute(relayFixedSpread, withdrawSource, candidate)
          : false;
      }

      return isSubsidizedSource(relayFixedSpread, candidate);
    },
    [isWithdraw, relayFixedSpread, withdrawSource],
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
