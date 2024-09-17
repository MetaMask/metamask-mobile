import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 53)) {
    // Increment the migration number as appropriate
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;
  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 53: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  // Delete the providerConfig property if it exists
  if ('providerConfig' in networkControllerState) {
    delete networkControllerState.providerConfig;
  }

  // Return the modified state
  return state;
}
