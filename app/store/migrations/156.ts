import { captureException } from '@sentry/react-native';
import {
  getErrorMessage,
  hasProperty,
  Hex,
  isHexString,
  isObject,
} from '@metamask/utils';

import { ensureValidState } from './util';

/**
 * Migration 156: Tempo has no native currency; USD is used as a placeholder.
 * The mm-config-registry integration briefly set pathUSD for newly added Tempo
 * networks. This migration reverts that for affected users.
 *
 * Behavior:
 * - Users for which Tempo native currency is 'pathUSD' or 'PATHUSD' -> Switch to 'USD'.
 * - Users for which Tempo native currency is something else: no-op.
 */
export const migrationVersion = 156;

const TEMPO_CHAIN_ID: Hex = '0x1079'; // 4217
const OLD_CURRENCIES = new Set(['pathUSD', 'PATHUSD']);
const NEW_CURRENCY = 'USD';

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

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const networkControllerState = validateNetworkController(state);
    if (networkControllerState === undefined) {
      return state;
    }

    const { networkConfigurationsByChainId } = networkControllerState;
    if (!hasProperty(networkConfigurationsByChainId, TEMPO_CHAIN_ID)) {
      return state;
    }

    const tempoConfig = networkConfigurationsByChainId[TEMPO_CHAIN_ID];
    if (!isValidNetworkConfiguration(tempoConfig)) {
      return state;
    }

    if (OLD_CURRENCIES.has(tempoConfig.nativeCurrency)) {
      tempoConfig.nativeCurrency = NEW_CURRENCY;
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to rewrite Tempo Mainnet nativeCurrency: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;

// Sentry logging is intentionally omitted - expected-missing states
// (NetworkController absent, Tempo not configured) are not errors.
function validateNetworkController(state: {
  engine: { backgroundState: Record<string, unknown> };
}):
  | {
      networkConfigurationsByChainId: Record<Hex, unknown>;
      selectedNetworkClientId: string;
    }
  | undefined {
  if (!hasProperty(state.engine.backgroundState, 'NetworkController')) {
    return undefined;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isValidNetworkControllerState(networkControllerState)) {
    return undefined;
  }

  return networkControllerState;
}

function isValidNetworkControllerState(value: unknown): value is {
  networkConfigurationsByChainId: Record<Hex, unknown>;
  selectedNetworkClientId: string;
} {
  if (!isObject(value)) {
    return false;
  }

  if (
    !hasProperty(value, 'networkConfigurationsByChainId') ||
    !isValidNetworkConfigurationsByChainId(value.networkConfigurationsByChainId)
  ) {
    return false;
  }

  if (
    !hasProperty(value, 'selectedNetworkClientId') ||
    typeof value.selectedNetworkClientId !== 'string'
  ) {
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
    hasProperty(object, 'nativeCurrency') &&
    typeof object.nativeCurrency === 'string'
  );
}
