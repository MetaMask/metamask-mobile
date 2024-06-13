import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import { NetworkState } from '@metamask/network-controller';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 43)) {
    return state;
  }

  const networkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;

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
    ([key, value]) => {
      if (!value.id) {
        value.id = key;
      }
    },
  );

  if (!networkControllerState.selectedNetworkClientId) {
    const selectedNetworkId = Object.entries(
      networkControllerState.networkConfigurations,
    ).find(
      ([, value]) =>
        value.rpcUrl === networkControllerState.providerConfig.rpcUrl,
    )?.[0];

    if (selectedNetworkId) {
      networkControllerState.selectedNetworkClientId = selectedNetworkId;
      networkControllerState.providerConfig.id = selectedNetworkId;
    }
  }

  return state;
}
