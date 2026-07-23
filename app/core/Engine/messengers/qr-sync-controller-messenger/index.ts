import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';

import {
  QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerMessenger,
} from '../../../QrSync/controller-types';
import type { RootMessenger } from '../../types';

/**
 * Creates the messenger client used by the QR sync controller.
 */
export function getQrSyncControllerMessenger(
  rootMessenger: RootMessenger,
): QrSyncControllerMessenger {
  const messenger = new Messenger<
    typeof QR_SYNC_CONTROLLER_NAME,
    MessengerActions<QrSyncControllerMessenger>,
    MessengerEvents<QrSyncControllerMessenger>,
    RootMessenger
  >({
    namespace: QR_SYNC_CONTROLLER_NAME,
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: ['QrSyncProvisioningService:importSecretsToVault'],
  });

  return messenger;
}
