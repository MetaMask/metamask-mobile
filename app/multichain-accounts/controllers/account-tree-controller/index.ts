import { AccountTreeController, AccountTreeControllerMessenger } from '@metamask-previews/account-tree-controller';
import type { ControllerInitFunction } from '../../../core/Engine/types';

// Export constants
export * from './constants';

/**
 * Initialize the AccountTreeController.
 *
 * @param request - The request object.
 * @returns The AccountTreeController.
 */
export const accountTreeControllerInit: ControllerInitFunction<
  AccountTreeController,
  AccountTreeControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const accountTreeControllerState = persistedState.AccountTreeController ?? {};

  const controller = new AccountTreeController({
    messenger: controllerMessenger,
    state: accountTreeControllerState,
  });

  return { controller };
};
