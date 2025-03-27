import { BRIDGE_PROD_API_BASE_URL, BridgeClientId, fetchBridgeTokens, formatChainIdToHex } from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import { Hex } from '@metamask/utils';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import { BridgeToken } from '../types';
import { useEffect, useMemo } from 'react';
import Engine from '../../../../core/Engine/Engine';
import { selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { topAssets } from '../../../../reducers/swaps';
interface UseTopTokensProps {
  chainId?: Hex;
}

interface SwapsTopAsset {
  address: Hex;
  symbol: string;
}

export const useTopTokens = ({ chainId }: UseTopTokensProps): { topTokens: BridgeToken[] | undefined, pending: boolean } => {
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const swapsTopAssets: SwapsTopAsset[] = useSelector(topAssets);

  // Get the top assets from the Swaps API
  useEffect(() => {
    (async () => {
      const { SwapsController } = Engine.context;
      try {
        await SwapsController.fetchTopAssetsWithCache({
          networkClientId: selectedNetworkClientId,
        });
      } catch (error: unknown) {
        Logger.error(
          error as Error,
          'Swaps: Error while fetching top assets',
        );
      }
    })();
  }, [selectedNetworkClientId]);

  // Get the token data from the bridge API
  const { value: bridgeTokens, pending } = useAsyncResult(async () => {
    if (!chainId) {
      return {};
    }

    const rawBridgeAssets = await fetchBridgeTokens(
      chainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_PROD_API_BASE_URL,
    );

    // Convert from BridgeAsset to BridgeToken
    const bridgeTokenObj: Record<string, BridgeToken> = {};
    Object.keys(rawBridgeAssets).forEach((key) => {
      const bridgeAsset = rawBridgeAssets[key];

      bridgeTokenObj[key] = {
        address: bridgeAsset.address,
        symbol: bridgeAsset.symbol,
        name: bridgeAsset.name,
        image: bridgeAsset.iconUrl || bridgeAsset.icon,
        decimals: bridgeAsset.decimals,
        chainId: formatChainIdToHex(bridgeAsset.chainId), // TODO handle solana properly
      };
    });

    return bridgeTokenObj;
  }, [chainId]);

  // Merge the top assets from the Swaps API with the token data from the bridge API
  // tokens that are not in the top assets lists are sorted by the Bridge API list
  const topTokens = useMemo(() => {
    if (!bridgeTokens || !swapsTopAssets) {
      return [];
    }

    const top = swapsTopAssets.map((asset) => 
      bridgeTokens[asset.address] || bridgeTokens[toChecksumHexAddress(asset.address)])
    .filter(Boolean);
  
    return top;
  }, [bridgeTokens, swapsTopAssets]);

  return { topTokens, pending };
};
