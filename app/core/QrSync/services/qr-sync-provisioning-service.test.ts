import type { EntropySourceId } from '@metamask/keyring-api';
import {
  AccountGroupType,
  AccountWalletType,
  type AccountGroupId,
  toMultichainAccountWalletId,
} from '@metamask/account-api';
import type {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';

import {
  QrSyncMessageVersion,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
  QrSyncSyncFlows,
} from '../constants';
import { defaultQrSyncControllerState } from '../QrSyncController';
import type { QrSyncControllerState } from '../controller-types';
import type { QrSyncProvisioningMetadata } from '../types';
import {
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  reportQrSyncFailure,
} from '../qrSyncTelemetry';

jest.mock('@metamask/key-tree', () => ({
  mnemonicPhraseToBytes: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
}));

jest.mock('../qrSyncTelemetry', () => ({
  ...jest.requireActual('../qrSyncTelemetry'),
  reportQrSyncFailure: jest.fn(),
}));

import {
  QrSyncProvisioningService,
  type QrSyncProvisioningServiceMessenger,
} from './qr-sync-provisioning-service';

const mockReportQrSyncFailure = jest.mocked(reportQrSyncFailure);

const PRIMARY_ENTROPY_SOURCE = 'primary-entropy-source' as EntropySourceId;
const SECONDARY_ENTROPY_SOURCE = 'secondary-entropy-source' as EntropySourceId;
const PRIMARY_ADDRESS = '0x1111111111111111111111111111111111111111';
const SECONDARY_ADDRESS = '0x2222222222222222222222222222222222222222';
const PRIVATE_KEY_ADDRESS = '0x3333333333333333333333333333333333333333';
const PRIVATE_KEY_ACCOUNT_ID = 'keyring:private-key-account';
const PRIVATE_KEY_GROUP_ID =
  'keyring:private-key-wallet/group-1' as AccountGroupId;
const PRIVATE_KEY_WALLET_ID = 'keyring:private-key-wallet';

const getEntropyGroupId = (
  wallet: AccountWalletObject,
  groupIndex: number,
): AccountGroupId => `${wallet.id}/${groupIndex}` as AccountGroupId;

const createEntropyWallet = (
  entropySource: EntropySourceId,
  groups: { groupIndex: number; name: string; accountId: string }[],
): AccountWalletObject => {
  const walletId = toMultichainAccountWalletId(entropySource);
  const walletGroups = groups.reduce<Record<string, AccountGroupObject>>(
    (acc, group) => {
      const groupId = `${walletId}/${group.groupIndex}` as AccountGroupId;

      acc[groupId] = {
        id: groupId,
        type: AccountGroupType.MultichainAccount,
        accounts: [group.accountId] as [string, ...string[]],
        metadata: {
          name: group.name,
          pinned: false,
          hidden: false,
          lastSelected: 0,
          entropy: { groupIndex: group.groupIndex },
        },
      } as unknown as AccountGroupObject;

      return acc;
    },
    {},
  );

  return {
    type: AccountWalletType.Entropy,
    id: walletId,
    status: 'ready',
    groups: walletGroups,
    metadata: {
      name: 'Wallet',
      entropy: { id: entropySource },
    },
  } as unknown as AccountWalletObject;
};

const createPrivateKeyWallet = (): AccountWalletObject =>
  ({
    type: AccountWalletType.Keyring,
    id: PRIVATE_KEY_WALLET_ID,
    status: 'ready',
    groups: {
      [PRIVATE_KEY_GROUP_ID]: {
        type: AccountGroupType.SingleAccount,
        id: PRIVATE_KEY_GROUP_ID,
        accounts: [PRIVATE_KEY_ACCOUNT_ID] as [string],
        metadata: {
          name: 'Imported PK',
          pinned: false,
          hidden: false,
          lastSelected: 0,
        },
      },
    },
    metadata: { name: 'Imported PK Wallet' },
  }) as unknown as AccountWalletObject;

const createSecretsImportedMetadata = (): QrSyncProvisioningMetadata => ({
  version: QrSyncMessageVersion.V1,
  entries: [
    {
      index: 0,
      type: QrSyncSecretTypes.MNEMONIC,
      isPrimary: true,
      name: 'Primary Wallet',
      entropySource: PRIMARY_ENTROPY_SOURCE,
      groups: [
        { groupIndex: 0, name: 'Primary Account', pinned: true },
        { groupIndex: 1, name: 'Primary Account 2', hidden: true },
        { groupIndex: 2, name: 'Primary Account 3' },
        { groupIndex: 3, name: 'Primary Account 4' },
      ],
    },
    {
      index: 1,
      type: QrSyncSecretTypes.PRIVATE_KEY,
      name: 'Imported PK',
      accountAddress: PRIVATE_KEY_ADDRESS,
      pinned: false,
    },
  ],
});

const createSecretsImportedState = (
  overrides: Partial<QrSyncControllerState> = {},
): QrSyncControllerState => ({
  ...defaultQrSyncControllerState,
  pendingSecretImports: null,
  provisioningMetadata: createSecretsImportedMetadata(),
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
    expect(mockMessenger.registerActionHandler).toHaveBeenCalledWith(
      'QrSyncProvisioningService:importSecretsToVault',
      expect.any(Function),
    );
  });

  describe('importSecretsToVault', () => {
    const remainingSecrets = [
      {
        index: 1,
        type: QrSyncSecretTypes.MNEMONIC,
        value: 'secondary mnemonic',
      },
      {
        index: 2,
        type: QrSyncSecretTypes.PRIVATE_KEY,
        value: '0xabc',
      },
    ];

    it('imports secrets and enriches metadata via the controller', async () => {
      const mockCall = jest.fn((action: string) => {
        if (
          action === 'MultichainAccountService:createMultichainAccountWallet'
        ) {
          return Promise.resolve({ entropySource: SECONDARY_ENTROPY_SOURCE });
        }

        if (action === 'KeyringController:withKeyringV2') {
          return Promise.resolve(undefined);
        }

        if (action === 'KeyringController:importAccountWithStrategy') {
          return Promise.resolve(PRIVATE_KEY_ADDRESS);
        }

        return undefined;
      });
      mockMessenger.call = mockCall;
      const importService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await importService.importSecretsToVault(remainingSecrets);

      expect(mockCall).toHaveBeenCalledWith(
        'MultichainAccountService:createMultichainAccountWallet',
        {
          type: 'import',
          mnemonic: expect.any(Uint8Array),
        },
      );
      expect(mockCall).toHaveBeenCalledWith(
        'KeyringController:withKeyringV2',
        { id: SECONDARY_ENTROPY_SOURCE },
        expect.any(Function),
      );
      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:enrichProvisioningEntry',
        1,
        { entropySource: SECONDARY_ENTROPY_SOURCE },
      );
      expect(mockCall).toHaveBeenCalledWith(
        'KeyringController:importAccountWithStrategy',
        'privateKey',
        ['abc'],
      );
      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:enrichProvisioningEntry',
        2,
        { accountAddress: PRIVATE_KEY_ADDRESS },
      );
    });

    it('reports unknown secret types with session syncFlow', async () => {
      mockMessenger.call = jest.fn((action: string) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState({
            syncFlow: QrSyncSyncFlows.EXISTING_USER,
          });
        }

        return undefined;
      });
      const importService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await importService.importSecretsToVault([
        {
          index: 0,
          type: 'unknown' as typeof QrSyncSecretTypes.MNEMONIC,
          value: 'ignored',
        },
      ]);

      expect(mockReportQrSyncFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'QrSyncProvisioningService: Unknown secret type',
        }),
        expect.objectContaining({
          surface: QrSyncSurfaces.IMPORT,
          operation: QrSyncOperations.IMPORT_SECRETS_UNKNOWN_TYPE,
          source: QrSyncTelemetrySources.PROVISIONING_IMPORT_SECRETS,
          syncFlow: QrSyncSyncFlows.EXISTING_USER,
          extras: { secretType: 'unknown' },
        }),
      );
    });

    it('reports vault import failures without syncFlow when state lookup fails', async () => {
      mockMessenger.call = jest.fn((action: string) => {
        if (
          action === 'MultichainAccountService:createMultichainAccountWallet'
        ) {
          return Promise.reject(new Error('import mnemonic failed'));
        }

        if (action === 'QrSyncController:getState') {
          throw new Error('state unavailable');
        }

        return undefined;
      });
      const importService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await importService.importSecretsToVault([
        {
          index: 1,
          type: QrSyncSecretTypes.MNEMONIC,
          value: 'secondary mnemonic',
        },
      ]);

      expect(mockReportQrSyncFailure).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          surface: QrSyncSurfaces.IMPORT,
          operation: QrSyncOperations.IMPORT_SECRETS_TO_VAULT,
          source: QrSyncTelemetrySources.PROVISIONING_IMPORT_SECRETS,
        }),
      );
      expect(mockReportQrSyncFailure.mock.calls[0][1]).not.toHaveProperty(
        'syncFlow',
      );
    });

    it('skips private-key enrichment when import returns an empty address', async () => {
      mockMessenger.call = jest.fn((action: string) => {
        if (action === 'KeyringController:importAccountWithStrategy') {
          return Promise.resolve('');
        }

        return undefined;
      });
      const importService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await importService.importSecretsToVault([
        {
          index: 2,
          type: QrSyncSecretTypes.PRIVATE_KEY,
          value: '0xabc',
        },
      ]);

      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'QrSyncController:enrichProvisioningEntry',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('provisionFromMetadata group creation', () => {
    it('batches contiguous group indices above zero into a single range', async () => {
      const contiguousWallet = createEntropyWallet(PRIMARY_ENTROPY_SOURCE, [
        { groupIndex: 0, name: 'Account 1', accountId: 'account-0' },
        { groupIndex: 1, name: 'Account 2', accountId: 'account-1' },
        { groupIndex: 2, name: 'Account 3', accountId: 'account-2' },
        { groupIndex: 3, name: 'Account 4', accountId: 'account-3' },
      ]);
      const contiguousMetadata: QrSyncProvisioningMetadata = {
        version: QrSyncMessageVersion.V1,
        entries: [
          {
            index: 0,
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: true,
            entropySource: PRIMARY_ENTROPY_SOURCE,
            groups: [
              { groupIndex: 0, name: 'Account 1' },
              { groupIndex: 1, name: 'Account 2' },
              { groupIndex: 2, name: 'Account 3' },
              { groupIndex: 3, name: 'Account 4' },
            ],
          },
        ],
      };
      const mockCall = jest.fn((action: string) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState({
            provisioningMetadata: contiguousMetadata,
          });
        }

        if (action === 'AccountTreeController:getAccountWalletObjects') {
          return [contiguousWallet];
        }

        return undefined;
      });
      mockMessenger.call = mockCall;
      const contiguousProvisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await contiguousProvisionService.provisionFromMetadata();

      expect(mockCall).toHaveBeenCalledWith(
        'MultichainAccountService:createMultichainAccountGroups',
        {
          entropySource: PRIMARY_ENTROPY_SOURCE,
          fromGroupIndex: 1,
          toGroupIndex: 3,
        },
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'MultichainAccountService:createMultichainAccountGroup',
        expect.anything(),
      );
    });
  });

  describe('provisionFromMetadata', () => {
    let provisionService: QrSyncProvisioningService;

    const primaryWallet = createEntropyWallet(PRIMARY_ENTROPY_SOURCE, [
      {
        groupIndex: 0,
        name: 'Primary Account',
        accountId: 'primary-account-0',
      },
      {
        groupIndex: 1,
        name: 'Primary Account 2',
        accountId: 'primary-account-1',
      },
      {
        groupIndex: 2,
        name: 'Primary Account 3',
        accountId: 'primary-account-2',
      },
      {
        groupIndex: 3,
        name: 'Primary Account 4',
        accountId: 'primary-account-3',
      },
    ]);

    const createProvisionMessengerCallMock = (
      wallets: AccountWalletObject[] = [
        primaryWallet,
        createPrivateKeyWallet(),
      ],
    ): jest.Mock =>
      jest.fn((action: string, ...args: unknown[]) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState();
        }

        if (action === 'AccountTreeController:getAccountWalletObjects') {
          return wallets;
        }

        if (action === 'AccountsController:getAccountByAddress') {
          return {
            id: PRIVATE_KEY_ACCOUNT_ID,
            address: args[0],
          };
        }

        if (
          action === 'MultichainAccountService:createMultichainAccountGroup' ||
          action === 'MultichainAccountService:createMultichainAccountGroups' ||
          action === 'MultichainAccountService:alignWallet' ||
          action === 'AccountTreeController:syncWithUserStorage'
        ) {
          return undefined;
        }

        return undefined;
      });

    beforeEach(() => {
      mockMessenger.call = createProvisionMessengerCallMock();
      provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });
    });

    it('creates groups, applies metadata, and completes provisioning', async () => {
      const mockCall = mockMessenger.call as jest.Mock;

      await provisionService.provisionFromMetadata();

      expect(mockCall).toHaveBeenCalledWith(
        'MultichainAccountService:createMultichainAccountGroups',
        {
          entropySource: PRIMARY_ENTROPY_SOURCE,
          fromGroupIndex: 1,
          toGroupIndex: 3,
        },
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'MultichainAccountService:createMultichainAccountGroup',
        expect.anything(),
      );
      expect(mockCall).toHaveBeenCalledWith(
        'MultichainAccountService:alignWallet',
        PRIMARY_ENTROPY_SOURCE,
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:setAccountWalletName',
        primaryWallet.id,
        'Primary Wallet',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:setAccountGroupName',
        getEntropyGroupId(primaryWallet, 0),
        'Primary Account',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:setAccountGroupPinned',
        getEntropyGroupId(primaryWallet, 0),
        true,
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:setAccountGroupHidden',
        getEntropyGroupId(primaryWallet, 1),
        true,
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:setAccountGroupName',
        PRIVATE_KEY_GROUP_ID,
        'Imported PK',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AccountTreeController:syncWithUserStorage',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'QrSyncController:completeProvisioning',
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'AccountTreeController:setSelectedAccountGroup',
        expect.anything(),
      );
      expect(mockCall).not.toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
    });

    it('completes provisioning when user storage reconciliation fails', async () => {
      const mockCall = jest.fn((action: string, ...args: unknown[]) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState({
            syncFlow: QrSyncSyncFlows.NEW_USER,
          });
        }

        if (action === 'AccountTreeController:getAccountWalletObjects') {
          return [primaryWallet, createPrivateKeyWallet()];
        }

        if (action === 'AccountsController:getAccountByAddress') {
          return {
            id: PRIVATE_KEY_ACCOUNT_ID,
            address: args[0],
          };
        }

        if (action === 'AccountTreeController:syncWithUserStorage') {
          return Promise.reject(new Error('sync failed'));
        }

        return undefined;
      });
      mockMessenger.call = mockCall;
      provisionService = new QrSyncProvisioningService({
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

    it('marks provisioning failed and rethrows when metadata provisioning fails', async () => {
      mockMessenger.call = jest.fn((action: string) => {
        if (action === 'QrSyncController:getState') {
          return createSecretsImportedState();
        }

        if (action === 'AccountTreeController:getAccountWalletObjects') {
          return [];
        }

        return undefined;
      });

      await expect(provisionService.provisionFromMetadata()).rejects.toThrow(
        `Unable to resolve account tree wallet for entropy source ${PRIMARY_ENTROPY_SOURCE}`,
      );

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'QrSyncController:markProvisioningFailed',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'QrSyncController:completeProvisioning',
      );
    });

    it('throws when provisioning status is not secrets_imported', async () => {
      mockMessenger.call = createMessengerCallMock({
        provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
      });
      provisionService = new QrSyncProvisioningService({
        messenger: asProvisioningMessenger(mockMessenger),
      });

      await expect(provisionService.provisionFromMetadata()).rejects.toThrow(
        `QR sync metadata provisioning requires provisioningStatus ${QrSyncProvisioningStatuses.SECRETS_IMPORTED}`,
      );
    });
  });
});
