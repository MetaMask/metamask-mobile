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

import { ensureValidState, ValidState } from './util';
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

    const networkState = validateNetworkController(state);
    // No Migration should be performed if the NetworkController state is invalid.
    if (networkState === undefined) {
      console.warn(
        `Migration ${migrationVersion}: Invalid NetworkController state, skip the migration`,
      );
      return state;
    }

    const { networkConfigurationsByChainId, selectedNetworkClientId } =
      networkState;

    // Merge the MegaETH Testnet v2 network configuration if user already has it.
    if (
      hasProperty(
        networkConfigurationsByChainId,
        MEGAETH_TESTNET_V2_CONFIG.chainId,
      )
    ) {
      if (
        !isValidNetworkConfiguration(
          networkConfigurationsByChainId[MEGAETH_TESTNET_V2_CONFIG.chainId],
        )
      ) {
        console.warn(
          `Migration ${migrationVersion}: Invalid MegaETH Testnet v2 network configuration, skip the migration`,
        );
        return state;
      }

      const megaethTestnetV2Configuration = networkConfigurationsByChainId[
        MEGAETH_TESTNET_V2_CONFIG.chainId
      ] as NetworkConfiguration;

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
      networkState.networkConfigurationsByChainId[
        MEGAETH_TESTNET_V2_CONFIG.chainId as unknown as `0x${string}`
      ] = MEGAETH_TESTNET_V2_CONFIG as NetworkConfiguration;
    }

    const networkEnablementState = validateNetworkEnablementController(state);

    // Only perform the NetworkEnablementController migration if the NetworkEnablementController state is valid.
    if (networkEnablementState !== undefined) {
      const { eip155NetworkMap } = networkEnablementState;

      // Add the MegaETH Testnet v2 network configuration to the enabled network map if it doesn't exist.
      if (!hasProperty(eip155NetworkMap, MEGAETH_TESTNET_V2_CONFIG.chainId)) {
        networkEnablementState.eip155NetworkMap[
          MEGAETH_TESTNET_V2_CONFIG.chainId
        ] = false;
      }

      const isMegaEthTestnetV1EnablementMapExists = hasProperty(
        eip155NetworkMap,
        MEGAETH_TESTNET_V1_CHAIN_ID,
      );

      const isMegaEthTestnetV1Enabled =
        isMegaEthTestnetV1EnablementMapExists &&
        eip155NetworkMap[MEGAETH_TESTNET_V1_CHAIN_ID] === true;

      // Edge case in mobile, after reload
      // the selected network client id may fallback to mainnet,
      // but the enablement map is not sync.
      // Hence, we should force to switch to mainnet when:
      // 1. The MegaETH Testnet v1 is enabled or
      // 2. The selected network client id is megaeth testnet v1 or
      // 3. The selected network client id is the same as one of the megaeth testnet v1 rpc endpoint network client id
      if (
        isMegaEthTestnetV1Enabled ||
        selectedNetworkClientId === 'megaeth-testnet' ||
        isNetworkClientIdExists(
          MEGAETH_TESTNET_V1_CHAIN_ID,
          selectedNetworkClientId,
          networkConfigurationsByChainId,
        )
      ) {
        // force mainnet to be enabled
        networkState.selectedNetworkClientId = 'mainnet';
        networkEnablementState.eip155NetworkMap['0x1'] = true;
      }

      // Remove the MegaETH Testnet v1 enablement map if it exists.
      if (isMegaEthTestnetV1EnablementMapExists) {
        delete networkEnablementState.eip155NetworkMap[
          MEGAETH_TESTNET_V1_CHAIN_ID
        ];
      }
    } else {
      console.warn(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state, skip the NetworkEnablementController migration`,
      );
      // If the NetworkEnablementController state is invalid,
      // we force to switch to mainnet if the selected network client id is one of the megaeth testnet v1 rpc endpoint network client id.
      if (
        selectedNetworkClientId === 'megaeth-testnet' ||
        isNetworkClientIdExists(
          MEGAETH_TESTNET_V1_CHAIN_ID,
          selectedNetworkClientId,
          networkConfigurationsByChainId,
        )
      ) {
        networkState.selectedNetworkClientId = 'mainnet';
      }
    }

    // It is safe to remove the MegaETH Testnet v1 network configuration,
    // if MegaETH Testnet v1 is enabled, then it will be switched to mainnet.
    // if MegaETH Testnet v1 is not enabled, then there is no concern to remove it.
    if (
      hasProperty(networkConfigurationsByChainId, MEGAETH_TESTNET_V1_CHAIN_ID)
    ) {
      delete networkState.networkConfigurationsByChainId[
        MEGAETH_TESTNET_V1_CHAIN_ID
      ];
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

function validateNetworkController(state: ValidState):
  | {
      networkConfigurationsByChainId: Record<string, NetworkConfiguration>;
      selectedNetworkClientId: string;
    }
  | undefined {
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
    return undefined;
  }

  const networkState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: '${typeof networkState}'`,
      ),
    );
    return undefined;
  }

  if (!hasProperty(networkState, 'networkConfigurationsByChainId')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
      ),
    );
    return undefined;
  }

  if (!isObject(networkState.networkConfigurationsByChainId)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController networkConfigurationsByChainId: '${typeof networkState.networkConfigurationsByChainId}'`,
      ),
    );
    return undefined;
  }

  if (!hasProperty(networkState, 'selectedNetworkClientId')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: missing selectedNetworkClientId property`,
      ),
    );
    return undefined;
  }

  if (typeof networkState.selectedNetworkClientId !== 'string') {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: '${typeof networkState.selectedNetworkClientId}'`,
      ),
    );
    return undefined;
  }

  return networkState as {
    networkConfigurationsByChainId: Record<string, NetworkConfiguration>;
    selectedNetworkClientId: string;
  };
}

function validateNetworkEnablementController(state: ValidState):
  | {
      eip155NetworkMap: Record<string, boolean>;
    }
  | undefined {
  // Validate if the NetworkEnablementController state exists and has the expected structure.
  if (
    !hasProperty(state, 'engine') ||
    !hasProperty(state.engine, 'backgroundState') ||
    !hasProperty(state.engine.backgroundState, 'NetworkEnablementController')
  ) {
    // we don't need to capture exception here, if the NetworkEnablementController state is not present,
    return undefined;
  }

  const networkEnablementState =
    state.engine.backgroundState.NetworkEnablementController;

  if (!isObject(networkEnablementState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: '${typeof networkEnablementState}'`,
      ),
    );
    return undefined;
  }

  if (!hasProperty(networkEnablementState, 'enabledNetworkMap')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: missing property enabledNetworkMap.`,
      ),
    );
    return undefined;
  }

  if (!isObject(networkEnablementState.enabledNetworkMap)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap is not an object: ${typeof networkEnablementState.enabledNetworkMap}.`,
      ),
    );
    return undefined;
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
    return undefined;
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
    return undefined;
  }

  return {
    eip155NetworkMap: networkEnablementState.enabledNetworkMap[
      KnownCaipNamespace.Eip155
    ] as Record<string, boolean>,
  };
}

function isValidNetworkConfiguration(object: unknown): boolean {
  return (
    isObject(object) &&
    hasProperty(object, 'chainId') &&
    typeof object.chainId === 'string' &&
    hasProperty(object, 'rpcEndpoints') &&
    Array.isArray(object.rpcEndpoints) &&
    object.rpcEndpoints.every(isValidRpcEndpoint) &&
    hasProperty(object, 'name') &&
    typeof object.name === 'string' &&
    hasProperty(object, 'nativeCurrency') &&
    typeof object.nativeCurrency === 'string' &&
    hasProperty(object, 'blockExplorerUrls') &&
    Array.isArray(object.blockExplorerUrls) &&
    object.blockExplorerUrls.every((url) => typeof url === 'string') &&
    hasProperty(object, 'defaultRpcEndpointIndex') &&
    typeof object.defaultRpcEndpointIndex === 'number' &&
    (!hasProperty(object, 'defaultBlockExplorerUrlIndex') ||
      (hasProperty(object, 'defaultBlockExplorerUrlIndex') &&
        typeof object.defaultBlockExplorerUrlIndex === 'number'))
  );
}

function isValidRpcEndpoint(object: unknown): boolean {
  return (
    isObject(object) &&
    hasProperty(object, 'networkClientId') &&
    typeof object.networkClientId === 'string' &&
    hasProperty(object, 'url') &&
    typeof object.url === 'string'
  );
}

function isNetworkClientIdExists(
  chainId: string,
  networkClientId: string,
  networkConfigurationsByChainId: Record<string, NetworkConfiguration>,
): boolean {
  if (
    !hasProperty(networkConfigurationsByChainId, chainId) ||
    !isValidNetworkConfiguration(networkConfigurationsByChainId[chainId])
  ) {
    return false;
  }
  return networkConfigurationsByChainId[chainId].rpcEndpoints.some(
    (rpcEndpoint) => rpcEndpoint.networkClientId === networkClientId,
  );
}
