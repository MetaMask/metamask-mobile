import { BRIDGE_PROD_API_BASE_URL, BridgeClientId, fetchBridgeTokens, formatChainIdToHex } from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import { Hex } from '@metamask/utils';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import { BridgeToken } from '../types';
import { useEffect, useMemo, useRef } from 'react';
import Engine from '../../../../core/Engine/Engine';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { selectChainCache } from '../../../../reducers/swaps';
import { SwapsControllerState } from '@metamask/swaps-controller';
interface UseTopTokensProps {
  chainId?: Hex;
}

export const useTopTokens = ({ chainId }: UseTopTokensProps): { topTokens: BridgeToken[] | undefined, pending: boolean } => {
  const swapsChainCache: SwapsControllerState['chainCache'] = useSelector(selectChainCache);
  const swapsTopAssets = useMemo(
    () => (chainId ? swapsChainCache[chainId]?.topAssets : null),
    [chainId, swapsChainCache],
  );
  const networkConfigurationsByChainId = useSelector(selectEvmNetworkConfigurationsByChainId);

  const cachedBridgeTokens = useRef<Record<string, Record<string, BridgeToken>>>({});

  // Get the top assets from the Swaps API
  useEffect(() => {
    (async () => {
      const { SwapsController } = Engine.context;
      try {
        if (chainId) {
          const networkConfiguration = networkConfigurationsByChainId[chainId];
          const defaultRpcEndpointIndex = networkConfiguration.defaultRpcEndpointIndex;
          const networkClientId = networkConfiguration.rpcEndpoints[defaultRpcEndpointIndex].networkClientId;
          
          // Maintains an internal cache, will fetch if past internal threshold
          await SwapsController.fetchTopAssetsWithCache({
            networkClientId,
          });
        }
      } catch (error: unknown) {
        Logger.error(
          error as Error,
          'Swaps: Error while fetching top assets',
        );
      }
    })();
  }, [chainId, networkConfigurationsByChainId]);

  // Get the token data from the bridge API
  const { value: bridgeTokens, pending } = useAsyncResult(async () => {
    if (!chainId) {
      return {};
    }

    if (cachedBridgeTokens.current[chainId]) {
      return cachedBridgeTokens.current[chainId];
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

    cachedBridgeTokens.current = {
      ...cachedBridgeTokens.current,
      [chainId]: bridgeTokenObj,
    };

    return bridgeTokenObj;
  }, [chainId]);

  // Merge the top assets from the Swaps API with the token data from the bridge API
  const topTokens = useMemo(() => {
    if (!bridgeTokens || !swapsTopAssets) {
      return [];
    }

    const top = swapsTopAssets.map((asset) => {
      const candidateBridgeToken = bridgeTokens[asset.address.toLowerCase()] 
        || bridgeTokens[toChecksumHexAddress(asset.address)];
      
      return candidateBridgeToken;
    })
    .filter(Boolean) as BridgeToken[];

    return top;
  }, [bridgeTokens, swapsTopAssets]);

  return { topTokens, pending };
};
