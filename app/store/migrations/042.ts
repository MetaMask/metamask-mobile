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
  if (!ensureValidState(state, 42)) {
    return state;
  }

  const tokenRatesControllerState =
    state.engine.backgroundState.TokenRatesController;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 42: Invalid TokenRatesController state error: '${JSON.stringify(
          tokenRatesControllerState,
        )}'`,
      ),
    );
    return state;
  }

  delete tokenRatesControllerState.contractExchangeRates;
  delete tokenRatesControllerState.contractExchangeRatesByChainId;

  return state;
}
