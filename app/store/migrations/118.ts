import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { NETWORK_CHAIN_ID } from '../../util/networks/customNetworks';
import { NetworkConfiguration } from '@metamask/network-controller';

export const migrationVersion = 118;

/**
 * Migration 118: Update MegaETH Mainnet name from 'MegaEth' to 'MegaETH'
 *
 * This migration updates:
 * - the MegaETH Mainnet network name from `MegaEth` to `MegaETH`.
 * - the MegaETH Mainnet RPC endpoint names from `MegaEth` to `MegaETH`.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // Validate if the NetworkController state exists and has the expected structure.
    if (
      !(
        hasProperty(state, 'engine') &&
        hasProperty(state.engine, 'backgroundState') &&
        hasProperty(state.engine.backgroundState, 'NetworkController') &&
        isObject(state.engine.backgroundState.NetworkController) &&
        hasProperty(
          state.engine.backgroundState.NetworkController,
          'networkConfigurationsByChainId',
        ) &&
        isObject(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId,
        )
      )
    ) {
      return state;
    }

    const megaEthChainId = NETWORK_CHAIN_ID.MEGAETH_MAINNET;
    const networkConfigsByChainId =
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId;

    // If the chain ID is not found, skip it.
    if (!hasProperty(networkConfigsByChainId, megaEthChainId)) {
      return state;
    }

    const networkConfig = networkConfigsByChainId[
      megaEthChainId
    ] as NetworkConfiguration;

    // Update the network name if it matches the old name
    if (
      isObject(networkConfig) &&
      hasProperty(networkConfig, 'name') &&
      networkConfig.name === 'MegaEth'
    ) {
      networkConfig.name = 'MegaETH';
    }

    // Update RPC endpoint names if they match the old name
    if (
      hasProperty(networkConfig, 'rpcEndpoints') &&
      Array.isArray(networkConfig.rpcEndpoints)
    ) {
      networkConfig.rpcEndpoints.forEach((endpoint) => {
        if (endpoint.name === 'MegaEth') {
          endpoint.name = 'MegaETH';
        }
      });
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to update MegaETH network name: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
