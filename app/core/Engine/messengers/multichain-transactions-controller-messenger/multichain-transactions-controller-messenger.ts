import { RootExtendedMessenger } from '../../types';

export type MultichainTransactionsControllerMessenger = ReturnType<
  typeof getMultichainTransactionsControllerMessenger
>;

/**
 * Get the MultichainTransactionsControllerMessenger for the MultichainTransactionsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainTransactionsControllerMessenger.
 */
export function getMultichainTransactionsControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
) {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainTransactionsController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountTransactionsUpdated',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'KeyringController:getState',
    ],
  });
}
