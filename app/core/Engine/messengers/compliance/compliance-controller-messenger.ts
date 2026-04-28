import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ComplianceControllerMessenger } from '@metamask/compliance-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the messenger for the ComplianceController.
 *
 * Delegates ComplianceService actions so the controller can call
 * the service through the messenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ComplianceControllerMessenger.
 */
export function getComplianceControllerMessenger(
  rootMessenger: RootMessenger,
): ComplianceControllerMessenger {
  const messenger = new Messenger<
    'ComplianceController',
    MessengerActions<ComplianceControllerMessenger>,
    MessengerEvents<ComplianceControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ComplianceController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ComplianceService:checkWalletCompliance',
      'ComplianceService:checkWalletsCompliance',
    ],
    messenger,
  });
  return messenger;
}
