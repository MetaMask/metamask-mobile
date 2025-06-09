import { CurrencyRateMessenger } from '../../controllers/currency-rate-controller/currency-rate-controller-init';
import { BaseControllerMessenger } from '../../types';

/**
 * Get the CurrencyRateMessenger for the CurrencyRateController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The CurrencyRateMessenger.
 */
export function getCurrencyRateControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): CurrencyRateMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'CurrencyRateController',
    allowedActions: ['NetworkController:getNetworkClientById'],
    allowedEvents: [],
  });
}
