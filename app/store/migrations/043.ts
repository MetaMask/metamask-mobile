import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import { InfuraNetworkType } from '@metamask/controller-utils';

/**
 * Migration to fix the "Engine does not exist" issue
 * On this migration we populate selectedNetworkClientId property of Network Controller with provider config id
 * or network configuration id if the rpc url matches the one on provider config
 * or we default it to mainnet
 * @param state Persisted Redux state
 * @returns mutated state with selectNetworkClientId on Network Controller data
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 43)) {
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 43: Invalid NetworkController state: '${typeof networkControllerState}'`,
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
        `Migration 43: Invalid NetworkController networkConfigurations state: '${typeof networkControllerState.networkConfigurations}'`,
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
        `Migration 43: Invalid NetworkController providerConfig state: '${typeof networkControllerState.providerConfig}'`,
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
