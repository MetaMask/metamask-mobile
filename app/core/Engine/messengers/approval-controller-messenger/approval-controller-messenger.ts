import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ApprovalControllerMessenger } from '@metamask/approval-controller';
import { RootMessenger } from '../../types';

const name = 'ApprovalController';

export function getApprovalControllerMessenger(
  rootMessenger: RootMessenger,
): ApprovalControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<ApprovalControllerMessenger>,
    MessengerEvents<ApprovalControllerMessenger>,
    RootMessenger
  >({
    namespace: name,
    parent: rootMessenger,
  });
  return messenger;
}
