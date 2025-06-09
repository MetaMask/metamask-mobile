import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { type NetworkConfiguration, RpcEndpointType } from '@metamask/network-controller';
import {
  ChainId,
  BuiltInNetworkName,
  NetworkNickname,
  BUILT_IN_CUSTOM_NETWORKS_RPC,
  NetworksTicker,
  BlockExplorerUrl
} from '@metamask/controller-utils';

import { ensureValidState } from './util';

/**
 * Migration 72: Add 'MegaEth Testnet'
 *
 * This migration add MegaETH Testnet to the network controller
 * as a default Testnet.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 72;

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
      isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId,
      )
    ) {
      // It is possible to get the MegaEth Network configuration by `getDefaultNetworkConfigurationsByChainId()`,
      // But we choose to re-define it here to prevent the need to change this file,
      // when `getDefaultNetworkConfigurationsByChainId()` has some breaking changes in the future.
      const megaethTestnet = BuiltInNetworkName.MegaETHTestnet;
      const megaethTestnetChainId = ChainId[megaethTestnet];
      const megaethTestnetConfiguration: NetworkConfiguration = {
          blockExplorerUrls: [BlockExplorerUrl[megaethTestnet]],
          chainId: megaethTestnetChainId,
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: NetworkNickname[megaethTestnet],
          nativeCurrency: NetworksTicker[megaethTestnet],
          rpcEndpoints: [
            {
              failoverUrls: [],
              networkClientId: megaethTestnet,
              type: RpcEndpointType.Custom,
              url: BUILT_IN_CUSTOM_NETWORKS_RPC.MEGAETH_TESTNET,
            },
          ],
      };

      // Regardless if the network already exists, we will overwrite it with our default MegaETH configuration.
      state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
        megaethTestnetChainId
      ] = megaethTestnetConfiguration;
    }
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 072: Adding MegaETH Testnet failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
