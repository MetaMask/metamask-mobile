import { captureException } from '@sentry/react-native';
import { getErrorMessage, isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';

/**
 * Migration 154: repair network configurations saved by the Config Registry
 * "Additional networks" flow while it was broken.
 *
 * `registryConfigToPopularListShape` copied the registry's RPC URL as-is and
 * dropped the provider type, so every network added from that list was saved
 * as a Custom endpoint whose URL still contained the literal
 * `{infuraProjectId}` placeholder. Custom endpoint URLs are called verbatim,
 * so every request to those networks failed with "Unavailable network
 * connection".
 *
 * Endpoints matching the broken shape are converted to Infura endpoints
 * (`type: 'infura'` with the networkClientId derived from the URL).
 * NetworkController rebuilds the URL for Infura endpoints from the
 * networkClientId and the real project ID. Endpoints the user repaired
 * themselves (different URL) are left alone.
 */
export const migrationVersion = 154;

const BROKEN_INFURA_URL =
  /^https:\/\/(.+)\.infura\.io\/v3\/\{infuraProjectId\}$/u;

export default function migrate(versionedState: unknown) {
  const state = cloneDeep(versionedState);
  try {
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

    const networkState = state.engine.backgroundState.NetworkController;
    if (
      !isObject(networkState) ||
      !isObject(networkState.networkConfigurationsByChainId)
    ) {
      return state;
    }

    // old (custom) networkClientId -> new (infura) networkClientId
    const remappedClientIds = new Map<string, string>();

    for (const configuration of Object.values(
      networkState.networkConfigurationsByChainId,
    )) {
      if (
        !isObject(configuration) ||
        !Array.isArray(configuration.rpcEndpoints)
      ) {
        continue;
      }

      configuration.rpcEndpoints = configuration.rpcEndpoints.map(
        (endpoint) => {
          if (
            !isObject(endpoint) ||
            endpoint.type !== 'custom' ||
            typeof endpoint.url !== 'string' ||
            typeof endpoint.networkClientId !== 'string'
          ) {
            return endpoint;
          }

          const match = endpoint.url.match(BROKEN_INFURA_URL);
          if (!match) {
            return endpoint;
          }

          const infuraNetworkClientId = match[1];
          remappedClientIds.set(
            endpoint.networkClientId,
            infuraNetworkClientId,
          );
          return {
            ...endpoint,
            type: 'infura',
            networkClientId: infuraNetworkClientId,
          };
        },
      );
    }

    if (remappedClientIds.size === 0) {
      return state;
    }

    if (isObject(networkState.networksMetadata)) {
      for (const [oldId, newId] of remappedClientIds) {
        if (oldId in networkState.networksMetadata) {
          networkState.networksMetadata[newId] =
            networkState.networksMetadata[oldId];
          delete networkState.networksMetadata[oldId];
        }
      }
    }

    if (
      typeof networkState.selectedNetworkClientId === 'string' &&
      remappedClientIds.has(networkState.selectedNetworkClientId)
    ) {
      networkState.selectedNetworkClientId = remappedClientIds.get(
        networkState.selectedNetworkClientId,
      );
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
