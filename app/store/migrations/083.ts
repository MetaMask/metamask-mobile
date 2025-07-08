import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import {
  type NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import {
  ChainId,
  BuiltInNetworkName,
  NetworkNickname,
  BUILT_IN_CUSTOM_NETWORKS_RPC,
  NetworksTicker,
  BlockExplorerUrl,
} from '@metamask/controller-utils';

import { ensureValidState } from './util';

/**
 * Migration 83: Add 'Monad Testnet'
 *
 * This migration add Monad Testnet to the network controller
 * as a default Testnet.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 83;

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
      // It is possible to get the Monad Network configuration by `getDefaultNetworkConfigurationsByChainId()`,
      // But we choose to re-define it here to prevent the need to change this file,
      // when `getDefaultNetworkConfigurationsByChainId()` has some breaking changes in the future.
      const networkClientId = BuiltInNetworkName.MonadTestnet;
      const chainId = ChainId[networkClientId];
      const monadTestnetConfiguration: NetworkConfiguration = {
        blockExplorerUrls: [BlockExplorerUrl[networkClientId]],
        chainId,
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: NetworkNickname[networkClientId],
        nativeCurrency: NetworksTicker[networkClientId],
        rpcEndpoints: [
          {
            failoverUrls: [],
            networkClientId,
            type: RpcEndpointType.Custom,
            url: BUILT_IN_CUSTOM_NETWORKS_RPC['monad-testnet'],
          },
        ],
      };

      // Regardless if the network already exists, we will overwrite it with the default configuration.
      state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
        chainId
      ] = monadTestnetConfiguration;
    } else {
      captureException(
        new Error(
          `Migration ${migrationVersion}: NetworkController or networkConfigurationsByChainId not found in state`,
        ),
      );
    }
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Adding Monad Testnet failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
