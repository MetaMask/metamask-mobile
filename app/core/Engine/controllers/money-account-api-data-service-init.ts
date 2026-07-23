import {
  Env,
  MoneyAccountApiDataService,
  type MoneyAccountApiDataServiceMessenger,
} from '@metamask/money-account-api-data-service';
import { MessengerClientInitFunction } from '../types';

/**
 * Initialize the money account API data service.
 *
 * Used as the Money API source behind
 * `MoneyAccountBalanceService:fetchBalanceWithFallback`.
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
    env: Env.PRD,
  });

  return { controller };
};
