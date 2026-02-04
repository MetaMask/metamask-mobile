import { useSelector } from 'react-redux';
import {
  selectMusdConversionMinAssetBalanceRequired,
  selectMusdConversionPaymentTokensAllowlist,
  selectMusdConversionPaymentTokensBlocklist,
} from '../selectors/featureFlags';
import { isTokenAllowed } from '../utils/wildcardTokenList';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import { useCallback, useMemo } from 'react';
import { TokenI } from '../../Tokens/types';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { toHex } from '@metamask/controller-utils';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';

/**
 * The source of truth for the tokens that are eligible for mUSD conversion.
 *
 * @returns Object containing:
 * - filterAllowedTokens(tokens: AssetType[]): AssetType[] - Filters tokens based on allowlist and blocklist rules.
 * - isConversionToken(token: AssetType | TokenI): boolean - Checks if a token is eligible for mUSD conversion.
 * - isMusdSupportedOnChain(chainId: Hex): boolean - Checks if mUSD is supported on a given chain.
 * - hasConvertibleTokensByChainId(chainId: Hex): boolean - Checks if there are convertible tokens on a given chain.
 * - tokens: AssetType[] - The tokens that are eligible for mUSD conversion.
 */
export const useMusdConversionTokens = () => {
  const musdConversionPaymentTokensAllowlist = useSelector(
    selectMusdConversionPaymentTokensAllowlist,
  );

  const musdConversionPaymentTokensBlocklist = useSelector(
    selectMusdConversionPaymentTokensBlocklist,
  );

  const musdConversionMinAssetBalanceRequired = useSelector(
    selectMusdConversionMinAssetBalanceRequired,
  );

  const allTokens = useAccountTokens({ includeNoBalance: false });

  const filterTokensWithMinBalance = useCallback(
    (token: AssetType) => {
      const fiatBalance = token?.fiat?.balance;

      // Can't use truthiness checks here, because `0` is valid when the threshold is '0'.
      if (fiatBalance === undefined || fiatBalance === null) {
        return false;
      }

      const fiatBalanceBn = new BigNumber(fiatBalance);
      if (!fiatBalanceBn.isFinite()) {
        return false;
      }

      return fiatBalanceBn.isGreaterThanOrEqualTo(
        musdConversionMinAssetBalanceRequired,
      );
    },
    [musdConversionMinAssetBalanceRequired],
  );

  const filterTokensWithAllowlistAndBlocklist = useCallback(
    (token: AssetType) =>
      isTokenAllowed(
        token.symbol,
        musdConversionPaymentTokensAllowlist,
        musdConversionPaymentTokensBlocklist,
        token.chainId,
      ),
    [
      musdConversionPaymentTokensAllowlist,
      musdConversionPaymentTokensBlocklist,
    ],
  );

  // Filter tokens based on allowlist and blocklist rules.
  // If allowlist is non-empty, token must be in it.
  // If blocklist is non-empty, token must NOT be in it.
  // Token must have minimum balance to be eligible for conversion.
  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]) =>
      tokens
        .filter(filterTokensWithAllowlistAndBlocklist)
        .filter(filterTokensWithMinBalance),
    [filterTokensWithAllowlistAndBlocklist, filterTokensWithMinBalance],
  );

  // Allowed tokens for conversion.
  const conversionTokens = useMemo(
    () => filterAllowedTokens(allTokens),
    [allTokens, filterAllowedTokens],
  );

  const hasConvertibleTokensByChainId = useCallback(
    (chainId: Hex) =>
      conversionTokens.some((token) => token.chainId === chainId),
    [conversionTokens],
  );

  const isConversionToken = (token?: AssetType | TokenI) => {
    if (!token) return false;

    return conversionTokens.some(
      (musdToken) =>
        token.address.toLowerCase() === musdToken.address.toLowerCase() &&
        token.chainId === musdToken.chainId,
    );
  };

  const isMusdSupportedOnChain = (chainId?: string) =>
    chainId
      ? Object.keys(MUSD_TOKEN_ADDRESS_BY_CHAIN).includes(toHex(chainId))
      : false;

  return {
    filterAllowedTokens,
    isConversionToken,
    isMusdSupportedOnChain,
    hasConvertibleTokensByChainId,
    tokens: conversionTokens,
  };
};
