import { hasProperty, isObject, parseCaipChainId } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

/**
 * Migration 096: Migrate tokenNetworkFilter to enabledNetworkMap
 *
 * This migration migrates tokenNetworkFilter from PreferencesController to
 * NetworkOrderController.enabledNetworkMap to support multichain network filtering.
 *
 * Changes:
 * - Migrate existing tokenNetworkFilter data to enabledNetworkMap format
 * - Include both EVM and non-EVM networks in the enabled network map
 * - Handle cases where tokenNetworkFilter doesn't exist (no migration needed)
 */
export default function migrate(state: unknown): unknown {
  const migrationVersion = 96;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // Check if we have the required state structure
    if (
      !hasProperty(state.engine, 'backgroundState') ||
      !isObject(state.engine.backgroundState)
    ) {
      return state;
    }

    const backgroundState = state.engine.backgroundState;

    // Validate NetworkOrderController exists
    if (
      !hasProperty(backgroundState, 'NetworkOrderController') ||
      !isObject(backgroundState.NetworkOrderController)
    ) {
      return state;
    }

    // Validate PreferencesController exists
    if (
      !hasProperty(backgroundState, 'PreferencesController') ||
      !isObject(backgroundState.PreferencesController)
    ) {
      return state;
    }

    const preferencesController = backgroundState.PreferencesController;

    // Validate preferences object exists
    if (
      !hasProperty(preferencesController, 'preferences') ||
      !isObject(preferencesController.preferences)
    ) {
      return state;
    }

    const preferences = preferencesController.preferences;

    // Check if tokenNetworkFilter exists (optional for this migration)
    if (!hasProperty(preferences, 'tokenNetworkFilter')) {
      return state;
    }

    const tokenNetworkFilter = preferences.tokenNetworkFilter;

    // Validate tokenNetworkFilter
    if (!isObject(tokenNetworkFilter)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: tokenNetworkFilter is type '${typeof tokenNetworkFilter}', expected object.`,
        ),
      );
      return state;
    }

    if (Object.keys(tokenNetworkFilter).length === 0) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: tokenNetworkFilter is empty, expected at least one network configuration.`,
        ),
      );
      return state;
    }

    // Validate MultichainNetworkController exists
    if (
      !hasProperty(backgroundState, 'MultichainNetworkController') ||
      !isObject(backgroundState.MultichainNetworkController)
    ) {
      return state;
    }

    const multichainNetworkController =
      backgroundState.MultichainNetworkController;

    // Extract selectedMultichainNetworkChainId
    const { selectedMultichainNetworkChainId } = multichainNetworkController;

    // Validate selectedMultichainNetworkChainId
    if (
      !selectedMultichainNetworkChainId ||
      typeof selectedMultichainNetworkChainId !== 'string'
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: selectedMultichainNetworkChainId is type '${typeof selectedMultichainNetworkChainId}', expected string.`,
        ),
      );
      return state;
    }

    // Create enabledNetworkMap by merging both EVM and non-EVM networks
    const evmEnabledNetworkMap = createEvmEnabledNetworkMap(
      tokenNetworkFilter as Record<string, boolean>,
    );
    const nonEvmEnabledNetworkMap = createNonEvmEnabledNetworkMap(
      selectedMultichainNetworkChainId,
    );

    // Merge both maps and assign to NetworkOrderController
    const networkOrderController = backgroundState.NetworkOrderController;
    networkOrderController.enabledNetworkMap = {
      ...evmEnabledNetworkMap,
      ...nonEvmEnabledNetworkMap,
    };

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to migrate tokenNetworkFilter to enabledNetworkMap: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}

/**
 * Creates enabledNetworkMap from tokenNetworkFilter for EVM networks
 *
 * @param tokenNetworkFilter - The token network filter object
 * @returns The enabled network map for EVM networks
 */
function createEvmEnabledNetworkMap(
  tokenNetworkFilter: Record<string, boolean>,
): Record<string, Record<string, boolean>> {
  const caipChainId = formatChainIdToCaip(Object.keys(tokenNetworkFilter)[0]);
  const { namespace: chainNamespace } = parseCaipChainId(caipChainId);

  const enabledNetworkMap: Record<string, Record<string, boolean>> = {
    [chainNamespace]: {
      ...tokenNetworkFilter,
    },
  };

  return enabledNetworkMap;
}

/**
 * Creates enabledNetworkMap for non-EVM networks
 *
 * @param selectedMultichainNetworkChainId - The selected multichain network chain ID
 * @returns The enabled network map for non-EVM networks
 */
function createNonEvmEnabledNetworkMap(
  selectedMultichainNetworkChainId: string,
): Record<string, Record<string, boolean>> {
  const caipChainId = formatChainIdToCaip(selectedMultichainNetworkChainId);
  const { namespace: chainNamespace } = parseCaipChainId(caipChainId);

  const enabledNetworkMap = {
    [chainNamespace]: {
      [selectedMultichainNetworkChainId]: true,
    },
  };

  return enabledNetworkMap;
}
