import { createSelector } from 'reselect';
import {
  selectFeaturedNetworks,
  type ConfigRegistryControllerState,
  type RegistryNetworkConfig,
} from '@metamask/config-registry-controller';
import {
  getDefaultConfigRegistryControllerState,
  getNetworksToAddFromFeatured,
  addNetworkFieldsToPopularListShape,
  type PopularListNetworkShape,
} from '../util/config-registry';
import { PopularList } from '../util/networks/customNetworks';
import { selectRemoteFeatureFlags } from './featureFlagController';
import type { StateWithPartialEngine } from './featureFlagController/types';
import { selectEvmNetworkConfigurationsByChainId } from './networkController';
import { KnownCaipNamespace, parseCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';

const DEFAULT_CONFIG_REGISTRY_STATE = getDefaultConfigRegistryControllerState();

/** Feature flag key for config registry API. */
export const CONFIG_REGISTRY_API_ENABLED_FLAG_KEY = 'configRegistryApiEnabled';

/**
 * Gets the Config Registry controller state from engine.backgroundState.
 *
 * @param state - The Redux state (engine.backgroundState)
 * @returns The Config Registry controller state or default
 */
export const getConfigRegistryState = (
  state: StateWithPartialEngine,
): ConfigRegistryControllerState => {
  const controllerState =
    state.engine?.backgroundState?.ConfigRegistryController;

  return controllerState ?? DEFAULT_CONFIG_REGISTRY_STATE;
};

/**
 * Gets all network configurations from Config Registry.
 * Networks are stored in configs.networks keyed by CAIP-2 chain ID.
 *
 * @param state - The Redux state
 * @returns Array of RegistryNetworkConfig from the config registry
 */
export const getConfigRegistryNetworks = createSelector(
  [getConfigRegistryState],
  (configState): RegistryNetworkConfig[] => {
    const { configs } = configState;
    const networks = configs?.networks || {};
    if (!networks || Object.keys(networks).length === 0) {
      return [];
    }
    return Object.values(networks);
  },
);

/**
 * Checks if Config Registry networks are loading.
 *
 * @param state - The Redux state
 * @returns True if networks are being fetched or haven't been fetched yet
 */
export const isConfigRegistryNetworksLoading = createSelector(
  [getConfigRegistryState],
  (configState) => {
    const hasFetched = configState.lastFetched !== null;
    const networks = configState.configs?.networks || {};
    const hasConfigs = Object.keys(networks).length > 0;

    if (hasConfigs) {
      return false;
    }

    return !hasFetched && !hasConfigs;
  },
);

/**
 * Whether the config registry API is enabled via remote feature flag.
 * Uses the key configRegistryApiEnabled.
 *
 * @param state - The Redux state
 * @returns True if configRegistryApiEnabled is enabled, false otherwise
 */
export const getIsConfigRegistryApiEnabled = createSelector(
  [selectRemoteFeatureFlags],
  (remoteFeatureFlags) =>
    Boolean(remoteFeatureFlags?.[CONFIG_REGISTRY_API_ENABLED_FLAG_KEY]),
);

/**
 * List of networks to show in "Additional networks" (PopularList shape).
 * When config registry API is enabled and we have at least one featured network: always returns the dynamic list (networks not already added), even if empty.
 * When flag off, loading, or no featured networks from API: falls back to static PopularList.
 *
 * @param state - The Redux state
 * @returns PopularListNetworkShape[] for CustomNetwork
 */
export const getAdditionalNetworksList = createSelector(
  [
    getConfigRegistryState,
    getIsConfigRegistryApiEnabled,
    isConfigRegistryNetworksLoading,
    selectEvmNetworkConfigurationsByChainId,
  ],
  (
    configState,
    isEnabled,
    loading,
    networkConfigurations,
  ): PopularListNetworkShape[] => {
    if (!isEnabled) {
      return PopularList as PopularListNetworkShape[];
    }
    if (loading) {
      return PopularList as PopularListNetworkShape[];
    }
    // Package selector returns Record<string, RegistryNetworkConfig>; type is complex due to reselect.
    const featuredRecord = selectFeaturedNetworks(configState);
    const featuredList = Object.values(
      featuredRecord as Record<string, RegistryNetworkConfig>,
    );
    const toAdd = getNetworksToAddFromFeatured(
      featuredList,
      networkConfigurations ?? {},
    );
    const mapped = toAdd.map(addNetworkFieldsToPopularListShape);
    // If we have any featured networks from the API, always show the dynamic list (even if empty because all are already added).
    if (featuredList.length > 0) {
      return mapped;
    }
    return PopularList as PopularListNetworkShape[];
  },
);

/**
 * Returns a chain ID to network image source map built from the config
 * registry network image URLs, so networks added by the user also render
 * their registry logo. EVM entries are keyed by both hex and CAIP-2 chain
 * ID, non-EVM entries by CAIP-2 chain ID only. Returns an empty map when
 * the config registry API is disabled, still loading, or has no configs;
 * callers fall back to the static network image lists.
 *
 * @param state - The Redux state
 * @returns Record of chain ID to image source ({ uri }) from the registry
 */
export const getRegistryNetworkImagesByChainId = createSelector(
  [getConfigRegistryNetworks, getIsConfigRegistryApiEnabled],
  (
    networks: RegistryNetworkConfig[],
    isEnabled,
  ): Record<string, { uri: string }> => {
    if (!isEnabled) {
      return {};
    }
    const result: Record<string, { uri: string }> = {};
    for (const network of networks) {
      const imageUrl = network.imageUrl;
      if (
        typeof imageUrl !== 'string' ||
        !imageUrl.toLowerCase().startsWith('https://')
      ) {
        continue;
      }
      result[network.chainId] = { uri: imageUrl };
      if (network.chainId.startsWith(`${KnownCaipNamespace.Eip155}:`)) {
        const { reference } = parseCaipChainId(network.chainId);
        result[toHex(reference)] = { uri: imageUrl };
      }
    }
    return result;
  },
);
