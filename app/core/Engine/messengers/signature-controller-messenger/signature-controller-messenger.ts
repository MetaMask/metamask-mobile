import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { SignatureControllerMessenger } from '@metamask/signature-controller';
import { RootMessenger } from '../../types';

export function getSignatureControllerMessenger(
  rootMessenger: RootMessenger,
): SignatureControllerMessenger {
  const messenger = new Messenger<
    'SignatureController',
    MessengerActions<SignatureControllerMessenger>,
    MessengerEvents<SignatureControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SignatureController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getState',
      'ApprovalController:addRequest',
      'LoggingController:add',
      'NetworkController:getNetworkClientById',
      'KeyringController:signMessage',
      'KeyringController:signPersonalMessage',
      'KeyringController:signTypedMessage',
      'GatorPermissionsController:decodePermissionFromPermissionContextForOrigin',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
