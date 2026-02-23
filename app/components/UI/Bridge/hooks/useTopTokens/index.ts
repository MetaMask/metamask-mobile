import {
  BridgeClientId,
  fetchBridgeTokens,
  formatAddressToAssetId,
  formatChainIdToCaip,
  formatChainIdToHex,
  isBitcoinChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Hex, CaipChainId, isCaipChainId } from '@metamask/utils';
import { handleFetch, toChecksumHexAddress } from '@metamask/controller-utils';
import { BtcAccountType } from '@metamask/keyring-api';
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
import { selectERC20TokensByChain } from '../../../../../selectors/tokenListController';
import {
  Asset,
  TokenListToken,
  TokenRwaData,
} from '@metamask/assets-controllers';
import packageJSON from '../../../../../../package.json';
import { getTokenIconUrl } from '../../utils';
import { memoize } from 'lodash';

const { version: clientVersion } = packageJSON;
const MAX_TOP_TOKENS = 30;
export const memoizedFetchBridgeTokens = memoize(fetchBridgeTokens);

/**
 * Only needed for BTC
 * @param chainId - The chain ID to get the account type for
 * @returns The account type for the chain ID
 */
const getAccountType = (
  chainId: Hex | CaipChainId,
): Asset['accountType'] | undefined => {
  let accountType: Asset['accountType'] | undefined;

  if (isBitcoinChainId(chainId)) {
    accountType = BtcAccountType.P2wpkh;
  }

  return accountType;
};

/**
 * Convert cached tokens from TokenListController to BridgeToken format
 */
const formatCachedTokenListControllerTokens = (
  cachedTokens: Record<string, TokenListToken>,
  chainId: Hex | CaipChainId,
): Record<string, BridgeToken> => {
  const bridgeTokenObj: Record<string, BridgeToken> = {};

  const caipChainId = formatChainIdToCaip(chainId);
  const hexChainId = formatChainIdToHex(chainId);
  const isNonEnvChain = isNonEvmChainId(caipChainId);

  Object.entries(cachedTokens).forEach(([address, token]) => {
    // Convert non-EVM addresses to CAIP format for consistent deduplication
    const assetId = formatAddressToAssetId(token.address, caipChainId);
    const tokenAddress = isNonEnvChain ? assetId : token.address;

    if (!tokenAddress) {
      throw new Error(
        `Invalid token address: ${token.address} for chain ID: ${chainId}`,
      );
    }

    bridgeTokenObj[address] = {
      address: tokenAddress,
      symbol: token.symbol,
      name: token.name,
      image: getTokenIconUrl(assetId, isNonEnvChain) || token.iconUrl || '',
      decimals: token.decimals,
      aggregators: token.aggregators ?? [],
      chainId: isNonEnvChain ? caipChainId : hexChainId,
      accountType: getAccountType(caipChainId),
      rwaData: token.rwaData,
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
  const { swapsTopAssets, swapsTopAssetsPending } = useMemo(() => {
    if (!chainId) {
      return { swapsTopAssets: null, swapsTopAssetsPending: true };
    }

    // For non-EVM chains, we don't need to fetch top assets from the Swaps API
    if (isCaipChainId(chainId)) {
      return { swapsTopAssets: null, swapsTopAssetsPending: false };
    }

    return {
      swapsTopAssets: swapsChainCache[chainId]?.topAssets || null,
      swapsTopAssetsPending: false,
    };
  }, [chainId, swapsChainCache]);

  // Get cached tokens from TokenListController
  const cachedEvmTokensByChain = useSelector(selectERC20TokensByChain);
  const cachedEvmTokensForChain = useMemo(() => {
    if (!chainId || !cachedEvmTokensByChain) return null;

    if (isNonEvmChainId(chainId)) {
      return null;
    }

    // Convert to hex chainId if it's a CAIP chainId, as cached tokens use hex chainIds
    const hexChainId = isCaipChainId(chainId)
      ? formatChainIdToHex(chainId)
      : chainId;

    // Type assertion for the cache object which may have chainId keys
    return cachedEvmTokensByChain[hexChainId]?.data || null;
  }, [chainId, cachedEvmTokensByChain]);

  // Check if we have cached tokens to avoid unnecessary API calls
  const hasCachedTokens = Boolean(
    cachedEvmTokensForChain && Object.keys(cachedEvmTokensForChain).length > 0,
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
    if (hasCachedTokens && cachedEvmTokensForChain) {
      return formatCachedTokenListControllerTokens(
        cachedEvmTokensForChain,
        chainId,
      );
    }

    // Fallback to bridge API if no cached tokens available (e.g., for non-EVM chains)
    const rawBridgeAssets = await memoizedFetchBridgeTokens(
      chainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_API_BASE_URL,
      clientVersion,
    );

    // Convert from BridgeAsset type to BridgeToken type
    const bridgeTokenObj: Record<string, BridgeToken> = {};
    Object.keys(rawBridgeAssets).forEach((addr) => {
      const bridgeAsset = rawBridgeAssets[addr];

      const caipChainId = formatChainIdToCaip(bridgeAsset.chainId);
      const hexChainId = formatChainIdToHex(bridgeAsset.chainId);

      // Convert non-EVM addresses to CAIP format for consistent deduplication
      const isNonEvmChain = isNonEvmChainId(caipChainId);

      const tokenAddress = isNonEvmChain
        ? bridgeAsset.assetId
        : bridgeAsset.address;

      const bridgeAssetRwaData = (bridgeAsset as { rwaData?: TokenRwaData })
        .rwaData;
      const bridgeAssetAggregators = (bridgeAsset as { aggregators?: string[] })
        .aggregators;

      bridgeTokenObj[addr] = {
        address: tokenAddress,
        symbol: bridgeAsset.symbol,
        name: bridgeAsset.name,
        image: bridgeAsset.iconUrl || bridgeAsset.icon || '',
        decimals: bridgeAsset.decimals,
        aggregators: bridgeAssetAggregators ?? [],
        chainId: isNonEvmChainId(caipChainId) ? caipChainId : hexChainId,
        accountType: getAccountType(caipChainId),
        rwaData: bridgeAssetRwaData,
      };
    });

    return bridgeTokenObj;
  }, [chainId, hasCachedTokens, cachedEvmTokensForChain]);

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
    const addTokenIfNotExists = (
      token: BridgeToken,
      normalizedAddress: string,
    ) => {
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
        const normalizedAddress = isNonEvmChainId(candidateBridgeToken.chainId)
          ? candidateBridgeToken.address // Solana addresses are case-sensitive, TODO but are Bitcoin addresses case-sensitive?
          : candidateBridgeToken.address.toLowerCase(); // EVM addresses are case-insensitive
        addTokenIfNotExists(candidateBridgeToken, normalizedAddress);
      }
    }

    // Then iterate through all bridge tokens to either add to top tokens or remaining tokens
    for (const token of Object.values(bridgeTokens)) {
      const normalizedAddress = isNonEvmChainId(token.chainId)
        ? token.address // Solana addresses are case-sensitive, TODO but are Bitcoin addresses case-sensitive?
        : token.address.toLowerCase(); // EVM addresses are case-insensitive

      addTokenIfNotExists(token, normalizedAddress);
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
