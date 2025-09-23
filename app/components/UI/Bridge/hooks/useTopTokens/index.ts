import {
  BridgeClientId,
  fetchBridgeTokens,
  formatChainIdToCaip,
  formatChainIdToHex,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { Hex, CaipChainId, isCaipChainId } from '@metamask/utils';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import { BridgeToken } from '../../types';
import { useEffect, useMemo, useState, useCallback } from 'react';
import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import Logger from '../../../../../util/Logger';
import { selectChainCache } from '../../../../../reducers/swaps';
import { SwapsControllerState } from '@metamask/swaps-controller';
import { selectTopAssetsFromFeatureFlags } from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { BRIDGE_API_BASE_URL } from '../../../../../constants/bridge';
import { normalizeToCaipAssetType } from '../../utils';
import { bridgeTokensCacheManager } from '../../utils/BridgeTokensCacheManager';

const MAX_TOP_TOKENS = 30;

interface UseTopTokensProps {
  chainId?: Hex | CaipChainId;
}

export const useTopTokens = ({
  chainId,
}: UseTopTokensProps): {
  topTokens: BridgeToken[] | undefined;
  remainingTokens: BridgeToken[] | undefined;
  pending: boolean;
  error: Error | null;
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

  // Get the token data from the bridge API with caching
  const [bridgeTokens, setBridgeTokens] = useState<
    Record<string, BridgeToken> | undefined
  >(undefined);
  const [bridgeTokensPending, setBridgeTokensPending] = useState(true);
  const [bridgeTokensError, setBridgeTokensError] = useState<Error | null>(
    null,
  );

  const fetchAndProcessBridgeTokens = useCallback(
    async (chainId: Hex | CaipChainId) => {
      try {
        const rawBridgeAssets = await fetchBridgeTokens(
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
      } catch (error) {
        Logger.error(
          error as Error,
          `useTopTokens: Error fetching bridge tokens for chainId ${chainId}`,
        );
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    if (!chainId) {
      setBridgeTokens(undefined);
      setBridgeTokensPending(false);
      setBridgeTokensError(null);
      return;
    }

    // Immediately clear previous tokens when chainId changes to prevent showing stale data
    setBridgeTokens(undefined);
    setBridgeTokensPending(true);
    setBridgeTokensError(null);

    let cancelled = false;

    const loadBridgeTokens = async () => {
      try {
        // 1. Try to get cached data first for instant loading
        const cachedTokens = await bridgeTokensCacheManager.getCachedTokens(
          chainId,
        );
        if (cachedTokens && !cancelled) {
          setBridgeTokens(cachedTokens);
          setBridgeTokensPending(false);
          // Continue to fetch fresh data in background for next time
        }

        // 2. Fetch fresh data (either because no cache or for background refresh)
        const freshTokens = await fetchAndProcessBridgeTokens(chainId);

        if (!cancelled) {
          setBridgeTokens(freshTokens);
          setBridgeTokensPending(false);

          // 3. Update cache with fresh data
          await bridgeTokensCacheManager.setCachedTokens(chainId, freshTokens);
        }
      } catch (error) {
        if (!cancelled) {
          setBridgeTokensError(error as Error);
          setBridgeTokensPending(false);
          Logger.error(
            error as Error,
            `useTopTokens: Failed to load bridge tokens for chainId ${chainId}`,
          );
        }
      }
    };

    loadBridgeTokens();

    return () => {
      cancelled = true;
    };
  }, [chainId, fetchAndProcessBridgeTokens]);

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
    error: bridgeTokensError,
  };
};
