import { captureException } from '@sentry/react-native';
import { CurrencyRateState } from '@metamask/assets-controllers';
import { isObject } from 'lodash';
import { PRICE_API_CURRENCIES } from '../../core/Multichain/constants';
import { ensureValidState } from './util';

const DEFAULT_CURRENCY = 'usd';

/**
 * Migration to update the `currentCurrency` in `CurrencyController` to a valid available currency.
 * If it's missing or invalid, it defaults to "USD".
 * @param {unknown} stateAsync - Promise Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const migrationVersion = 69;

  const state = await stateAsync;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const currencyController = state.engine.backgroundState
    .CurrencyRateController as CurrencyRateState;

  if (!isObject(currencyController)) {
    captureException(
      new Error(
        `Migration: Invalid CurrencyController state type '${typeof currencyController}'`,
      ),
    );

    return state;
  }

  const { currentCurrency } = currencyController;

  if (!currentCurrency) {
    captureException(
      new Error(
        `Migration: Missing currentCurrency in CurrencyController, defaulting to ${DEFAULT_CURRENCY}`,
      ),
    );
    currencyController.currentCurrency = DEFAULT_CURRENCY;
    return;
  }

  const isValidCurrency = PRICE_API_CURRENCIES.some(
    (currency) => currency === currentCurrency,
  );
  if (!isValidCurrency) {
    currencyController.currentCurrency = DEFAULT_CURRENCY;
  }

  return state;
}
