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
  rootMessenger: RootMessenger<
    MessengerActions<ComplianceServiceMessenger>,
    MessengerEvents<ComplianceServiceMessenger>
  >,
): ComplianceServiceMessenger {
  const messenger: ComplianceServiceMessenger = new Messenger({
    namespace: 'ComplianceService',
    parent: rootMessenger,
  });
  return messenger;
}
