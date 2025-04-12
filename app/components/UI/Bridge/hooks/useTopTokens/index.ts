import { BRIDGE_PROD_API_BASE_URL, BridgeClientId, fetchBridgeTokens, formatChainIdToCaip, formatChainIdToHex, isSolanaChainId } from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Hex, CaipChainId, isCaipChainId } from '@metamask/utils';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import { BridgeToken } from '../../types';
import { useEffect, useMemo, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import Logger from '../../../../../util/Logger';
import { selectChainCache } from '../../../../../reducers/swaps';
import { SwapsControllerState } from '@metamask/swaps-controller';
import { selectTopAssetsFromFeatureFlags } from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { SolScope } from '@metamask/keyring-api';
interface UseTopTokensProps {
  chainId?: Hex | CaipChainId;
}

export const useTopTokens = ({ chainId }: UseTopTokensProps): { topTokens: BridgeToken[] | undefined, pending: boolean } => {
  const swapsChainCache: SwapsControllerState['chainCache'] = useSelector(selectChainCache);
  const swapsTopAssets = useMemo(
    () => (chainId ? swapsChainCache[chainId]?.topAssets : null),
    [chainId, swapsChainCache],
  );
  // For non-EVM chains, we don't need to fetch top assets from the Swaps API
  const swapsTopAssetsPending = isCaipChainId(chainId) ? false : !swapsTopAssets;

  // Get top assets for Solana from Bridge API feature flags for now,
  // Swap API doesn't have top assets for Solana
  const topAssetsFromFeatureFlags = useSelector(
    (state: RootState) => selectTopAssetsFromFeatureFlags(state, chainId),
  );

  const cachedBridgeTokens = useRef<Record<string, Record<string, BridgeToken>>>({});

  // Get the top assets from the Swaps API
  useEffect(() => {
    (async () => {
      const { SwapsController } = Engine.context;
      try {
        if (chainId && !isCaipChainId(chainId)) {
          // Maintains an internal cache, will fetch if past internal threshold
          await SwapsController.fetchTopAssetsWithCache({
            chainId,
          });
        }
      } catch (error: unknown) {
        Logger.error(
          error as Error,
          'Swaps: Error while fetching top assets',
        );
      }
    })();
  }, [chainId]);

  // Get the token data from the bridge API
  const {
    value: bridgeTokens,
    pending: bridgeTokensPending,
    error: bridgeTokensError,
  } = useAsyncResult(async () => {
    if (!chainId || bridgeTokensError) {
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

    // Convert from BridgeAsset type to BridgeToken type
    const bridgeTokenObj: Record<string, BridgeToken> = {};
    Object.keys(rawBridgeAssets).forEach((addr) => {
      const bridgeAsset = rawBridgeAssets[addr];

      const caipChainId = formatChainIdToCaip(bridgeAsset.chainId);
      const hexChainId = formatChainIdToHex(bridgeAsset.chainId);

      bridgeTokenObj[addr] = {
        address: bridgeAsset.address,
        symbol: bridgeAsset.symbol,
        name: bridgeAsset.name,
        image: bridgeAsset.iconUrl || bridgeAsset.icon,
        decimals: bridgeAsset.decimals,
        chainId: caipChainId === SolScope.Mainnet ? caipChainId : hexChainId,
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
    const swapsTopAssetsAddrs = swapsTopAssets?.map((asset) => asset.address);

    // Prioritize top assets from feature flags
    const topAssetAddrs = topAssetsFromFeatureFlags || swapsTopAssetsAddrs;

    if (!bridgeTokens || !topAssetAddrs) {
      return [];
    }

    const top = topAssetAddrs.map((topAssetAddr) => {
      // Note that Solana addresses are CASE-SENSITIVE, EVM addresses are NOT
      const candidateBridgeToken =
        bridgeTokens[topAssetAddr]
        || bridgeTokens[topAssetAddr.toLowerCase()]
        || bridgeTokens[toChecksumHexAddress(topAssetAddr)];

      return candidateBridgeToken;
    })
    .filter(Boolean) as BridgeToken[];

    // Create a Set of normalized addresses for O(1) lookups
    const topTokenAddresses = new Set(
      top.map(token =>
        isSolanaChainId(token.chainId)
          ? token.address // Solana addresses are case-sensitive
          : token.address.toLowerCase() // EVM addresses are case-insensitive
      )
    );

    // Create a new object with only non-top tokens
    const nonTopBridgeTokens: Record<string, BridgeToken> = {};
    for (const [address, token] of Object.entries(bridgeTokens)) {
      const normalizedAddress = isSolanaChainId(token.chainId)
        ? address // Solana addresses are case-sensitive
        : address.toLowerCase(); // EVM addresses are case-insensitive

      if (!topTokenAddresses.has(normalizedAddress)) {
        nonTopBridgeTokens[address] = token;
      }
    }

    // Append unique bridge tokens to the top tokens
    Object.values(nonTopBridgeTokens).forEach((token) => {
      top.push(token);
    });

    return top;
  }, [bridgeTokens, swapsTopAssets, topAssetsFromFeatureFlags]);

  return { topTokens, pending: chainId ? (bridgeTokensPending || swapsTopAssetsPending) : false };
};