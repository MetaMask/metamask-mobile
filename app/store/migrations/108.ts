import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

const OLD_CHAIN_ID = '0x18c6';
const NEW_CHAIN_ID = '0x18c7';
const OLD_RPC_URL = 'https://carrot.megaeth.com/rpc';
const NEW_RPC_URL = 'https://timothy.megaeth.com/rpc';
const NETWORK_CLIENT_ID = 'megaeth-testnet';
const migrationVersion = 108;

/**
 * Migration 108: Update MegaETH Testnet Network Configuration
 *
 * This migration updates:
 * - Chain ID from 0x18c6 (6342) to 0x18c7 (6343)
 * - RPC URL from https://carrot.megaeth.com/rpc to https://timothy.megaeth.com/rpc
 * - Moves the configuration from the old chain ID key to the new chain ID key
 * - Updates selectedNetworkClientId if the user was on this network
 */
export default function migrate(state: unknown): unknown {
  try {
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

    // Validate if the NetworkController state exists and has the expected structure.
    if (
      !hasProperty(state, 'engine') ||
      !hasProperty(state.engine, 'backgroundState') ||
      !hasProperty(state.engine.backgroundState, 'NetworkController')
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state structure: missing required properties`,
        ),
      );
      return state;
    }

    if (!isObject(state.engine.backgroundState.NetworkController)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: '${typeof state.engine.backgroundState.NetworkController}'`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(
        state.engine.backgroundState.NetworkController,
        'networkConfigurationsByChainId',
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
        ),
      );
      return state;
    }

    if (
      !isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId,
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController networkConfigurationsByChainId: '${typeof state.engine.backgroundState.NetworkController.networkConfigurationsByChainId}'`,
        ),
      );
      return state;
    }

    const networkConfigsByChainId =
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId;

    // If the old chain ID is not found, no migration needed
    if (!hasProperty(networkConfigsByChainId, OLD_CHAIN_ID)) {
      return state;
    }

    const oldNetworkConfig = networkConfigsByChainId[OLD_CHAIN_ID];

    // Validate the old network configuration
    if (!isObject(oldNetworkConfig)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid MegaETH Testnet network configuration: '${typeof oldNetworkConfig}'`,
        ),
      );
      return state;
    }

    // Create the new network configuration with updated chain ID
    const newNetworkConfig = {
      ...oldNetworkConfig,
      chainId: NEW_CHAIN_ID,
    };

    // Update RPC endpoints if they exist
    if (
      hasProperty(newNetworkConfig, 'rpcEndpoints') &&
      Array.isArray(newNetworkConfig.rpcEndpoints)
    ) {
      const { rpcEndpoints } = newNetworkConfig;

      // Update all RPC endpoints that match the old URL
      rpcEndpoints.forEach((endpoint, index) => {
        if (
          isObject(endpoint) &&
          hasProperty(endpoint, 'url') &&
          typeof endpoint.url === 'string' &&
          endpoint.url === OLD_RPC_URL
        ) {
          rpcEndpoints[index] = {
            ...endpoint,
            url: NEW_RPC_URL,
          };
        }
      });

      // Apply the changes to the network configuration
      newNetworkConfig.rpcEndpoints = rpcEndpoints;
    }

    // Move the configuration to the new chain ID key
    networkConfigsByChainId[NEW_CHAIN_ID] = newNetworkConfig;

    // Delete the old chain ID entry
    delete networkConfigsByChainId[OLD_CHAIN_ID];

    // Ensure the changes are reflected in the state
    state.engine.backgroundState.NetworkController.networkConfigurationsByChainId =
      networkConfigsByChainId;

    // Update selectedNetworkClientId if the user was on this network
    if (
      hasProperty(
        state.engine.backgroundState.NetworkController,
        'selectedNetworkClientId',
      ) &&
      state.engine.backgroundState.NetworkController.selectedNetworkClientId ===
        NETWORK_CLIENT_ID
    ) {
      // The selectedNetworkClientId remains the same (megaeth-testnet)
      // since we're only updating the chain ID and RPC URL, not the network client ID
      // No change needed here
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to update MegaETH Testnet network configuration: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
