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
      return [];
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
