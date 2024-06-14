import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import { InfuraNetworkType } from '@metamask/controller-utils';

/**
 * Migration to fix the "No network client ID was provided" bug (#9973) and "Engine does not exist" (#9958).
 *
 * This migration fixes corrupted `networkConfigurations` state, which was introduced in v7.7.0
 * in migration 20. This corrupted state did not cause an error until v7.24.0.
 *
 * The problem was that some `networkConfigurations` entries were missing an `id` property. It has
 * been restored. `selectedNetworkClientId` may have been erased as a side-effect of this invalid
 * state, so it has been normalized here to match the `providerConfig` state, or reset to the
 * default (main net).
 *
 * @param state Persisted Redux state that is potentially corrupted
 * @returns Valid persisted Redux state
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 45)) {
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 45: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(networkControllerState.networkConfigurations) ||
    !hasProperty(networkControllerState, 'networkConfigurations')
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 45: Invalid NetworkController networkConfigurations state: '${typeof networkControllerState.networkConfigurations}'`,
      ),
    );
    return state;
  }

  if (
    Object.values(networkControllerState.networkConfigurations).some(
      (networkConfiguration) => !isObject(networkConfiguration),
    )
  ) {
    const invalidEntry = Object.entries(
      networkControllerState.networkConfigurations,
    ).find(([_, networkConfiguration]) => !isObject(networkConfiguration));
    captureException(
      new Error(
        `FATAL ERROR: Migration 45: Invalid NetworkController network configuration entry with id: '${
          invalidEntry?.[0]
        }', type: '${typeof invalidEntry?.[1]}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(networkControllerState.providerConfig) ||
    !hasProperty(networkControllerState, 'providerConfig')
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 45: Invalid NetworkController providerConfig state: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  Object.entries(networkControllerState.networkConfigurations).forEach(
    ([networkConfigurationId, networkConfiguration]) => {
      if (isObject(networkConfiguration) && !networkConfiguration.id) {
        networkConfiguration.id = networkConfigurationId;
      }
    },
  );

  if (!networkControllerState.selectedNetworkClientId) {
    const rpcUrl = networkControllerState.providerConfig.rpcUrl;

    const selectedNetworkId =
      networkControllerState.providerConfig.id ??
      Object.entries(networkControllerState.networkConfigurations).find(
        ([, networkConfiguration]) =>
          isObject(networkConfiguration) &&
          networkConfiguration.rpcUrl === rpcUrl,
      )?.[0];

    if (selectedNetworkId) {
      networkControllerState.selectedNetworkClientId = selectedNetworkId;
      networkControllerState.providerConfig.id = selectedNetworkId;
    } else {
      networkControllerState.selectedNetworkClientId =
        InfuraNetworkType.mainnet;
    }
  }

  return state;
}
