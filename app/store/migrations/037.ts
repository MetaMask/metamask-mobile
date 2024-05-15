import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!isObject(state)) {
    captureException(
      new Error(`Migration 37: Invalid state error: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 37: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 37: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }
  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 37: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  // If there is no networkId we do not need to do anything, inpageProvider will start with is default state
  if (!networkControllerState.networkId) {
    return state;
  }

  state.inpageProvider = { networkId: networkControllerState.networkId };

  delete networkControllerState.networkId;

  return state;
}
