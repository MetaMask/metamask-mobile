import {
  CurrencyRateController,
  CurrencyRateMessenger,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';
import { defaultCurrencyRateState } from './constants';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectIsControllerDeprecated } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { store } from '../../../../store';

/**
 * Initialize the CurrencyRateController.
 *
 * @param request - The request object.
 * @returns The CurrencyRateController.
 */

// Define the currency rate type based on usage
interface CurrencyRateEntry {
  conversionRate: number;
  conversionDate: number | null;
  usdConversionRate: number | null;
}

export const currencyRateControllerInit: MessengerClientInitFunction<
  CurrencyRateController,
  CurrencyRateMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState, codefiTokenApiV2 } =
    request;

  // Get the persisted state or use default state
  const persistedCurrencyRateState =
    persistedState.CurrencyRateController ?? defaultCurrencyRateState;

  // Normalize the currency rates to ensure conversionRate is never null
  const normalizedCurrencyRates: Record<string, CurrencyRateEntry> = {};
  const currencyRates =
    persistedCurrencyRateState.currencyRates ??
    defaultCurrencyRateState.currencyRates;

  // Normalize each currency rate to ensure conversionRate is never null
  Object.entries(currencyRates).forEach(([key, value]) => {
    normalizedCurrencyRates[key] = {
      ...value,
      conversionRate: value.conversionRate ?? 0,
    };
  });

  const controller = new CurrencyRateController({
    includeUsdRate: true,
    messenger: controllerMessenger,
    state: {
      ...persistedCurrencyRateState,
      currencyRates: normalizedCurrencyRates,
    },
    useExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    tokenPricesService: codefiTokenApiV2,
    isDeprecated: () =>
      selectIsControllerDeprecated('CurrencyRateController')(store.getState()),
  });

  return { controller };
};
