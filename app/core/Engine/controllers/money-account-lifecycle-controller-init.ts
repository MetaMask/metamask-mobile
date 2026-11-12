import {
  MoneyAccountLifecycleController,
  type MoneyAccountLifecycleControllerMessenger,
} from '@metamask/money-account-lifecycle-controller';
import type { MessengerClientInitFunction } from '../types';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';

/**
 * Initialize the MoneyAccountLifecycleController.
 *
 * Gated on the Money Account flag, so it tracks the lifecycle and runs the
 * upgrade for every Money Account user. Starting a migration is left to the
 * client.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const moneyAccountLifecycleControllerInit: MessengerClientInitFunction<
  MoneyAccountLifecycleController,
  MoneyAccountLifecycleControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new MoneyAccountLifecycleController({
    messenger: controllerMessenger,
    state: persistedState.MoneyAccountLifecycleController,
    hooks: {
      isEnabled: isMoneyAccountEnabled,
    },
  });

  controller.init();

  return { controller };
};
