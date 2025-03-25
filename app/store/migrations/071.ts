
import { captureException } from '@sentry/react-native';
import { getDefaultNetworkControllerState } from '@metamask/network-controller';
import { hasProperty, isObject } from '@metamask/utils';
import { ChainId, BuiltInNetworkName } from '@metamask/controller-utils';
import { ensureValidState } from './util';

/**
 * Migration 71: Add 'MegaEth Testnet'
 *
 * This migration add MegaETH Testnet to the network controller
 * as a default Testnet.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 71;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      hasProperty(state, 'engine') &&
      hasProperty(state.engine, 'backgroundState') &&
      hasProperty(state.engine.backgroundState, 'NetworkController') &&
      isObject(state.engine.backgroundState.NetworkController) &&
      isObject(state.engine.backgroundState.NetworkController.networkConfigurationsByChainId)
    ) {
      const megaethTestnetChainId = ChainId[BuiltInNetworkName.MegaETHTestnet];

      const defaultState = getDefaultNetworkControllerState([megaethTestnetChainId]);

      if (!hasProperty(defaultState.networkConfigurationsByChainId, megaethTestnetChainId)) {
        throw new Error(
          `MegaETH Testnet configuration not found from getDefaultNetworkControllerState()`,
        );
      }

      // Regardness if the network already exists, we will overwrite it with our default MegaETH configuration.
      state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
        megaethTestnetChainId
      ] = defaultState.networkConfigurationsByChainId[megaethTestnetChainId];
    }
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 071: Adding MegaETH Testnet failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
