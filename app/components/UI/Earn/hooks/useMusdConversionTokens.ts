import { useSelector } from 'react-redux';
import { selectMusdConversionPaymentTokensAllowlist } from '../selectors/featureFlags';
import { isMusdConversionPaymentToken } from '../utils/musd';
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

  const allTokens = useAccountTokens({ includeNoBalance: false });

  const tokenFilter = useCallback(
    (tokens: AssetType[]) =>
      tokens.filter((token) =>
        isMusdConversionPaymentToken(
          token.address,
          musdConversionPaymentTokensAllowlist,
          token.chainId,
        ),
      ),
    [musdConversionPaymentTokensAllowlist],
  );

  const conversionTokens = useMemo(
    () => tokenFilter(allTokens),
    [allTokens, tokenFilter],
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
    tokenFilter,
    isConversionToken,
    isMusdSupportedOnChain,
    getMusdOutputChainId,
    tokens: conversionTokens,
  };
};
