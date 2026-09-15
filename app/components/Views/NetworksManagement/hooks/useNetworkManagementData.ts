import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectAdditionalNetworksBlacklistFeatureFlag } from '../../../../selectors/featureFlagController/networkBlacklist';
import { isTestNet, getNetworkImageSource } from '../../../../util/networks';
import {
  getFilteredPopularNetworks,
  PopularList,
} from '../../../../util/networks/customNetworks';
import { SECTION_KEYS } from '../NetworksManagementView.constants';
import {
  NetworkManagementItem,
  NetworkManagementSection,
} from '../NetworksManagementView.types';

interface UseNetworkManagementDataParams {
  searchQuery: string;
}

interface UseNetworkManagementDataResult {
  sections: NetworkManagementSection[];
}

/**
 * Builds a NetworkManagementItem from an added NetworkConfiguration.
 */
const buildAddedNetworkItem = (
  chainId: Hex,
  config: NetworkConfiguration,
  popularChainIds: Set<string>,
): NetworkManagementItem => {
  const rpcEndpoints = config.rpcEndpoints ?? [];
  const defaultRpcEndpoint = rpcEndpoints[config.defaultRpcEndpointIndex];

  return {
    chainId,
    name: config.name,
    isTestNet: isTestNet(chainId),
    imageSource: getNetworkImageSource({ chainId }),
    rpcUrl: defaultRpcEndpoint?.url,
    hasMultipleRpcs: rpcEndpoints.length > 1,
    isPopular: popularChainIds.has(chainId),
    isAdded: true,
  };
};

/**
 * Builds a NetworkManagementItem from a popular network that is NOT yet added.
 */
const buildAvailableNetworkItem = (
  popular: ReturnType<typeof getFilteredPopularNetworks>[number],
): NetworkManagementItem => ({
  chainId: popular.chainId as Hex,
  name: popular.nickname,
  isTestNet: false,
  imageSource:
    popular.rpcPrefs?.imageSource ??
    getNetworkImageSource({ chainId: popular.chainId }),
  rpcUrl: popular.rpcUrl,
  hasMultipleRpcs: false,
  isPopular: true,
  isAdded: false,
});

/**
 * Filters items by search query (case-insensitive name match).
 */
const filterBySearch = (
  items: NetworkManagementItem[],
  query: string,
): NetworkManagementItem[] => {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(lowerQuery));
};

/**
 * Hook that aggregates network data for the Networks Management screen.
 *
 * Reads the user's added networks from NetworkController, classifies them
 * as mainnet or testnet, and computes which popular networks are still
 * available to add. Available networks respect the additional networks
 * blacklist feature flag. Supports search filtering across all sections.
 */
export const useNetworkManagementData = ({
  searchQuery,
}: UseNetworkManagementDataParams): UseNetworkManagementDataResult => {
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const blacklistedChainIds = useSelector(
    selectAdditionalNetworksBlacklistFeatureFlag,
  );

  const popularChainIds = useMemo(
    () => new Set(PopularList.map((p) => p.chainId)),
    [],
  );

  const filteredPopularNetworks = useMemo(
    () => getFilteredPopularNetworks(blacklistedChainIds, PopularList),
    [blacklistedChainIds],
  );

  const addedNetworks = useMemo(() => {
    if (!networkConfigurationsByChainId) return [];
    return Object.entries(networkConfigurationsByChainId).map(
      ([chainId, config]) =>
        buildAddedNetworkItem(chainId as Hex, config, popularChainIds),
    );
  }, [networkConfigurationsByChainId, popularChainIds]);

  const availableNetworks = useMemo(
    () =>
      filteredPopularNetworks
        .filter(
          (popular) =>
            !networkConfigurationsByChainId?.[popular.chainId as Hex],
        )
        .map(buildAvailableNetworkItem),
    [filteredPopularNetworks, networkConfigurationsByChainId],
  );

  const sections = useMemo(() => {
    const addedMainnets = filterBySearch(
      addedNetworks.filter((n) => !n.isTestNet),
      searchQuery,
    );
    const addedTestnets = filterBySearch(
      addedNetworks.filter((n) => n.isTestNet),
      searchQuery,
    );
    const filteredAvailable = filterBySearch(availableNetworks, searchQuery);

    const result: NetworkManagementSection[] = [];

    if (addedMainnets.length > 0) {
      result.push({
        key: SECTION_KEYS.ADDED_MAINNETS,
        data: addedMainnets,
      });
    }

    if (addedTestnets.length > 0) {
      result.push({
        key: SECTION_KEYS.ADDED_TESTNETS,
        data: addedTestnets,
      });
    }

    if (filteredAvailable.length > 0) {
      result.push({
        key: SECTION_KEYS.AVAILABLE_NETWORKS,
        data: filteredAvailable,
      });
    }

    return result;
  }, [addedNetworks, availableNetworks, searchQuery]);

  return { sections };
};
