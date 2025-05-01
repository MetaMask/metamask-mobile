import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureErrorException } from '../../util/sentry';

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
    captureErrorException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid TokenRatesController state error: '${typeof tokenRatesControllerState}'`,
      ),
    );
    return state;
  }

  delete tokenRatesControllerState.contractExchangeRates;
  delete tokenRatesControllerState.contractExchangeRatesByChainId;

  return state;
}
