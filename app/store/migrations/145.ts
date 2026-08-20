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

interface RpcEndpoint {
  failoverUrls?: string[];
  name?: string;
  networkClientId: string;
  url: string;
  type: string;
}

interface NetworkConfiguration {
  blockExplorerUrls: string[];
  chainId: Hex;
  defaultBlockExplorerUrlIndex?: number;
  defaultRpcEndpointIndex: number;
  name: string;
  nativeCurrency: string;
  rpcEndpoints: RpcEndpoint[];
}

export const migrationVersion = 145;

export const ARC_CHAIN_ID: Hex = '0x13b2';

/**
 * This migration adds the Arc network to the user's NetworkController state
 * if it is not already present.
 *
 * @param versionedState - MetaMask state, exactly what we persist to disk.
 * @returns Updated MetaMask state.
 */
export default function migrate(versionedState: unknown) {
  const INFURA_KEY = process.env.MM_INFURA_PROJECT_ID;
  const infuraProjectId = INFURA_KEY === 'null' ? '' : INFURA_KEY;

  const state = cloneDeep(versionedState);
  try {
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

    const networkState = validateNetworkController(state);
    if (networkState === undefined) {
      console.warn(
        `Migration ${migrationVersion}: Missing or invalid NetworkController state, skip the migration`,
      );
      return state;
    }

    const { networkConfigurationsByChainId } = networkState;

    if (hasProperty(networkConfigurationsByChainId, ARC_CHAIN_ID)) {
      return state;
    }

    if (!infuraProjectId) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Infura project ID is not set, skip the migration`,
        ),
      );
      return state;
    }

    const arcConfiguration: NetworkConfiguration = {
      chainId: ARC_CHAIN_ID,
      name: 'Arc',
      nativeCurrency: 'USDC',
      blockExplorerUrls: ['https://explorer.arc.io/'],
      defaultBlockExplorerUrlIndex: 0,
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [
        {
          networkClientId: uuidV4(),
          type: 'custom',
          url: `https://arc-mainnet.infura.io/v3/${infuraProjectId}`,
          failoverUrls: [],
        },
      ],
    };

    (networkConfigurationsByChainId as Record<string, unknown>)[ARC_CHAIN_ID] =
      arcConfiguration;

    const networkEnablementState = validateNetworkEnablementController(state);
    if (networkEnablementState === undefined) {
      console.warn(
        `Migration ${migrationVersion}: Missing or invalid NetworkEnablementController state, skip the NetworkEnablementController migration`,
      );
    } else {
      const eip155NetworkMap =
        networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155];

      if (!hasProperty(eip155NetworkMap, ARC_CHAIN_ID)) {
        const enabledCount =
          Object.values(eip155NetworkMap).filter(Boolean).length;
        // Mirror the NetworkEnablementController._onAddNetwork behaviour:
        // if the user is in "popular networks" mode (>1 enabled), auto-enable
        // Arc; otherwise add it as disabled so single-network users are not
        // disrupted.
        Object.assign(eip155NetworkMap, { [ARC_CHAIN_ID]: enabledCount > 1 });
      }
    }

    return state;
  } catch (error) {
    console.error(error);
    captureException(
      new Error(`Migration ${migrationVersion}: ${getErrorMessage(error)}`),
    );

    return versionedState;
  }
}

function validateNetworkController(state: ValidState):
  | {
      networkConfigurationsByChainId: Record<Hex, unknown>;
    }
  | undefined {
  if (!hasProperty(state.engine.backgroundState, 'NetworkController')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkController state: missing NetworkController`,
      ),
    );
    return undefined;
  }

  const networkState = state.engine.backgroundState.NetworkController;

  if (!isValidNetworkControllerState(networkState)) {
    return undefined;
  }

  return networkState;
}

function isValidNetworkControllerState(value: unknown): value is {
  networkConfigurationsByChainId: Record<Hex, unknown>;
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
    return undefined;
  }

  const networkEnablementState =
    state.engine.backgroundState.NetworkEnablementController;

  if (!isValidNetworkEnablementControllerState(networkEnablementState)) {
    return undefined;
  }

  return networkEnablementState;
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
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: enabledNetworkMap is not an object: ${typeof value.enabledNetworkMap}.`,
      ),
    );
    return false;
  }

  if (!hasProperty(value.enabledNetworkMap, KnownCaipNamespace.Eip155)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: enabledNetworkMap missing property eip155.`,
      ),
    );
    return false;
  }

  if (
    !isValidEip155NetworkMap(value.enabledNetworkMap[KnownCaipNamespace.Eip155])
  ) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid NetworkEnablementController state: enabledNetworkMap[eip155] is not valid.`,
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
