import { captureException } from '@sentry/react-native';
import { isObject } from 'lodash';
import { PRICE_API_CURRENCIES } from '../../core/Multichain/constants';
import { ensureValidState } from './util';
import { hasProperty } from '@metamask/utils';

const DEFAULT_CURRENCY = 'usd';

/**
 * Migration to update the `currentCurrency` in `CurrencyController` to a valid available currency.
 * If it's missing or invalid, it defaults to "USD".
 * @param state - The current MetaMask extension state.
 * @returns Migrated Redux state.
 */
export default function migrate(state: unknown) {
  const migrationVersion = 69;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const currencyController =
    state.engine.backgroundState.CurrencyRateController;

  if (
    !isObject(currencyController) ||
    !hasProperty(currencyController, 'currentCurrency')
  ) {
    captureException(
      new Error(
        `Migration: Invalid CurrencyController state type '${typeof currencyController}'`,
      ),
    );

    return state;
  }

  const { currentCurrency } = currencyController;

  if (!currentCurrency) {
    currencyController.currentCurrency = DEFAULT_CURRENCY;
    return state;
  }

  const isValidCurrency = PRICE_API_CURRENCIES.some(
    (currency) => currency === currentCurrency,
  );
  if (!isValidCurrency) {
    currencyController.currentCurrency = DEFAULT_CURRENCY;
  }

  return state;
}
