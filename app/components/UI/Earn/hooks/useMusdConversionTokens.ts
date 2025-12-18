import { useSelector } from 'react-redux';
import {
  selectMusdConversionCTATokens,
  selectMusdConversionPaymentTokensBlocklist,
} from '../selectors/featureFlags';
import { isTokenInWildcardList } from '../utils/wildcardTokenList';
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
  const musdConversionPaymentTokensBlocklist = useSelector(
    selectMusdConversionPaymentTokensBlocklist,
  );

  const musdConversionCTATokens = useSelector(selectMusdConversionCTATokens);

  const allTokens = useAccountTokens({ includeNoBalance: false });

  // Remove tokens that are blocked from being used for mUSD conversion.
  const filterBlockedTokens = useCallback(
    (tokens: AssetType[]) =>
      tokens.filter(
        (token) =>
          !isTokenInWildcardList(
            token.symbol,
            musdConversionPaymentTokensBlocklist,
            token.chainId,
          ),
      ),
    [musdConversionPaymentTokensBlocklist],
  );

  // Allowed tokens for conversion.
  const conversionTokens = useMemo(
    () => filterBlockedTokens(allTokens),
    [allTokens, filterBlockedTokens],
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
        // TODO: Rename isMusdConversionPaymentTokenBlocked
        isTokenInWildcardList(
          token.symbol,
          musdConversionCTATokens,
          token.chainId,
        ),
      ),
    [musdConversionCTATokens],
  );

  // TODO: Temp - We'll likely want to consolidate this with the useMusdCtaVisibility hook once it's available.
  const tokensWithCTAs = useMemo(
    () => getConversionTokensWithCtas(conversionTokens),
    [conversionTokens, getConversionTokensWithCtas],
  );

  // TODO: Temp - We'll likely want to consolidate this with the useMusdCtaVisibility hook once it's available.
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
    filterBlockedTokens,
    isConversionToken,
    isTokenWithCta,
    isMusdSupportedOnChain,
    getMusdOutputChainId,
    tokens: conversionTokens,
    tokensWithCTAs,
  };
};
