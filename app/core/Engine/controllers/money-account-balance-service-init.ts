import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-balance-service';

/**
 * Initialize the money account balance service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const moneyAccountBalanceServiceInit: MessengerClientInitFunction<
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountBalanceService({
    messenger: controllerMessenger,
  });

  controller.init();

  return { controller };
};
