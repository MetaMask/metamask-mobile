import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 143:
 *
 * Carry over the user's selected fiat currency from
 * `CurrencyRateController.currentCurrency` into
 * `AssetsController.selectedCurrency`.
 *
 * Migration 139 initialized `AssetsController.selectedCurrency` to the default
 * `'usd'` without copying the user's existing currency. When the
 * `assetsUnifyState` feature flag is enabled, the UI reads the active currency
 * from `AssetsController.selectedCurrency`, so without this sync existing
 * non-USD users would be silently reset to USD.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 143;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const { backgroundState } = state.engine;

  if (
    !hasProperty(backgroundState, 'AssetsController') ||
    !isObject(backgroundState.AssetsController) ||
    !hasProperty(backgroundState, 'CurrencyRateController') ||
    !isObject(backgroundState.CurrencyRateController)
  ) {
    return state;
  }

  const { AssetsController, CurrencyRateController } = backgroundState;
  const { currentCurrency } = CurrencyRateController;

  if (
    typeof currentCurrency === 'string' &&
    currentCurrency.length > 0 &&
    AssetsController.selectedCurrency !== currentCurrency
  ) {
    AssetsController.selectedCurrency = currentCurrency;
  }

  return state;
};

export default migration;
