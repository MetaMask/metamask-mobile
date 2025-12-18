import { useSelector } from 'react-redux';
import { selectMusdConversionPaymentTokensAllowlist } from '../selectors/featureFlags';
import { isMusdConversionPaymentToken } from '../utils/musd';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import { useCallback, useMemo } from 'react';
import { TokenI } from '../../Tokens/types';

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

  return {
    tokenFilter,
    isConversionToken,
    tokens: conversionTokens,
  };
};
