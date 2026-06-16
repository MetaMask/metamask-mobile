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
 * Migration 134: replace the deprecated Seitrace block explorer URL
 * (`seitrace.com`, being decommissioned) with its replacement Seiscan
 * (`seiscan.io`) for Sei Mainnet on existing user installs.
 *
 * Users without Sei Mainnet configured: no-op (silent).
 * Users who customized the explorer URL away from Seitrace: no-op
 * (only entries that still point at `seitrace.com` are rewritten).
 * Users missing `NetworkController` entirely: no-op (silent) — expected
 * during upgrade-from-old-version.
 */
export const migrationVersion = 134;

const SEI_MAINNET_CHAIN_ID: Hex = '0x531'; // 1329
const OLD_HOSTNAME = 'seitrace.com';
const NEW_HOSTNAME = 'seiscan.io';

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
    if (!hasProperty(networkConfigurationsByChainId, SEI_MAINNET_CHAIN_ID)) {
      return state;
    }

    const seiConfig = networkConfigurationsByChainId[SEI_MAINNET_CHAIN_ID];
    if (!isValidNetworkConfiguration(seiConfig)) {
      return state;
    }

    const rewritten = seiConfig.blockExplorerUrls.map((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === OLD_HOSTNAME) {
          parsed.hostname = NEW_HOSTNAME;
          return parsed.toString();
        }
      } catch {
        // not a valid URL, leave as-is
      }
      return url;
    });
    const didChange = rewritten.some(
      (url, index) => url !== seiConfig.blockExplorerUrls[index],
    );

    if (didChange) {
      seiConfig.blockExplorerUrls = rewritten;
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to rewrite Sei Mainnet block explorer URL: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;

// Sentry logging is intentionally omitted — expected-missing states
// (NetworkController absent, Sei not configured) are not errors.
function validateNetworkController(state: {
  engine: { backgroundState: Record<string, unknown> };
}):
  | {
      networkConfigurationsByChainId: Record<Hex, unknown>;
      selectedNetworkClientId: string;
    }
  | undefined {
  if (!hasProperty(state.engine.backgroundState, 'NetworkController')) {
    // Expected during upgrade-from-old-version — don't log.
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

// Minimal validator — only chainId + blockExplorerUrls need to be sound
// for this migration.
function isValidNetworkConfiguration(
  object: unknown,
): object is NetworkConfiguration {
  return (
    isObject(object) &&
    hasProperty(object, 'chainId') &&
    typeof object.chainId === 'string' &&
    isHexString(object.chainId) &&
    hasProperty(object, 'blockExplorerUrls') &&
    Array.isArray(object.blockExplorerUrls) &&
    object.blockExplorerUrls.every((url) => typeof url === 'string')
  );
}
