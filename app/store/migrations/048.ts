import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to remove contractExchangeRates and contractExchangeRatesByChainId from the state of TokenRatesController
 *
 * @param state Persisted Redux state
 * @returns Updated state or original state if no changes were made
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 48)) {
    return state;
  }

  const tokenRatesControllerState =
    state.engine.backgroundState.TokenRatesController;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid TokenRatesController state error: '${typeof tokenRatesControllerState}'`,
      ),
    );
    return state;
  }

  const updatedTokenRatesControllerState = { ...tokenRatesControllerState };
  let stateChanged = false;

  if ('contractExchangeRates' in updatedTokenRatesControllerState) {
    delete updatedTokenRatesControllerState.contractExchangeRates;
    stateChanged = true;
  }

  if ('contractExchangeRatesByChainId' in updatedTokenRatesControllerState) {
    delete updatedTokenRatesControllerState.contractExchangeRatesByChainId;
    stateChanged = true;
  }

  if (!stateChanged) {
    return state; // No changes were needed, return original state
  }

  // Add a timestamp to ensure the state is always different when changes are made
  updatedTokenRatesControllerState.lastUpdated = Date.now();

  // Return a new state object with the updated TokenRatesController
  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine.backgroundState,
        TokenRatesController: updatedTokenRatesControllerState,
      },
    },
  };
}
