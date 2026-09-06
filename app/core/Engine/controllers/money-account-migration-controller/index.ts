import type { MessengerClientInitFunction } from '../../types';
import {
  MoneyAccountMigrationController,
  defaultMoneyAccountMigrationControllerState,
} from './MoneyAccountMigrationController';
import type { MoneyAccountMigrationControllerMessenger } from './types';

/**
 * Initialize the MoneyAccountMigrationController.
 *
 * @param request - The request object.
 * @returns The MoneyAccountMigrationController.
 */
export const moneyAccountMigrationControllerInit: MessengerClientInitFunction<
  MoneyAccountMigrationController,
  MoneyAccountMigrationControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new MoneyAccountMigrationController({
    messenger: controllerMessenger,
    state: {
      ...(persistedState.MoneyAccountMigrationController ??
        defaultMoneyAccountMigrationControllerState),
    },
  });

  return { controller };
};

export { MoneyAccountMigrationController };
export type { MoneyAccountMigrationControllerMessenger };
