import type { ApprovalControllerMessenger } from '@metamask/approval-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';

import type { RootMessenger } from '../types';

export function getApprovalControllerMessenger(
  rootMessenger: RootMessenger,
): ApprovalControllerMessenger {
  return new Messenger<
    'ApprovalController',
    MessengerActions<ApprovalControllerMessenger>,
    MessengerEvents<ApprovalControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ApprovalController',
    parent: rootMessenger,
  });
}
