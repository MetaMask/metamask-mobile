import { captureException } from '@sentry/react-native';
import {
  getErrorMessage,
  hasProperty,
  isObject,
  KnownCaipNamespace,
} from '@metamask/utils';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

import { ensureValidState } from './util';
import { cloneDeep } from 'lodash';

export const migrationVersion = 110;

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
 * This migration adds MegaETH Testnet v2 to the network controller
 * as a default Testnet.
 *
 * @param versionedState - MetaMask state, exactly
 * what we persist to disk.
 * @returns Updated MetaMask state.
 */
export default function migrate(versionedState: unknown) {
  const state = cloneDeep(versionedState);

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

    const networkState = state.engine.backgroundState.NetworkController;

    if (!isObject(networkState)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: '${typeof networkState}'`,
        ),
      );
      return state;
    }

    if (!hasProperty(networkState, 'networkConfigurationsByChainId')) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
        ),
      );
      return state;
    }

    if (!isObject(networkState.networkConfigurationsByChainId)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController networkConfigurationsByChainId: '${typeof networkState.networkConfigurationsByChainId}'`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(state.engine.backgroundState, 'NetworkEnablementController')
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state structure: missing required properties`,
        ),
      );
      return state;
    }

    const networkEnablementState =
      state.engine.backgroundState.NetworkEnablementController;

    if (!isObject(networkEnablementState)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state: '${typeof state.engine.backgroundState.NetworkEnablementController}'`,
        ),
      );
      return state;
    }

    if (!hasProperty(networkEnablementState, 'enabledNetworkMap')) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state: missing property enabledNetworkMap.`,
        ),
      );
      return state;
    }

    if (!isObject(networkEnablementState.enabledNetworkMap)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap is not an object: ${typeof networkEnablementState.enabledNetworkMap}.`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(
        networkEnablementState.enabledNetworkMap,
        KnownCaipNamespace.Eip155,
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap missing property Eip155.`,
        ),
      );
      return state;
    }

    if (
      !isObject(
        networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155],
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap[Eip155] is not an object: ${typeof networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155]}.`,
        ),
      );
      return state;
    }

    const { networkConfigurationsByChainId } = networkState;
    const {
      enabledNetworkMap: { [KnownCaipNamespace.Eip155]: eip155NetworkMap },
    } = networkEnablementState;

    const megaethTestnetV1Configuration = networkConfigurationsByChainId[
      MEGAETH_TESTNET_V1_CHAIN_ID
    ] as unknown as NetworkConfiguration;

    // Add the MegaETH Testnet v2 network configuration.
    networkConfigurationsByChainId[MEGAETH_TESTNET_V2_CONFIG.chainId] =
      MEGAETH_TESTNET_V2_CONFIG;

    // Add the MegaETH Testnet v2 network configuration to the enabled network map.
    eip155NetworkMap[MEGAETH_TESTNET_V2_CONFIG.chainId] = false;

    // If the selected network is the MegaETH Testnet v1,
    // then update it to the mainnet
    if (
      hasProperty(networkState, 'selectedNetworkClientId') &&
      typeof networkState.selectedNetworkClientId === 'string' &&
      megaethTestnetV1Configuration &&
      isObject(megaethTestnetV1Configuration) &&
      hasProperty(megaethTestnetV1Configuration, 'rpcEndpoints') &&
      Array.isArray(megaethTestnetV1Configuration.rpcEndpoints) &&
      isObject(eip155NetworkMap) &&
      hasProperty(eip155NetworkMap, MEGAETH_TESTNET_V1_CHAIN_ID)
    ) {
      const isMegaethTestnetV1Enabled =
        hasProperty(eip155NetworkMap, MEGAETH_TESTNET_V1_CHAIN_ID) &&
        eip155NetworkMap[MEGAETH_TESTNET_V1_CHAIN_ID] === true;

      // Edge case in mobile, after reload
      // the selected network client id may fallback to mainnet,
      // but the enablement map is not sync.
      // Hence, we should force to switch to mainnet when:
      // 1. The MegaETH Testnet v1 is enabled or
      // 2. The selected network client id is megaeth testnet v1
      if (
        isMegaethTestnetV1Enabled ||
        megaethTestnetV1Configuration.rpcEndpoints.some(
          (rpcEndpoint) =>
            rpcEndpoint.networkClientId ===
            networkState.selectedNetworkClientId,
        )
      ) {
        networkState.selectedNetworkClientId = 'mainnet';
        // force mainnet to be enabled
        eip155NetworkMap['0x1'] = true;
      }

      // It is safe to remove the MegaETH Testnet v1 network configuration,
      // because we already verify in above condition.
      // If the MegaETH Testnet v1 network configuration is exist, then remove it.
      delete eip155NetworkMap[MEGAETH_TESTNET_V1_CHAIN_ID];
    }

    // If the MegaETH Testnet v1 network configuration exists, then remove it.
    if (networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID]) {
      delete networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID];
    }

    return state;
  } catch (error) {
    console.error(error);
    captureException(
      new Error(`Migration ${migrationVersion}: ${getErrorMessage(error)}`),
    );
  }

  return state;
}
