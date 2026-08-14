import type {
  AccountGroupPayloadId,
  AccountTreePayload,
  AccountWalletPayloadId,
} from '@metamask/account-tree-controller';

jest.mock('@metamask/account-tree-controller', () => {
  const actual = jest.requireActual('@metamask/account-tree-controller');
  return {
    ...actual,
    AccountTreeSnapshot: {
      ...actual.AccountTreeSnapshot,
      deserialize: jest.fn((payload: unknown) => Promise.resolve(payload)),
    },
  };
});

import { QrSyncProvisioningStatuses, QrSyncSyncFlows } from '../constants';
import { defaultQrSyncControllerState } from '../QrSyncController';
import type { QrSyncControllerState } from '../controller-types';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from '../qrSyncTelemetry';

jest.mock('../qrSyncTelemetry', () => ({
  ...jest.requireActual('../qrSyncTelemetry'),
  reportQrSyncFailure: jest.fn(),
}));

import {
  QrSyncProvisioningService,
  type QrSyncProvisioningServiceMessenger,
} from './qr-sync-provisioning-service';

const mockReportQrSyncFailure = jest.mocked(reportQrSyncFailure);

const createPendingPayload = (): AccountTreePayload => ({
  version: 1,
  wallets: [
    {
      id: 'wallet:test' as AccountWalletPayloadId,
      type: 'mnemonic',
      value: [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6],
      metadata: { name: 'Test Wallet' },
      groups: [
        {
          id: 'wallet:test/0' as AccountGroupPayloadId,
          groupIndex: 0,
          metadata: { name: 'Account 1', pinned: false, hidden: false },
        },
      ],
    },
  ],
});

const createSecretsImportedState = (
  overrides: Partial<QrSyncControllerState> = {},
): QrSyncControllerState => ({
  ...defaultQrSyncControllerState,
  pendingPayload: createPendingPayload(),
  provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
  ...overrides,
});

const createMessengerCallMock = (
  qrSyncStateOverrides: Partial<QrSyncControllerState> = {},
): jest.Mock =>
  jest.fn((action: string) => {
    if (action === 'QrSyncController:getState') {
      return createSecretsImportedState(qrSyncStateOverrides);
    }

    return undefined;
  });

interface MockMessenger {
  call: jest.Mock;
  registerActionHandler: jest.Mock;
}

const asProvisioningMessenger = (
  mock: MockMessenger,
): QrSyncProvisioningServiceMessenger =>
  mock as unknown as QrSyncProvisioningServiceMessenger;

describe('QrSyncProvisioningService', () => {
  let mockMessenger: MockMessenger;
  let service: QrSyncProvisioningService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMessenger = {
      call: createMessengerCallMock(),
      registerActionHandler: jest.fn(),
    };

    service = new QrSyncProvisioningService({
      messenger: asProvisioningMessenger(mockMessenger),
    });
  });

  it('registers provisionFromMetadata on the service messenger', () => {
    expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
      'QrSyncProvisioningService:provisionFromMetadata',
      expect.any(Function),
    );
  });

  describe('provisionFromMetadata', () => {
    it('calls importState, syncWithUserStorage, and completes provisioning', async () => {
      const pendingPayload = createPendingPayload();
      const mockCall = jest.fn((action: string) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState({ pendingPayload });
        }
        return undefined;
      });
      mockMessenger.call = mockCall;
      const provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await provisionService.provisionFromMetadata();

      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:importState',
        pendingPayload,
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:syncWithUserStorage',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:completeProvisioning',
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
    });

    it('also accepts awaiting_password status (existing-user path)', async () => {
      const mockCall = jest.fn((action: string) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState({
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
          });
        }
        return undefined;
      });
      mockMessenger.call = mockCall;
      const provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await provisionService.provisionFromMetadata();

      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:importState',
        expect.anything(),
      );
      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:completeProvisioning',
      );
    });

    it('marks provisioning failed and rethrows when importState throws', async () => {
      const mockCall = jest.fn((action: string) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState();
        }
        if (action === 'AccountTreeController:importState') {
          return Promise.reject(new Error('import failed'));
        }
        return undefined;
      });
      mockMessenger.call = mockCall;
      const provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await expect(provisionService.provisionFromMetadata()).rejects.toThrow(
        'import failed',
      );

      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'QrSyncController:completeProvisioning',
      );
    });

    it('completes provisioning when user storage reconciliation fails', async () => {
      const mockCall = jest.fn((action: string, ...args: unknown[]) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState({
            syncFlow: QrSyncSyncFlows.NEW_USER,
          });
        }

        if (action === 'AccountTreeController:syncWithUserStorage') {
          return Promise.reject(new Error('sync failed'));
        }

        return undefined;
      });
      mockMessenger.call = mockCall;
      const provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await provisionService.provisionFromMetadata();

      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:syncWithUserStorage',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:completeProvisioning',
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
      expect(mockReportQrSyncFailure).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          surface: QrSyncSurfaces.IMPORT,
          operation: QrSyncOperations.USER_STORAGE_RECONCILIATION,
          source: QrSyncTelemetrySources.PROVISIONING_RECONCILE,
          syncFlow: QrSyncSyncFlows.NEW_USER,
        }),
      );
    });

    it('throws when provisioningStatus is not awaiting_password or secrets_imported', async () => {
      mockMessenger.call = createMessengerCallMock({
        provisioningStatus: QrSyncProvisioningStatuses.FAILED,
      });
      const provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await expect(provisionService.provisionFromMetadata()).rejects.toThrow(
        `QR sync metadata provisioning requires provisioningStatus ${QrSyncProvisioningStatuses.AWAITING_PASSWORD} or ${QrSyncProvisioningStatuses.SECRETS_IMPORTED}`,
      );
    });

    it('throws when pending payload is null', async () => {
      mockMessenger.call = createMessengerCallMock({
        pendingPayload: null,
      });
      const provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await expect(provisionService.provisionFromMetadata()).rejects.toThrow(
        'QR sync metadata provisioning requires a pending payload',
      );
    });
  });
});
