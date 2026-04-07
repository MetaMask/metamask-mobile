import { ControllerInitFunction } from '../types';
import {
  MoneyAccountController,
  MoneyAccountControllerMessenger,
} from '@metamask/money-account-controller';

/**
 * Initialize the money account controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The messenger to use for initialization.
 * @param request.persistedState - The persisted state to restore.
 * @returns The initialized controller.
 */
export const moneyAccountControllerInit: ControllerInitFunction<
  MoneyAccountController,
  MoneyAccountControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new MoneyAccountController({
    messenger: controllerMessenger,
    state: persistedState.MoneyAccountController,
  });

  return { controller };
};
