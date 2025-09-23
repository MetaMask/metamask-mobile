import {
  BridgeClientId,
  fetchBridgeTokens,
  formatChainIdToCaip,
  formatChainIdToHex,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Hex, CaipChainId, isCaipChainId } from '@metamask/utils';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import { BridgeToken } from '../../types';
import { useEffect, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import Logger from '../../../../../util/Logger';
import { selectChainCache } from '../../../../../reducers/swaps';
import { SwapsControllerState } from '@metamask/swaps-controller';
import { selectTopAssetsFromFeatureFlags } from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { BRIDGE_API_BASE_URL } from '../../../../../constants/bridge';
import { normalizeToCaipAssetType } from '../../utils';
import { memoize } from 'lodash';

const MAX_TOP_TOKENS = 30;
const memoizedFetchBridgeTokens = memoize(fetchBridgeTokens);

interface UseTopTokensProps {
  chainId?: Hex | CaipChainId;
}

export const useTopTokens = ({
  chainId,
}: UseTopTokensProps): {
  topTokens: BridgeToken[] | undefined;
  remainingTokens: BridgeToken[] | undefined;
  pending: boolean;
} => {
  const swapsChainCache: SwapsControllerState['chainCache'] =
    useSelector(selectChainCache);
  const swapsTopAssets = useMemo(
    () => (chainId ? swapsChainCache[chainId]?.topAssets : null),
    [chainId, swapsChainCache],
  );
  // For non-EVM chains, we don't need to fetch top assets from the Swaps API
  const swapsTopAssetsPending = isCaipChainId(chainId)
    ? false
    : !swapsTopAssets;

  // Get top assets for Solana from Bridge API feature flags for now,
  // Swap API doesn't have top assets for Solana
  const topAssetsFromFeatureFlags = useSelector((state: RootState) =>
    selectTopAssetsFromFeatureFlags(state, chainId),
  );

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
        Logger.error(error as Error, 'Swaps: Error while fetching top assets');
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

    const rawBridgeAssets = await memoizedFetchBridgeTokens(
      chainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_API_BASE_URL,
    );

    // Convert from BridgeAsset type to BridgeToken type
    const bridgeTokenObj: Record<string, BridgeToken> = {};
    Object.keys(rawBridgeAssets).forEach((addr) => {
      const bridgeAsset = rawBridgeAssets[addr];

      const caipChainId = formatChainIdToCaip(bridgeAsset.chainId);
      const hexChainId = formatChainIdToHex(bridgeAsset.chainId);

      // Convert Solana addresses to CAIP format for consistent deduplication
      const tokenAddress = isSolanaChainId(caipChainId)
        ? normalizeToCaipAssetType(bridgeAsset.address, caipChainId)
        : bridgeAsset.address;

      bridgeTokenObj[addr] = {
        address: tokenAddress,
        symbol: bridgeAsset.symbol,
        name: bridgeAsset.name,
        image: bridgeAsset.iconUrl || bridgeAsset.icon || '',
        decimals: bridgeAsset.decimals,
        chainId: isSolanaChainId(caipChainId) ? caipChainId : hexChainId,
      };
    });

    return bridgeTokenObj;
  }, [chainId]);

  // Merge the top assets from the Swaps API with the token data from the bridge API
  const { topTokens, remainingTokens } = useMemo(() => {
    if (!bridgeTokens) {
      return { topTokens: [], remainingTokens: [] };
    }

    const result: BridgeToken[] = [];
    const remainingTokensList: BridgeToken[] = [];
    const addedAddresses = new Set<string>();
    const topAssetAddrs =
      topAssetsFromFeatureFlags ||
      swapsTopAssets?.map((asset) => asset.address) ||
      [];

    // Helper function to add a token if it's not already added and we haven't reached the limit
    const addTokenIfNotExists = (token: BridgeToken) => {
      const normalizedAddress = isSolanaChainId(token.chainId)
        ? token.address // Solana addresses are case-sensitive
        : token.address.toLowerCase(); // EVM addresses are case-insensitive

      if (!addedAddresses.has(normalizedAddress)) {
        addedAddresses.add(normalizedAddress);
        if (result.length < MAX_TOP_TOKENS) {
          result.push(token);
        } else {
          remainingTokensList.push(token);
        }
      }
    };

    // First add top assets from feature flags or swaps
    for (const topAssetAddr of topAssetAddrs) {
      if (result.length >= MAX_TOP_TOKENS) break;

      const candidateBridgeToken =
        bridgeTokens[topAssetAddr] ||
        bridgeTokens[topAssetAddr.toLowerCase()] ||
        bridgeTokens[toChecksumHexAddress(topAssetAddr)];

      if (candidateBridgeToken) {
        addTokenIfNotExists(candidateBridgeToken);
      }
    }

    // Then iterate through all bridge tokens to either add to top tokens or remaining tokens
    for (const token of Object.values(bridgeTokens)) {
      const normalizedAddress = isSolanaChainId(token.chainId)
        ? token.address // Solana addresses are case-sensitive
        : token.address.toLowerCase(); // EVM addresses are case-insensitive

      // Skip if already added to top tokens
      if (addedAddresses.has(normalizedAddress)) {
        continue;
      }

      addTokenIfNotExists(token);
    }

    return {
      topTokens: result,
      remainingTokens: remainingTokensList,
    };
  }, [bridgeTokens, swapsTopAssets, topAssetsFromFeatureFlags]);

  return {
    topTokens,
    remainingTokens,
    pending: chainId ? bridgeTokensPending || swapsTopAssetsPending : false,
  };
};
