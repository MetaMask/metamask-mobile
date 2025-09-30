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
import { selectERC20TokensByChain } from '../../../../../selectors/tokenListController';
import { TokenListToken } from '@metamask/assets-controllers';

const MAX_TOP_TOKENS = 30;
export const memoizedFetchBridgeTokens = memoize(fetchBridgeTokens);

/**
 * Convert cached tokens from TokenListController to BridgeToken format
 */
const formatCachedTokenListControllerTokens = (
  cachedTokens: Record<string, TokenListToken>,
  chainId: Hex | CaipChainId,
): Record<string, BridgeToken> => {
  const bridgeTokenObj: Record<string, BridgeToken> = {};

  Object.entries(cachedTokens).forEach(([address, token]) => {
    const caipChainId = formatChainIdToCaip(chainId);
    const hexChainId = formatChainIdToHex(chainId);

    // Convert Solana addresses to CAIP format for consistent deduplication
    const tokenAddress = isSolanaChainId(caipChainId)
      ? normalizeToCaipAssetType(token.address, caipChainId)
      : token.address;

    bridgeTokenObj[address] = {
      address: tokenAddress,
      symbol: token.symbol,
      name: token.name,
      image: token.iconUrl || '',
      decimals: token.decimals,
      chainId: isSolanaChainId(caipChainId) ? caipChainId : hexChainId,
      aggregators: token.aggregators,
    };
  });

  return bridgeTokenObj;
};

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

  // Get cached tokens from TokenListController
  const cachedTokensByChain = useSelector(selectERC20TokensByChain);
  const cachedTokensForChain = useMemo(() => {
    if (!chainId || !cachedTokensByChain) return null;

    if (isSolanaChainId(chainId)) {
      return null;
    }

    // Convert to hex chainId if it's a CAIP chainId, as cached tokens use hex chainIds
    const hexChainId = isCaipChainId(chainId)
      ? formatChainIdToHex(chainId)
      : chainId;

    // Type assertion for the cache object which may have chainId keys
    return cachedTokensByChain[hexChainId]?.data || null;
  }, [chainId, cachedTokensByChain]);

  // Check if we have cached tokens to avoid unnecessary API calls
  const hasCachedTokens = Boolean(
    cachedTokensForChain && Object.keys(cachedTokensForChain).length > 0,
  );

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

  // Get the token data - use cached tokens if available, otherwise fetch from bridge API
  const {
    value: bridgeTokens,
    pending: bridgeTokensPending,
    error: bridgeTokensError,
  } = useAsyncResult(async () => {
    if (!chainId || bridgeTokensError) {
      return {};
    }

    // If we have cached tokens, use them instead of fetching from bridge API
    if (hasCachedTokens && cachedTokensForChain) {
      return formatCachedTokenListControllerTokens(
        cachedTokensForChain,
        chainId,
      );
    }

    // Fallback to bridge API if no cached tokens available
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
        aggregators: bridgeAsset.aggregators,
      };
    });

    return bridgeTokenObj;
  }, [chainId, hasCachedTokens, cachedTokensForChain]);

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
