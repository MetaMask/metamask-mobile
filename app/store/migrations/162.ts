import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 162: drop the legacy per-endpoint `failoverUrls` from
 * `NetworkController`.
 *
 * `@metamask/network-controller` no longer has `failoverUrls` on RPC
 * endpoints. Failover URLs now come only from the `failoverUrls` constructor
 * option, so any value persisted on an endpoint is ignored. This removes the
 * stale property from every entry of `rpcEndpoints` in
 * `networkConfigurationsByChainId`.
 */
export const migrationVersion = 162;

export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const networkController = state.engine.backgroundState.NetworkController;
    if (!isObject(networkController)) {
      return state;
    }

    const { networkConfigurationsByChainId } = networkController;
    if (!isObject(networkConfigurationsByChainId)) {
      return state;
    }

    for (const networkConfiguration of Object.values(
      networkConfigurationsByChainId,
    )) {
      if (
        !isObject(networkConfiguration) ||
        !Array.isArray(networkConfiguration.rpcEndpoints)
      ) {
        continue;
      }
      for (const rpcEndpoint of networkConfiguration.rpcEndpoints) {
        if (isObject(rpcEndpoint) && hasProperty(rpcEndpoint, 'failoverUrls')) {
          delete rpcEndpoint.failoverUrls;
        }
      }
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove failoverUrls from NetworkController RPC endpoints: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}
