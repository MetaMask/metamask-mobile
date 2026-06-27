import {
  KeyringObject,
  KeyringTypes,
  type KeyringControllerState,
} from '@metamask/keyring-controller';
import type { EntropySourceId } from '@metamask/keyring-api';

import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';
import { Authentication } from '../..';
import { defaultQrSyncControllerState } from '../QrSyncController';
import type { QrSyncControllerState } from '../controller-types';
import type {
  QrSyncProvisioningMetadata,
  QrSyncSecretImportEntry,
} from '../types';
import {
  QrSyncProvisioningService,
  type QrSyncProvisioningServiceMessenger,
} from './qr-sync-provisioning-service';
import { KeyringType } from '@metamask/keyring-api/v2';

jest.mock('../../../actions/multiSrp', () => ({
  importNewSecretRecoveryPhrase: jest.fn(),
}));

jest.mock('../..', () => ({
  Authentication: {
    importAccountFromPrivateKey: jest.fn(),
  },
}));

const mockImportNewSecretRecoveryPhrase = jest.mocked(
  importNewSecretRecoveryPhrase,
);
const mockImportAccountFromPrivateKey = jest.mocked(
  Authentication.importAccountFromPrivateKey,
);

const PRIMARY_ENTROPY_SOURCE = 'primary-entropy-source' as EntropySourceId;
const SECONDARY_ENTROPY_SOURCE = 'secondary-entropy-source' as EntropySourceId;
const PRIMARY_ADDRESS = '0x1111111111111111111111111111111111111111';
const SECONDARY_ADDRESS = '0x2222222222222222222222222222222222222222';
const PRIVATE_KEY_ADDRESS = '0x3333333333333333333333333333333333333333';

const createProvisioningMetadata = (): QrSyncProvisioningMetadata => ({
  version: 1,
  entries: [
    {
      index: 0,
      type: 'MNEMONIC',
      isPrimary: true,
      name: 'Primary Wallet',
      groups: [{ groupIndex: 0, name: 'Account 1' }],
    },
    {
      index: 1,
      type: 'MNEMONIC',
      name: 'Secondary Wallet',
      groups: [{ groupIndex: 0, name: 'Account 2' }],
    },
    {
      index: 2,
      type: 'PRIVATE_KEY',
      name: 'Imported PK',
    },
  ],
});

const createPendingSecrets = (): QrSyncSecretImportEntry[] => [
  {
    index: 0,
    type: 'MNEMONIC',
    value: 'primary mnemonic phrase',
    isPrimary: true,
  },
  {
    index: 1,
    type: 'MNEMONIC',
    value: 'secondary mnemonic phrase',
  },
  {
    index: 2,
    type: 'PRIVATE_KEY',
    value: '0xabc123',
  },
];

const createQrSyncState = (
  overrides: Partial<QrSyncControllerState> = {},
): QrSyncControllerState => ({
  ...defaultQrSyncControllerState,
  pendingSecretImports: createPendingSecrets(),
  provisioningMetadata: createProvisioningMetadata(),
  provisioningStatus: 'awaiting_password',
  ...overrides,
});

const createKeyringState = (
  keyringsState: KeyringObject[],
): KeyringControllerState => ({
  isUnlocked: true,
  keyrings: keyringsState,
});

const createMessengerCallMock = (
  qrSyncStateOverrides: Partial<QrSyncControllerState> = {},
  getKeyrings: () => KeyringObject[] = () => [],
): jest.Mock =>
  jest.fn((action: string) => {
    if (action === 'QrSyncController:getState') {
      return createQrSyncState(qrSyncStateOverrides);
    }

    if (action === 'KeyringController:getState') {
      return createKeyringState(getKeyrings());
    }

    return undefined;
  });

interface MockProvisioningMessenger {
  call: jest.Mock;
  registerActionHandler: jest.Mock;
}

const asProvisioningMessenger = (
  mock: MockProvisioningMessenger,
): QrSyncProvisioningServiceMessenger =>
  mock as unknown as QrSyncProvisioningServiceMessenger;

describe('QrSyncProvisioningService', () => {
  let mockMessenger: MockProvisioningMessenger;
  let service: QrSyncProvisioningService;
  let keyrings: KeyringObject[];

  beforeEach(() => {
    jest.clearAllMocks();

    keyrings = [
      {
        type: KeyringType.Hd,
        metadata: {
          id: PRIMARY_ENTROPY_SOURCE,
          name: 'Primary Entropy Source',
        },
        accounts: [PRIMARY_ADDRESS],
      },
      {
        type: KeyringType.Hd,
        metadata: {
          id: SECONDARY_ENTROPY_SOURCE,
          name: 'Secondary Entropy Source',
        },
        accounts: [SECONDARY_ADDRESS],
      },
    ];

    mockMessenger = {
      call: createMessengerCallMock({}, () => keyrings),
      registerActionHandler: jest.fn(),
    };

    service = new QrSyncProvisioningService({
      messenger: asProvisioningMessenger(mockMessenger),
    });

    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: SECONDARY_ADDRESS,
      discoveredAccountsCount: 0,
    });
    mockImportAccountFromPrivateKey.mockImplementation(async () => {
      keyrings.push({
        type: KeyringType.PrivateKey,
        metadata: { id: 'simple-keyring', name: 'Simple Keyring' },
        accounts: [PRIVATE_KEY_ADDRESS],
      });
      return true;
    });
  });

  it('registers importRemainingSecrets on the service messenger', () => {
    expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
      'QrSyncProvisioningService:importRemainingSecrets',
      expect.any(Function),
    );
  });

  describe('importRemainingSecrets', () => {
    it('imports secondary secrets, enriches metadata, and completes provisioning', async () => {
      await service.importRemainingSecrets();

      expect(mockImportNewSecretRecoveryPhrase).toHaveBeenCalledWith(
        'secondary mnemonic phrase',
        { shouldSelectAccount: false, skipDiscovery: true },
      );
      expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith('0xabc123', {
        shouldSelectAccount: false,
        shouldCreateSocialBackup: false,
      });
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'QrSyncController:completeSecretImport',
        {
          version: 1,
          entries: [
            expect.objectContaining({
              index: 0,
              type: 'MNEMONIC',
              entropySource: PRIMARY_ENTROPY_SOURCE,
            }),
            expect.objectContaining({
              index: 1,
              type: 'MNEMONIC',
              entropySource: SECONDARY_ENTROPY_SOURCE,
            }),
            expect.objectContaining({
              index: 2,
              type: 'PRIVATE_KEY',
              accountAddress: PRIVATE_KEY_ADDRESS,
            }),
          ],
        },
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
    });

    it('skips primary mnemonic import and only enriches its entropy source', async () => {
      mockMessenger.call = createMessengerCallMock(
        {
          pendingSecretImports: [
            {
              index: 0,
              type: 'MNEMONIC',
              value: 'primary mnemonic phrase',
              isPrimary: true,
            },
          ],
          provisioningMetadata: {
            version: 1,
            entries: [
              {
                index: 0,
                type: 'MNEMONIC',
                isPrimary: true,
                name: 'Primary Wallet',
              },
            ],
          },
        },
        () => keyrings,
      );

      await service.importRemainingSecrets();

      expect(mockImportNewSecretRecoveryPhrase).not.toHaveBeenCalled();
      expect(mockImportAccountFromPrivateKey).not.toHaveBeenCalled();
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'QrSyncController:completeSecretImport',
        {
          version: 1,
          entries: [
            expect.objectContaining({
              index: 0,
              entropySource: PRIMARY_ENTROPY_SOURCE,
            }),
          ],
        },
      );
    });

    it('marks provisioning failed and rethrows when secondary mnemonic import fails', async () => {
      const importError = new Error('Secondary import failed');
      mockImportNewSecretRecoveryPhrase.mockRejectedValue(importError);

      await expect(service.importRemainingSecrets()).rejects.toThrow(
        importError,
      );

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'QrSyncController:completeSecretImport',
        expect.anything(),
      );
    });

    it('throws when provisioning status is not awaiting_password', async () => {
      mockMessenger.call = createMessengerCallMock(
        {
          provisioningStatus: 'secrets_imported',
        },
        () => keyrings,
      );

      await expect(service.importRemainingSecrets()).rejects.toThrow(
        'QR sync provisioning requires provisioningStatus awaiting_password',
      );

      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
    });
  });
});
