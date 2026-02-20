import { useMemo } from 'react';
import { Hex, isCaipChainId } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { useRampTokens } from '../../Ramp/hooks/useRampTokens';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../../Ramp/Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../../util/general';

export interface UseTokenBuyabilityResult {
  isBuyable: boolean;
  isLoading: boolean;
}

/**
 * Hook that determines if an token can be bought via ramp services.
 */
export const useTokenBuyability = (token: TokenI): UseTokenBuyabilityResult => {
  const { allTokens, isLoading } = useRampTokens();

  const isBuyable = useMemo(() => {
    if (!allTokens) return false;

    const chainIdInCaip = isCaipChainId(token.chainId)
      ? token.chainId
      : toEvmCaipChainId(token.chainId as Hex);
    const assetId = toAssetId(token.address, chainIdInCaip);

    const matchingToken = allTokens.find((rampsToken) => {
      if (!rampsToken.assetId) return false;

      const parsedTokenAssetId = parseCAIP19AssetId(rampsToken.assetId);
      if (!parsedTokenAssetId) return false;

      if (token.isNative) {
        return (
          rampsToken.chainId === chainIdInCaip &&
          parsedTokenAssetId.assetNamespace === 'slip44'
        );
      }

      return assetId && toLowerCaseEquals(rampsToken.assetId, assetId);
    });
    return matchingToken?.tokenSupported ?? false;
  }, [allTokens, token.isNative, token.chainId, token.address]);

  return { isBuyable, isLoading };
};

export default useTokenBuyability;
