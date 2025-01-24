import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to update state of GasFeeController
 *
 * @param state Persisted Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 45)) {
    return state;
  }

  const gasFeeControllerState = state.engine.backgroundState.GasFeeController;

  if (!isObject(gasFeeControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 45: Invalid GasFeeController state error: '${JSON.stringify(
          gasFeeControllerState,
        )}'`,
      ),
    );
    return state;
  }

  gasFeeControllerState.nonRPCGasFeeApisDisabled = false;

  return state;
}
