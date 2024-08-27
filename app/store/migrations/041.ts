import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to reset state of TokenBalancesController
 *
 * @param state Persisted Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 41)) {
    return state;
  }

  const tokenBalancesControllerState =
    state.engine.backgroundState.TokenBalancesController;

  if (!isObject(tokenBalancesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 41: Invalid TokenBalancesController state error: '${JSON.stringify(
          tokenBalancesControllerState,
        )}'`,
      ),
    );
    return state;
  }

  tokenBalancesControllerState.contractBalances = {};

  return state;
}
