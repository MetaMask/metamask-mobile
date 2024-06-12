import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';
import { NetworkState, NetworkStatus } from '@metamask/network-controller';
import { InfuraNetworkType } from '@metamask/controller-utils';

/**
 * This migration removes networkDetails and networkStatus property
 * This migration add a new property `networkMetadata` to the NetworkController
 * This migrations adds a new property called `selectedNetworkClientId` to the NetworkController
 * @param {unknown} stateAsync - Promise Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 35: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 35: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 35: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const keyringControllerState = state.engine.backgroundState.KeyringController;
  if (!isObject(keyringControllerState)) {
    captureException(
      `Migration 35: Invalid vault in KeyringController: '${typeof keyringControllerState}'`,
    );
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;
  const newNetworkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 35: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(networkControllerState.networkDetails) ||
    !hasProperty(networkControllerState, 'networkDetails')
  ) {
    captureException(
      new Error(
        `Migration 35: Invalid NetworkController networkDetails state: '${typeof networkControllerState.networkDetails}'`,
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
        `Migration 35: Invalid NetworkController networkConfigurations state: '${typeof networkControllerState.networkConfigurations}'`,
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
        `Migration 35: Invalid NetworkController providerConfig state: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (networkControllerState.networkDetails) {
    delete networkControllerState.networkDetails;
  }
  if (networkControllerState.networkStatus) {
    delete networkControllerState.networkStatus;
  }

  newNetworkControllerState.selectedNetworkClientId =
    (networkControllerState.providerConfig.id as string | undefined) ??
    (networkControllerState.providerConfig.type as string);

  let infuraNetworksMetadata = {};
  let customNetworksMetadata = {};

  Object.values(InfuraNetworkType).forEach((network) => {
    infuraNetworksMetadata = {
      ...infuraNetworksMetadata,
      [network]: { status: NetworkStatus.Unknown, EIPS: {} },
    };
  });

  Object.keys(networkControllerState.networkConfigurations).forEach(
    (networkConfigurationId) => {
      customNetworksMetadata = {
        ...customNetworksMetadata,
        [networkConfigurationId]: { status: NetworkStatus.Unknown, EIPS: {} },
      };
    },
  );

  newNetworkControllerState.networksMetadata = {
    ...infuraNetworksMetadata,
    ...customNetworksMetadata,
  };

  return state;
}
