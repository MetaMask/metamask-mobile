import { isObject } from '@metamask/utils';
import { captureErrorException } from '../../util/sentry';

export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!isObject(state)) {
    captureErrorException(
      new Error(`Migration 37: Invalid state error: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureErrorException(
      new Error(
        `Migration 37: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureErrorException(
      new Error(
        `Migration 37: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const keyringControllerState = state.engine.backgroundState.KeyringController;
  if (!isObject(keyringControllerState)) {
    captureErrorException(
      new Error(
        `Migration 37: Invalid vault in KeyringController: '${typeof keyringControllerState}'`,
      ),
    );
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureErrorException(
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
