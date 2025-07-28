import { Messenger } from '@metamask/base-controller';
import type { AccountsControllerGetStateAction } from '@metamask/accounts-controller';
import type { AddApprovalRequest } from '@metamask/approval-controller';
import type { AddLog } from '@metamask/logging-controller';
import {
  KeyringControllerSignMessageAction,
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerSignTypedMessageAction,
} from '@metamask/keyring-controller';
import { NetworkControllerGetNetworkClientByIdAction } from '@metamask/network-controller';

import type { SignatureControllerMessenger } from '@metamask/signature-controller';

type MessengerActions =
  | AccountsControllerGetStateAction
  | AddApprovalRequest
  | AddLog
  | NetworkControllerGetNetworkClientByIdAction
  | KeyringControllerSignMessageAction
  | KeyringControllerSignPersonalMessageAction
  | KeyringControllerSignTypedMessageAction;

type MessengerEvents = never;

export function getSignatureControllerMessenger(
  messenger: Messenger<MessengerActions, MessengerEvents>,
): SignatureControllerMessenger {
  return messenger.getRestricted({
    name: 'SignatureController',
    allowedActions: [
      'AccountsController:getState',
      'ApprovalController:addRequest',
      'LoggingController:add',
      'NetworkController:getNetworkClientById',
      'KeyringController:signMessage',
      'KeyringController:signPersonalMessage',
      'KeyringController:signTypedMessage',
    ],
    allowedEvents: [],
  });
}
