import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';

import { ensureValidState } from './util';

export const migrationVersion = 109;

export const MEGAETH_TESTNET_V1_CHAIN_ID = '0x18c6'; // 6342

export const MEGAETH_TESTNET_V2_CONFIG = {
  chainId: '0x18c7', // 6343
  name: 'MegaETH Testnet',
  nativeCurrency: 'MegaETH',
  blockExplorerUrls: ['https://megaeth-testnet-v2.blockscout.com'],
  defaultRpcEndpointIndex: 0,
  defaultBlockExplorerUrlIndex: 0,
  rpcEndpoints: [
    {
      failoverUrls: [],
      networkClientId: 'megaeth-testnet-v2',
      type: RpcEndpointType.Custom,
      url: 'https://timothy.megaeth.com/rpc',
    },
  ],
};

/**
 * Migration 108: Migrate Social Login Metrics Opt-In to Metrics Enable System
 */
export default function migrate(state: unknown) {
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

    const { networkConfigurationsByChainId } =
      state.engine.backgroundState.NetworkController;

    // Add the MegaETH Testnet v2 network configuration.
    networkConfigurationsByChainId[MEGAETH_TESTNET_V2_CONFIG.chainId] =
      MEGAETH_TESTNET_V2_CONFIG;

    // If the MegaETH Testnet v1 network configuration exists, then remove it.
    if (networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID]) {
      delete networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID];
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to add failoverUrls to SEI network configuration: ${error}`,
      ),
    );
  }

  return state;
}
