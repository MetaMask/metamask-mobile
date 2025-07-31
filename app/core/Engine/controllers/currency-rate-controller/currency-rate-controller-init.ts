import {
  CurrencyRateController,
  CurrencyRateControllerActions,
  CurrencyRateControllerEvents,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';
import { RestrictedMessenger } from '@metamask/base-controller';
import type { NetworkControllerGetNetworkClientByIdAction } from '@metamask/network-controller';
import { defaultCurrencyRateState } from './constants';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';

/**
 * Initialize the CurrencyRateController.
 *
 * @param request - The request object.
 * @returns The CurrencyRateController.
 */

// TODO: Remove once the CurrencyRateMessenger is properly exported from module
export type CurrencyRateMessenger = RestrictedMessenger<
  'CurrencyRateController',
  CurrencyRateControllerActions | NetworkControllerGetNetworkClientByIdAction,
  CurrencyRateControllerEvents,
  NetworkControllerGetNetworkClientByIdAction['type'],
  never
>;

// Define the currency rate type based on usage
interface CurrencyRateEntry {
  conversionRate: number;
  conversionDate: number | null;
  usdConversionRate: number | null;
}

export const currencyRateControllerInit: ControllerInitFunction<
  CurrencyRateController,
  CurrencyRateMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState } = request;

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
  });

  return { controller };
};
