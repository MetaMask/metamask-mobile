import { captureException } from '@sentry/react-native';
import {
  getErrorMessage,
  hasProperty,
  Hex,
  isHexString,
  isObject,
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

export const migrationVersion = 113;

// Export for tests
export const MEGAETH_MAINNET_CHAIN_ID = '0x10e6';

/**
 * This migration does:
 * - Adds Infura RPC to MegaETH and set as default if not already present. Otherwise leaves untouched.
 * - Adds Blockscout Explorer URL to list of explorers if not already present.
 *
 * @param versionedState - MetaMask state, exactly
 * what we persist to disk.
 * @returns Updated MetaMask state.
 */
export default function migrate(versionedState: unknown) {
  // Putting env-fetching here for easier testing.
  // Ideally all "infuraProjectId" logic should use a getter.
  const INFURA_KEY = process.env.MM_INFURA_PROJECT_ID;
  const infuraProjectId = INFURA_KEY === 'null' ? '' : INFURA_KEY;

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

    const { networkConfigurationsByChainId } = networkState;

    // Migrate NetworkController:
    // - Merge the MegaETH Mainnet network configuration if user already has it.
    if (hasProperty(networkConfigurationsByChainId, MEGAETH_MAINNET_CHAIN_ID)) {
      const megaethMainnetConfiguration =
        networkConfigurationsByChainId[MEGAETH_MAINNET_CHAIN_ID];
      if (!isValidNetworkConfiguration(megaethMainnetConfiguration)) {
        console.warn(
          `Migration ${migrationVersion}: Invalid MegaETH Mainnet network configuration, skip the migration`,
        );
        return state;
      }

      if (infuraProjectId) {
        const newInfuraURL = `https://megaeth-mainnet.infura.io/v3/${infuraProjectId}`;
        const isInfuraRpcPresent =
          megaethMainnetConfiguration.rpcEndpoints.find(
            (rpc) => rpc.url === newInfuraURL,
          );
        // Avoid RPC duplication if Infura is already present.
        if (!isInfuraRpcPresent) {
          // Add Infura RPC
          megaethMainnetConfiguration.rpcEndpoints.push({
            failoverUrls: [],
            networkClientId: uuidV4(),
            type: 'custom',
            url: newInfuraURL,
          });
          // Set newly added Infura RPC as default RPC.
          megaethMainnetConfiguration.defaultRpcEndpointIndex =
            megaethMainnetConfiguration.rpcEndpoints.length - 1;
        }
      } else {
        captureException(
          new Error(
            `Migration ${migrationVersion}: Infura project ID is not set, skip the MegaETH RPC part of the migration`,
          ),
        );
      }

      const newBlockExplorerUrl = 'https://megaeth.blockscout.com';
      const isBlockExplorerUrlExist =
        megaethMainnetConfiguration.blockExplorerUrls.find(
          (url) => url.includes(newBlockExplorerUrl), // In case of trailing slash
        );
      // Avoid Explorer duplication
      if (!isBlockExplorerUrlExist) {
        // Add Blockscout as default Explorer URL if it was not already present.
        megaethMainnetConfiguration.blockExplorerUrls.push(newBlockExplorerUrl);
        megaethMainnetConfiguration.defaultBlockExplorerUrlIndex =
          megaethMainnetConfiguration.blockExplorerUrls.length - 1;
      }
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
