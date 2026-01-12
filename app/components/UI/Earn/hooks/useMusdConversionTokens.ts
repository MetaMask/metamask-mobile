import { useSelector } from 'react-redux';
import {
  selectMusdConversionCTATokens,
  selectMusdConversionPaymentTokensAllowlist,
  selectMusdConversionPaymentTokensBlocklist,
} from '../selectors/featureFlags';
import {
  isTokenAllowed,
  isTokenInWildcardList,
} from '../utils/wildcardTokenList';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import { useCallback, useMemo } from 'react';
import { TokenI } from '../../Tokens/types';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
} from '../constants/musd';
import { toHex } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';

export const useMusdConversionTokens = () => {
  const musdConversionPaymentTokensAllowlist = useSelector(
    selectMusdConversionPaymentTokensAllowlist,
  );

  const musdConversionPaymentTokensBlocklist = useSelector(
    selectMusdConversionPaymentTokensBlocklist,
  );

  const musdConversionCTATokens = useSelector(selectMusdConversionCTATokens);

  const allTokens = useAccountTokens({ includeNoBalance: false });

  // Filter tokens based on allowlist and blocklist rules.
  // If allowlist is non-empty, token must be in it.
  // If blocklist is non-empty, token must NOT be in it.
  const filterAllowedTokens = useCallback(
    (tokens: AssetType[]) =>
      tokens.filter((token) =>
        isTokenAllowed(
          token.symbol,
          musdConversionPaymentTokensAllowlist,
          musdConversionPaymentTokensBlocklist,
          token.chainId,
        ),
      ),
    [
      musdConversionPaymentTokensAllowlist,
      musdConversionPaymentTokensBlocklist,
    ],
  );

  // Allowed tokens for conversion.
  const conversionTokens = useMemo(
    () => filterAllowedTokens(allTokens),
    [allTokens, filterAllowedTokens],
  );

  const isConversionToken = (token?: AssetType | TokenI) => {
    if (!token) return false;

    return conversionTokens.some(
      (musdToken) =>
        token.address.toLowerCase() === musdToken.address.toLowerCase() &&
        token.chainId === musdToken.chainId,
    );
  };

  const getConversionTokensWithCtas = useCallback(
    (tokens: AssetType[]) =>
      tokens.filter((token) =>
        isTokenInWildcardList(
          token.symbol,
          musdConversionCTATokens,
          token.chainId,
        ),
      ),
    [musdConversionCTATokens],
  );

  // TODO: Temp - We'll move this into the useMusdCtaVisibility hook in a separate iteration.
  const tokensWithCTAs = useMemo(
    () => getConversionTokensWithCtas(conversionTokens),
    [conversionTokens, getConversionTokensWithCtas],
  );

  // TODO: Temp - We'll move this into the useMusdCtaVisibility hook in a separate iteration.
  const isTokenWithCta = (token?: AssetType | TokenI) => {
    if (!token) return false;

    return tokensWithCTAs.some(
      (musdToken) =>
        token.address.toLowerCase() === musdToken.address.toLowerCase() &&
        token.chainId === musdToken.chainId,
    );
  };

  const isMusdSupportedOnChain = (chainId?: string) =>
    chainId
      ? Object.keys(MUSD_TOKEN_ADDRESS_BY_CHAIN).includes(toHex(chainId))
      : false;

  /**
   * Returns the output chain ID for mUSD conversion.
   * If the provided chain supports mUSD, returns that chain ID.
   * Otherwise, falls back to the default chain (mainnet).
   */
  const getMusdOutputChainId = (chainId?: string): Hex =>
    chainId && isMusdSupportedOnChain(chainId)
      ? toHex(chainId)
      : MUSD_CONVERSION_DEFAULT_CHAIN_ID;

  return {
    filterAllowedTokens,
    isConversionToken,
    isTokenWithCta,
    isMusdSupportedOnChain,
    getMusdOutputChainId,
    tokens: conversionTokens,
    tokensWithCTAs,
  };
};
