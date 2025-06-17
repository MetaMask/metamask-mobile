import type {
  ApprovalControllerActions,
  ApprovalControllerEvents,
} from '@metamask/approval-controller';
import { Messenger, RestrictedMessenger } from '@metamask/base-controller';

const name = 'ApprovalController';

type MessengerActions = ApprovalControllerActions;

type MessengerEvents = ApprovalControllerEvents;

export type ApprovalControllerMessenger = RestrictedMessenger<
  typeof name,
  MessengerActions,
  MessengerEvents,
  MessengerActions['type'],
  MessengerEvents['type']
>;

export function getApprovalControllerMessenger(
  messenger: Messenger<MessengerActions, MessengerEvents>,
): ApprovalControllerMessenger {
  return messenger.getRestricted({
    name,
    allowedActions: [],
    allowedEvents: [],
  });
}
