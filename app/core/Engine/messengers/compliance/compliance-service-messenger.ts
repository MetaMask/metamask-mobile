import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ComplianceServiceMessenger } from '@metamask/compliance-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the messenger for the ComplianceService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ComplianceServiceMessenger.
 */
export function getComplianceServiceMessenger(
  rootMessenger: RootMessenger,
): ComplianceServiceMessenger {
  return new Messenger<
    'ComplianceService',
    MessengerActions<ComplianceServiceMessenger>,
    MessengerEvents<ComplianceServiceMessenger>,
    RootMessenger
  >({
    namespace: 'ComplianceService',
    parent: rootMessenger,
  });
}
