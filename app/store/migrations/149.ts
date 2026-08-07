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
 * This migration undoes 145's effect, but only when the Arc network still
 * has the single, private, not-yet-public Infura RPC endpoint 145 would have
 * written unattended - nobody else could produce that exact URL, since it's
 * built from this build's own (undisclosed) Infura project ID. Cosmetic
 * edits (rename, currency, block explorer) don't prevent reversion. But if
 * the user replaced/removed that RPC endpoint, added a failover to it, added
 * an additional endpoint, or added Arc manually with their own RPC, that's a
 * real customization and the network is left alone entirely.
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
        // If Arc was the only enabled EVM network, removing it would leave
        // the user with none enabled. Mirror migration 111's precedent for
        // removing an exclusively-enabled network: fall back to mainnet.
        const wasArcTheOnlyEnabledNetwork =
          eip155NetworkMap[ARC_CHAIN_ID] === true &&
          Object.entries(eip155NetworkMap).every(
            ([chainId, isEnabled]) =>
              chainId === ARC_CHAIN_ID || isEnabled !== true,
          );

        delete eip155NetworkMap[ARC_CHAIN_ID];

        if (wasArcTheOnlyEnabledNetwork) {
          eip155NetworkMap['0x1'] = true;
          networkState.selectedNetworkClientId = 'mainnet';
        }
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
 * Checks whether the given Arc network configuration still has the single,
 * private, not-yet-public `arc-mainnet.infura.io` RPC endpoint migration 145
 * would have written unattended, with no failover URLs. Only the RPC
 * endpoint is checked - display fields (name, currency, block explorer,
 * default indexes) are allowed to differ, since editing those isn't the kind
 * of customization that should block reverting the premature auto-add.
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
