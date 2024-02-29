import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';
import { NetworkState } from '@metamask/network-controller';

/**
 * Enable security alerts by default.
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 32: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 32: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 32: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;
  const newNetworkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'providerConfig') ||
    !isObject(networkControllerState.providerConfig)
  ) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController providerConfig: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.ticker) {
    newNetworkControllerState.providerConfig.ticker = 'ETH';
  }

  if (
    !hasProperty(networkControllerState, 'networkDetails') ||
    !isObject(networkControllerState.networkDetails)
  ) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController networkDetails: '${typeof networkControllerState.networkDetails}'`,
      ),
    );
    return state;
  }

  if (networkControllerState.networkDetails) {
    newNetworkControllerState.networksMetadata = {};
    delete networkControllerState.networkDetails;
  }
  if (networkControllerState.networkStatus) {
    delete networkControllerState.networkStatus;
  }

  if (networkControllerState.providerConfig.type) {
    newNetworkControllerState.selectedNetworkClientId =
      newNetworkControllerState.providerConfig.type;
  }

  return state;
}
