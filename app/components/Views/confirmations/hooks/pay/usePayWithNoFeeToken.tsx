import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import {
  isSubsidizedRoute,
  isSubsidizedSource,
} from '../../utils/relayFixedSpread';
import { hasTransactionType } from '../../utils/transaction';
import { safeFormatChainIdToHex } from '../../../../UI/Card/util/safeFormatChainIdToHex';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
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

/** The Money Account vault token; withdrawals always convert FROM this. */
const MONAD_MUSD_TARGET = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD,
};

const isMonadMusd = (address: string, chainId: string) =>
  chainId?.toLowerCase() === MONAD_MUSD_TARGET.chainId.toLowerCase() &&
  address?.toLowerCase() === MONAD_MUSD_TARGET.address.toLowerCase();

/**
 * Identifies payment tokens that incur no Relay fixed-spread fee.
 *
 * For deposits (and perps/predict) the picker token is the source, so a token
 * is no-fee when it is a subsidised source. For a Money Account withdrawal the
 * picker token is instead the destination and the source is always Monad mUSD,
 * so the match is directional: a subsidised route FROM Monad mUSD INTO the
 * token, or Monad mUSD itself (same-token routes are omitted from the flag).
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
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const { availableTokens } = useTransactionPayAvailableTokens();
  const transactionMeta = useTransactionMetadataRequest();
  const isMoneyWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);

  const matchesNoFee = useCallback(
    (address: string | undefined, chainId: string | undefined): boolean => {
      if (!address || !chainId) return false;
      const hexChainId = safeFormatChainIdToHex(chainId);

      if (isMoneyWithdraw) {
        return (
          isMonadMusd(address, hexChainId) ||
          isSubsidizedRoute(relayFixedSpread, MONAD_MUSD_TARGET, {
            address,
            chainId: hexChainId,
          })
        );
      }

      return isSubsidizedSource(relayFixedSpread, {
        address,
        chainId: hexChainId,
      });
    },
    [relayFixedSpread, isMoneyWithdraw],
  );

  const isNoFeeToken = useCallback(
    (address: string, chainId: string): boolean => {
      const token = availableTokens.find(
        (t) =>
          t.address.toLowerCase() === address.toLowerCase() &&
          t.chainId?.toLowerCase() === chainId.toLowerCase(),
      );

      if (!token) return false;

      return matchesNoFee(token.address, token.chainId);
    },
    [availableTokens, matchesNoFee],
  );

  const noFeeToken = useMemo(() => {
    const eligible = availableTokens.filter(
      (token: AssetType) =>
        !token.disabled && matchesNoFee(token.address, token.chainId),
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
  }, [availableTokens, excludeToken, matchesNoFee]);

  const renderNoFeeTag: TokenTagRenderer = useCallback(
    (token: AssetType) => {
      if (!matchesNoFee(token.address, token.chainId)) {
        return null;
      }
      return <NoFeeTag />;
    },
    [matchesNoFee],
  );

  return { noFeeToken, isNoFeeToken, renderNoFeeTag };
}
