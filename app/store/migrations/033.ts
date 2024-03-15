import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';
import type { NetworkState } from '@metamask/network-controller';

/**
 * This migration removes networkDetails and networkStatus property
 * This migration add a new property `networkMetadata` to the NetworkController (Still under investigation if it's needed)
 * @param {unknown} stateAsync - Promise Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 33: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 33: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 33: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 33: Invalid NetworkController state: '${typeof networkControllerState}'`,
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
        `Migration 33: Invalid NetworkController networkDetails state: '${typeof networkControllerState.networkDetails}'`,
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

  return state;
}
