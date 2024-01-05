import { useEffect, useState } from 'react';
import { getTokenDetails } from '../../../../../app/util/address/index';
import { TokenI } from 'app/components/UI/Tokens/types';

function useIsOriginalTokenSymbol(tokens: TokenI[]) {
  const [isOriginalNativeSymbol, setIsOriginalNativeSymbol] = useState<
    { address: string; isOriginal: boolean }[]
  >([]);

  useEffect(() => {
    async function getTokenSymbolForToken(tokensItem: TokenI[]) {
      const result = [];
      for (const token of tokensItem) {
        if (token.address) {
          const originalDetails = await getTokenDetails(token.address);
          result.push({
            address: token.address,
            isOriginal: originalDetails?.symbol === token.symbol,
          });
        }
      }
      setIsOriginalNativeSymbol(result);
      return result;
    }

    getTokenSymbolForToken(tokens);
  }, [tokens]);

  return isOriginalNativeSymbol;
}

export default useIsOriginalTokenSymbol;
