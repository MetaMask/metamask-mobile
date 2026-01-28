import { captureException } from '@sentry/react-native';
import {
  getErrorMessage,
  hasProperty,
  Hex,
  isHexString,
  isObject,
  KnownCaipNamespace,
} from '@metamask/utils';
import { v4 as uuidV4 } from 'uuid';

import { ensureValidState, ValidState } from './util';
import { cloneDeep } from 'lodash';

/**
 * A Copy of the RpcEndpoint type from the network controller,
 * This is used to avoid the dependency on the network controller.
 */
interface RpcEndpoint {
  failoverUrls?: string[];
  name?: string;
  networkClientId: string;
  url: string;
  type: string;
}

/**
 * A Copy of the NetworkConfiguration type from the network controller,
 * This is used to avoid the dependency on the network controller.
 */
interface NetworkConfiguration {
  blockExplorerUrls: string[];
  chainId: Hex;
  defaultBlockExplorerUrlIndex?: number;
  defaultRpcEndpointIndex: number;
  name: string;
  nativeCurrency: string;
  rpcEndpoints: RpcEndpoint[];
}

export const migrationVersion = 111;

export const MEGAETH_TESTNET_V1_CHAIN_ID = '0x18c6'; // 6342

export const MEGAETH_TESTNET_V2_CONFIG: NetworkConfiguration = {
  chainId: '0x18c7' as Hex, // 6343
  name: 'MegaETH Testnet',
  nativeCurrency: 'MegaETH',
  blockExplorerUrls: ['https://megaeth-testnet-v2.blockscout.com'],
  defaultRpcEndpointIndex: 0,
  defaultBlockExplorerUrlIndex: 0,
  rpcEndpoints: [
    {
      failoverUrls: [],
      networkClientId: 'megaeth-testnet-v2',
      type: 'custom',
      url: 'https://carrot.megaeth.com/rpc',
    },
  ],
};

/**
 * This migration does:
 * - Add MegaETH Testnet v2 to the network controller
 * - Update the selected network client id to mainnet if it is the old MegaETH Testnet v1.
 * - Remove the old MegaETH Testnet v1 network configuration.
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
        `Migration ${migrationVersion}: Missing or invalid NetworkController state, skip the migration`,
      );
      return state;
    }

    const { networkConfigurationsByChainId, selectedNetworkClientId } =
      networkState;

    // Migrate NetworkController:
    // - Merge the MegaETH Testnet v2 network configuration if user already has it.
    // - Add the MegaETH Testnet v2 network configuration if user doesn't have it.
    if (
      hasProperty(
        networkConfigurationsByChainId,
        MEGAETH_TESTNET_V2_CONFIG.chainId,
      )
    ) {
      const megaethTestnetV2Configuration =
        networkConfigurationsByChainId[MEGAETH_TESTNET_V2_CONFIG.chainId];
      if (!isValidNetworkConfiguration(megaethTestnetV2Configuration)) {
        console.warn(
          `Migration ${migrationVersion}: Invalid MegaETH Testnet v2 network configuration, skip the migration`,
        );
        return state;
      }

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
          networkClientId: uuidV4(),
          type: 'custom',
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
        MEGAETH_TESTNET_V2_CONFIG.chainId
      ] = MEGAETH_TESTNET_V2_CONFIG;
    }

    // Switch selected network client id to mainnet
    // if the selected network client id is one of the megaeth testnet v1 rpc endpoint network client id.
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

    const networkEnablementState = validateNetworkEnablementController(state);

    // Only perform the NetworkEnablementController migration if the NetworkEnablementController state is valid.
    // Migrate NetworkEnablementController:
    // - Add the MegaETH Testnet v2 network configuration to the enabled network map if it doesn't exist.
    // - Switch to mainnet if the MegaETH Testnet v1 is enabled exclusively.
    if (networkEnablementState === undefined) {
      console.warn(
        `Migration ${migrationVersion}: Missing or invalid NetworkEnablementController state, skip the NetworkEnablementController migration`,
      );
    } else {
      const eip155NetworkMap =
        networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155];

      // Add the MegaETH Testnet v2 network configuration to the enabled network map if it doesn't exist.
      if (!hasProperty(eip155NetworkMap, MEGAETH_TESTNET_V2_CONFIG.chainId)) {
        networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155][
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

      // we force to switch to mainnet when:
      // - MegaETH Testnet v1 is enabled exclusively and MegaETH Testnet v1 is enabled
      if (
        !isAllPopularNetworksEnabled(
          networkEnablementState.enabledNetworkMap,
        ) &&
        isMegaEthTestnetV1Enabled
      ) {
        // force to swtich to mainnet
        networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155][
          '0x1'
        ] = true;
        // if mainnet is enabled, the selectedNetworkClientId should be followed
        networkState.selectedNetworkClientId = 'mainnet';
      }

      // Remove the MegaETH Testnet v1 enablement map if it exists.
      if (isMegaEthTestnetV1EnablementMapExists) {
        delete networkEnablementState.enabledNetworkMap[
          KnownCaipNamespace.Eip155
        ][MEGAETH_TESTNET_V1_CHAIN_ID];
      }
    }

    // Remove the MegaETH Testnet v1 network configuration.
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

    // Return the original state if migration fails to avoid breaking the app
    return versionedState;
  }
}

function validateNetworkController(state: ValidState):
  | {
      networkConfigurationsByChainId: Record<Hex, unknown>;
      selectedNetworkClientId: string;
    }
  | undefined {
  if (!hasProperty(state.engine.backgroundState, 'NetworkController')) {
    // We catch the exception here, as we don't expect the NetworkController state is missing.
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: missing NetworkController`,
      ),
    );
    return undefined;
  }

  const networkState = state.engine.backgroundState.NetworkController;

  // To narrow the type of the networkState to the expected type.
  if (!isValidNetworkControllerState(networkState)) {
    return undefined;
  }

  return networkState;
}

function validateNetworkEnablementController(state: ValidState):
  | {
      enabledNetworkMap: {
        [KnownCaipNamespace.Eip155]: Record<string, boolean>;
      };
    }
  | undefined {
  if (
    !hasProperty(state.engine.backgroundState, 'NetworkEnablementController')
  ) {
    // we don't need to capture exception here, if the NetworkEnablementController state is not present,
    return undefined;
  }

  const networkEnablementState =
    state.engine.backgroundState.NetworkEnablementController;

  // To narrow the type of the networkEnablementState to the expected type.
  if (!isValidNetworkEnablementControllerState(networkEnablementState)) {
    return undefined;
  }

  return networkEnablementState;
}

function isValidNetworkControllerState(value: unknown): value is {
  networkConfigurationsByChainId: Record<Hex, unknown>;
  selectedNetworkClientId: string;
} {
  if (!isObject(value)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: NetworkController state is not an object: '${typeof value}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(value, 'networkConfigurationsByChainId')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
      ),
    );
    return false;
  }

  if (
    !isValidNetworkConfigurationsByChainId(value.networkConfigurationsByChainId)
  ) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: networkConfigurationsByChainId is not a valid Record<Hex, unknown>`,
      ),
    );
    return false;
  }

  if (!hasProperty(value, 'selectedNetworkClientId')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: missing selectedNetworkClientId property`,
      ),
    );
    return false;
  }

  if (typeof value.selectedNetworkClientId !== 'string') {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: selectedNetworkClientId is not a string: '${typeof value.selectedNetworkClientId}'`,
      ),
    );
    return false;
  }

  return true;
}

function isValidNetworkConfigurationsByChainId(
  value: unknown,
): value is Record<Hex, unknown> {
  return (
    isObject(value) &&
    Object.entries(value).every(
      ([chainId]) => typeof chainId === 'string' && isHexString(chainId),
    )
  );
}

function isValidNetworkConfiguration(
  object: unknown,
): object is NetworkConfiguration {
  return (
    isObject(object) &&
    hasProperty(object, 'chainId') &&
    typeof object.chainId === 'string' &&
    isHexString(object.chainId) &&
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
  networkConfigurationsByChainId: Record<Hex, unknown>,
): boolean {
  if (!hasProperty(networkConfigurationsByChainId, chainId)) {
    return false;
  }
  const config = networkConfigurationsByChainId[chainId];
  return (
    isValidNetworkConfiguration(config) &&
    config.rpcEndpoints.some(
      (rpcEndpoint) => rpcEndpoint.networkClientId === networkClientId,
    )
  );
}

function isValidNetworkEnablementControllerState(value: unknown): value is {
  enabledNetworkMap: {
    [KnownCaipNamespace.Eip155]: Record<string, boolean>;
  };
} {
  if (!isObject(value)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: '${typeof value}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(value, 'enabledNetworkMap')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: missing property enabledNetworkMap.`,
      ),
    );
    return false;
  }

  if (!isObject(value.enabledNetworkMap)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap is not an object: ${typeof value.enabledNetworkMap}.`,
      ),
    );
    return false;
  }

  if (!hasProperty(value.enabledNetworkMap, KnownCaipNamespace.Eip155)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap missing property Eip155.`,
      ),
    );
    return false;
  }

  if (
    !isValidEip155NetworkMap(value.enabledNetworkMap[KnownCaipNamespace.Eip155])
  ) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: NetworkEnablementController.enabledNetworkMap[Eip155] is not a valid enabledNetworkMap.`,
      ),
    );
    return false;
  }

  return true;
}

function isValidEip155NetworkMap(
  value: unknown,
): value is Record<string, boolean> {
  return (
    isObject(value) &&
    Object.entries(value).every(
      ([chainId, isEnabled]) =>
        typeof chainId === 'string' && typeof isEnabled === 'boolean',
    )
  );
}

function isAllPopularNetworksEnabled(value: unknown): boolean {
  if (isObject(value)) {
    let enabledCount = 0;
    const values = Object.values(value);
    for (const enabledNetworkMap of values) {
      if (isValidEip155NetworkMap(enabledNetworkMap)) {
        enabledCount += Object.values(enabledNetworkMap).filter(Boolean).length;
      }
      // if there is more than one enabled network,
      // then we can assume that `all popular networks` are enabled.
      if (enabledCount > 1) {
        return true;
      }
    }
  }
  return false;
}
