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

    if (!hasProperty(networkState, 'selectedNetworkClientId')) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: missing selectedNetworkClientId property`,
        ),
      );
      return state;
    }

    if (typeof networkState.selectedNetworkClientId !== 'string') {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: '${typeof networkState.selectedNetworkClientId}'`,
        ),
      );
      return state;
    }

    const networkEnablementState =
      state.engine.backgroundState.NetworkEnablementController;

    if (!isObject(networkEnablementState)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkEnablementController state: '${typeof networkEnablementState}'`,
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

    // Merge the MegaETH Testnet v2 network configuration if user already has it.
    if (
      hasProperty(
        networkConfigurationsByChainId,
        MEGAETH_TESTNET_V2_CONFIG.chainId,
      )
    ) {
      const megaethTestnetV2Configuration = networkConfigurationsByChainId[
        MEGAETH_TESTNET_V2_CONFIG.chainId
      ] as unknown as NetworkConfiguration;

      // override the name and native currency of the MegaETH Testnet v2 network configuration.
      megaethTestnetV2Configuration.name = MEGAETH_TESTNET_V2_CONFIG.name;
      megaethTestnetV2Configuration.nativeCurrency =
        MEGAETH_TESTNET_V2_CONFIG.nativeCurrency;

      const isEndpointExist = megaethTestnetV2Configuration.rpcEndpoints.find(
        (rpcEndpoint) =>
          rpcEndpoint.url === MEGAETH_TESTNET_V2_CONFIG.rpcEndpoints[0].url,
      );
      if (!isEndpointExist) {
        megaethTestnetV2Configuration.rpcEndpoints.push({
          failoverUrls: [],
          networkClientId:
            MEGAETH_TESTNET_V2_CONFIG.rpcEndpoints[0].networkClientId,
          type: RpcEndpointType.Custom,
          url: MEGAETH_TESTNET_V2_CONFIG.rpcEndpoints[0].url,
        });
        megaethTestnetV2Configuration.defaultRpcEndpointIndex =
          megaethTestnetV2Configuration.rpcEndpoints.length - 1;
      }

      const isBlockExplorerUrlExist =
        megaethTestnetV2Configuration.blockExplorerUrls.find(
          (url) => url === MEGAETH_TESTNET_V2_CONFIG.blockExplorerUrls[0],
        );
      if (!isBlockExplorerUrlExist) {
        megaethTestnetV2Configuration.blockExplorerUrls.push(
          MEGAETH_TESTNET_V2_CONFIG.blockExplorerUrls[0],
        );
        megaethTestnetV2Configuration.defaultBlockExplorerUrlIndex =
          megaethTestnetV2Configuration.blockExplorerUrls.length - 1;
      }
    } else {
      // Add the MegaETH Testnet v2 network configuration if user doesn't have it.
      (networkConfigurationsByChainId as Record<string, NetworkConfiguration>)[
        MEGAETH_TESTNET_V2_CONFIG.chainId
      ] = MEGAETH_TESTNET_V2_CONFIG as NetworkConfiguration;
    }

    // Add the MegaETH Testnet v2 network configuration to the enabled network map if it doesn't exist.
    if (!hasProperty(eip155NetworkMap, MEGAETH_TESTNET_V2_CONFIG.chainId)) {
      (eip155NetworkMap as Record<string, boolean>)[
        MEGAETH_TESTNET_V2_CONFIG.chainId
      ] = false;
    }

    const isValidMegaEthTestnetV1Configuration =
      hasProperty(
        networkConfigurationsByChainId,
        MEGAETH_TESTNET_V1_CHAIN_ID,
      ) &&
      isObject(networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID]);

    const isValidMegaEthTestnetV1RpcEndpoints =
      hasProperty(
        networkConfigurationsByChainId,
        MEGAETH_TESTNET_V1_CHAIN_ID,
      ) &&
      isObject(networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID]) &&
      hasProperty(
        networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID],
        'rpcEndpoints',
      ) &&
      Array.isArray(
        networkConfigurationsByChainId[MEGAETH_TESTNET_V1_CHAIN_ID]
          .rpcEndpoints,
      );

    const isMegaEthTestnetV1EnablementMapExists = hasProperty(
      eip155NetworkMap,
      MEGAETH_TESTNET_V1_CHAIN_ID,
    );

    const isMegaEthTestnetV1Enabled =
      isMegaEthTestnetV1EnablementMapExists &&
      eip155NetworkMap[MEGAETH_TESTNET_V1_CHAIN_ID] === true;

    // cast to NetworkConfiguration to access the rpcEndpoints property easier.
    const megaEthTestnetV1Configuration = networkConfigurationsByChainId[
      MEGAETH_TESTNET_V1_CHAIN_ID
    ] as unknown as NetworkConfiguration;

    // Edge case in mobile, after reload
    // the selected network client id may fallback to mainnet,
    // but the enablement map is not sync.
    // Hence, we should force to switch to mainnet when:
    // 1. The MegaETH Testnet v1 is enabled or
    // 2. The selected network client id is megaeth testnet v1 or
    // 3. The selected network client id is the same as one of the megaeth testnet v1 rpc endpoint network client id
    if (
      isMegaEthTestnetV1Enabled ||
      networkState.selectedNetworkClientId === 'megaeth-testnet' ||
      (isValidMegaEthTestnetV1Configuration &&
        isValidMegaEthTestnetV1RpcEndpoints &&
        megaEthTestnetV1Configuration.rpcEndpoints.some(
          (rpcEndpoint) =>
            rpcEndpoint.networkClientId ===
            networkState.selectedNetworkClientId,
        ))
    ) {
      networkState.selectedNetworkClientId = 'mainnet';
      // force mainnet to be enabled
      eip155NetworkMap['0x1'] = true;
    }

    // It is safe to remove the MegaETH Testnet v1 network configuration,
    // if MegaETH Testnet v1 is enabled, then it will be switched to mainnet.
    // if MegaETH Testnet v1 is not enabled, then there is no concern to remove it.
    if (isMegaEthTestnetV1EnablementMapExists) {
      delete eip155NetworkMap[MEGAETH_TESTNET_V1_CHAIN_ID];
    }

    // It is safe to remove the MegaETH Testnet v1 network configuration,
    if (isValidMegaEthTestnetV1Configuration) {
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
