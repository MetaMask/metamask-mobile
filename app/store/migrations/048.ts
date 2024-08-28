import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to remove contractExchangeRates and contractExchangeRatesByChainId from the state of TokenRatesController
 *
 * @param state Persisted Redux state
 * @returns
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
  delete updatedTokenRatesControllerState.contractExchangeRates;
  delete updatedTokenRatesControllerState.contractExchangeRatesByChainId;

  if (
    Object.keys(updatedTokenRatesControllerState).length ===
    Object.keys(tokenRatesControllerState).length
  ) {
    return state; // No changes were made, return original state
  }

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
