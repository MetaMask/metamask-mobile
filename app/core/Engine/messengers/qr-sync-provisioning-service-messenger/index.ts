import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';

import type { QrSyncProvisioningServiceMessenger } from '../../../QrSync/services/qr-sync-provisioning-service';
import type { RootMessenger } from '../../types';

/**
 * Creates the messenger client used by the QR sync provisioning service.
 */
export function getQrSyncProvisioningServiceMessenger(
  rootMessenger: RootMessenger,
): QrSyncProvisioningServiceMessenger {
  const messenger = new Messenger<
    'QrSyncProvisioningService',
    MessengerActions<QrSyncProvisioningServiceMessenger>,
    MessengerEvents<QrSyncProvisioningServiceMessenger>,
    RootMessenger
  >({
    namespace: 'QrSyncProvisioningService',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      'QrSyncController:getState',
      'QrSyncController:enrichProvisioningEntry',
      'QrSyncController:markProvisioningFailed',
      'QrSyncController:completeProvisioning',
      'MultichainAccountService:createMultichainAccountGroup',
      'MultichainAccountService:createMultichainAccountGroups',
      'MultichainAccountService:createMultichainAccountWallet',
      'MultichainAccountService:alignWallet',
      'KeyringController:withKeyringV2',
      'KeyringController:importAccountWithStrategy',
      'AccountTreeController:getAccountWalletObjects',
      'AccountTreeController:syncWithUserStorage',
      'AccountTreeController:setAccountWalletName',
      'AccountTreeController:setAccountGroupName',
      'AccountTreeController:setAccountGroupPinned',
      'AccountTreeController:setAccountGroupHidden',
      'AccountsController:getAccountByAddress',
    ],
  });

  return messenger;
}
