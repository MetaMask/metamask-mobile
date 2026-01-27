import { useMemo } from 'react';
import { Hex, isCaipChainId } from '@metamask/utils';
import { TokenI } from '../../Tokens/types';
import { useRampTokens } from '../../Ramp/hooks/useRampTokens';
import { toAssetId } from '../../Bridge/hooks/useAssetMetadata/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { parseCAIP19AssetId } from '../../Ramp/Aggregator/utils/parseCaip19AssetId';
import { toLowerCaseEquals } from '../../../../util/general';

export interface UseAssetBuyabilityResult {
  isAssetBuyable: boolean;
}

/**
 * Hook that determines if an asset can be bought via ramp services.
 */
export const useAssetBuyability = (asset: TokenI): UseAssetBuyabilityResult => {
  const { allTokens } = useRampTokens();

  const isAssetBuyable = useMemo(() => {
    if (!allTokens) return false;

    const chainIdInCaip = isCaipChainId(asset.chainId)
      ? asset.chainId
      : toEvmCaipChainId(asset.chainId as Hex);
    const assetId = toAssetId(asset.address, chainIdInCaip);

    const matchingToken = allTokens.find((token) => {
      if (!token.assetId) return false;

      const parsedTokenAssetId = parseCAIP19AssetId(token.assetId);
      if (!parsedTokenAssetId) return false;

      if (asset.isNative) {
        return (
          token.chainId === chainIdInCaip &&
          parsedTokenAssetId.assetNamespace === 'slip44'
        );
      }

      return assetId && toLowerCaseEquals(token.assetId, assetId);
    });
    return matchingToken?.tokenSupported ?? false;
  }, [allTokens, asset.isNative, asset.chainId, asset.address]);

  return { isAssetBuyable };
};

export default useAssetBuyability;
