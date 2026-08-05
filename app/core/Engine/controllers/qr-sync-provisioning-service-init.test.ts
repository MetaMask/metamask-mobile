import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import type { MessengerClientInitRequest } from '../types';
import {
  QrSyncProvisioningService,
  type QrSyncProvisioningServiceMessenger,
} from '../../QrSync/services/qr-sync-provisioning-service';
import { qrSyncProvisioningServiceInit } from './qr-sync-provisioning-service-init';
import { getQrSyncProvisioningServiceMessenger } from '../messengers/qr-sync-provisioning-service-messenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('qrSyncProvisioningServiceInit', () => {
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<QrSyncProvisioningServiceMessenger>
  >;

  beforeEach(() => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    initRequestMock = {
      ...buildMessengerClientInitRequestMock(baseControllerMessenger),
      controllerMessenger: getQrSyncProvisioningServiceMessenger(
        baseControllerMessenger,
      ),
    };
  });

  it('returns a QrSyncProvisioningService instance', () => {
    const result = qrSyncProvisioningServiceInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(QrSyncProvisioningService);
  });
});
