import type { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountMpcService,
  type MoneyAccountMpcMessenger,
} from './money-account-mpc-service';

/**
 * Initialize the Money Account MPC service.
 *
 * @param request - The initialization request.
 * @param request.controllerMessenger - The service messenger.
 * @returns The initialized service.
 */
export const moneyAccountMpcServiceInit: MessengerClientInitFunction<
  MoneyAccountMpcService,
  MoneyAccountMpcMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountMpcService({
    messenger: controllerMessenger,
  });

  return {
    controller,
    memStateKey: null,
    persistedStateKey: null,
  };
};
