import type { MessengerClientInitFunction } from '../types';
import {
  QrSyncProvisioningService,
  type QrSyncProvisioningServiceMessenger,
} from '../../QrSync/services/qr-sync-provisioning-service';

/**
 * Initializes the QR sync provisioning service.
 */
export const qrSyncProvisioningServiceInit: MessengerClientInitFunction<
  QrSyncProvisioningService,
  QrSyncProvisioningServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new QrSyncProvisioningService({
    messenger: controllerMessenger,
  });

  return { controller };
};
