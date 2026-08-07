import { captureException } from '@sentry/react-native';
import {
  getErrorMessage,
  hasProperty,
  Hex,
  isHexString,
  isObject,
  KnownCaipNamespace,
} from '@metamask/utils';

import { ensureValidState, ValidState } from './util';
import { cloneDeep } from 'lodash';
import { ARC_CHAIN_ID } from './145';

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

export const migrationVersion = 149;

/**
 * Migration 145 added the Arc network to every user's NetworkController state
 * ahead of schedule (it was meant for a mid-June release; Arc now ships
 * mid-September instead). Migrations are append-only and run sequentially, so
 * 145 can't be removed or skipped for users who already applied it.
 *
 * This migration undoes 145's effect, but only for users whose Arc
 * configuration is *exactly* what 145 would have written unattended. If the
 * user edited it (renamed it, changed the RPC/failover URLs, added another
 * endpoint, etc.) or added Arc manually, that configuration is left alone -
 * we can only safely infer "this was the auto-add from 145" when the shape
 * matches byte for byte.
 *
 * @param versionedState - MetaMask state, exactly what we persist to disk.
 * @returns Updated MetaMask state.
 */
export default function migrate(versionedState: unknown) {
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

    const { networkConfigurationsByChainId, selectedNetworkClientId } =
      networkState;

    if (!hasProperty(networkConfigurationsByChainId, ARC_CHAIN_ID)) {
      return state;
    }

    const arcConfiguration = networkConfigurationsByChainId[ARC_CHAIN_ID];

    if (!isDefaultArcConfiguration(arcConfiguration)) {
      // The user customized this entry (or added it manually themselves);
      // leave it as-is.
      return state;
    }

    const arcNetworkClientId = arcConfiguration.rpcEndpoints[0].networkClientId;

    delete networkConfigurationsByChainId[ARC_CHAIN_ID];

    if (selectedNetworkClientId === arcNetworkClientId) {
      networkState.selectedNetworkClientId = 'mainnet';
    }

    const networkEnablementState = validateNetworkEnablementController(state);
    if (networkEnablementState === undefined) {
      console.warn(
        `Migration ${migrationVersion}: Missing or invalid NetworkEnablementController state, skip the NetworkEnablementController migration`,
      );
    } else {
      const eip155NetworkMap =
        networkEnablementState.enabledNetworkMap[KnownCaipNamespace.Eip155];

      if (hasProperty(eip155NetworkMap, ARC_CHAIN_ID)) {
        delete eip155NetworkMap[ARC_CHAIN_ID];
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

/**
 * Checks whether the given Arc network configuration is exactly what
 * migration 145 would have written unattended: a single custom RPC endpoint
 * pointing at the private, not-yet-public `arc-mainnet.infura.io` endpoint
 * for this build, with no failover URLs and default display settings.
 */
function isDefaultArcConfiguration(
  value: unknown,
): value is NetworkConfiguration & {
  rpcEndpoints: [RpcEndpoint];
} {
  const INFURA_KEY = process.env.MM_INFURA_PROJECT_ID;
  const infuraProjectId = INFURA_KEY === 'null' ? '' : INFURA_KEY;

  // Migration 145 never writes an Arc entry without an Infura project ID, so
  // there is nothing of ours to recognize (and therefore nothing to revert).
  if (!infuraProjectId) {
    return false;
  }

  if (!isObject(value)) {
    return false;
  }

  const expectedUrl = `https://arc-mainnet.infura.io/v3/${infuraProjectId}`;

  return (
    value.chainId === ARC_CHAIN_ID &&
    value.name === 'Arc' &&
    value.nativeCurrency === 'USDC' &&
    Array.isArray(value.blockExplorerUrls) &&
    value.blockExplorerUrls.length === 1 &&
    value.blockExplorerUrls[0] === 'https://explorer.arc.io/' &&
    value.defaultBlockExplorerUrlIndex === 0 &&
    value.defaultRpcEndpointIndex === 0 &&
    Array.isArray(value.rpcEndpoints) &&
    value.rpcEndpoints.length === 1 &&
    isDefaultArcRpcEndpoint(value.rpcEndpoints[0], expectedUrl)
  );
}

function isDefaultArcRpcEndpoint(
  value: unknown,
  expectedUrl: string,
): value is RpcEndpoint {
  return (
    isObject(value) &&
    value.type === 'custom' &&
    value.url === expectedUrl &&
    typeof value.networkClientId === 'string' &&
    Array.isArray(value.failoverUrls) &&
    value.failoverUrls.length === 0
  );
}

function validateNetworkController(state: ValidState):
  | {
      networkConfigurationsByChainId: Record<Hex, unknown>;
      selectedNetworkClientId: string;
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
        `Migration ${migrationVersion}: Invalid NetworkController state: selectedNetworkClientId is not a string`,
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
