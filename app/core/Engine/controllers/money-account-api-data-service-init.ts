import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountApiDataService,
  type MoneyAccountApiDataServiceMessenger,
} from '@metamask/money-account-api-data-service';

/**
 * Initialize the money account API data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const moneyAccountApiDataServiceInit: MessengerClientInitFunction<
  MoneyAccountApiDataService,
  MoneyAccountApiDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountApiDataService({
    messenger: controllerMessenger,
  });

  return { controller };
};
