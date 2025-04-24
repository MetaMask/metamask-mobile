import { WalletDevice } from '@metamask/transaction-controller';
//eslint-disable-next-line import/no-namespace
import * as TransactionControllerUtils from './index';
import Engine from '../../core/Engine';
import { store } from '../../store';
import { RootState } from '../../reducers';
import { CaveatSpecificationConstraint, ExtractPermission, PermissionSpecificationConstraint, SubjectPermissions } from '@metamask/permission-controller';
import { Caip25CaveatType, Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { PermissionKeys } from '../../core/Permissions/specifications';
import { pick } from 'lodash';
import { CaveatTypes } from '../../core/Permissions/constants';

const {
  addTransaction,
  estimateGas,
  getNetworkNonce,
  estimateGasFee,
  ...proxyMethods
} = TransactionControllerUtils;

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      settings: { basicFunctionalityEnabled: true },
    })),
  },
}));

const TRANSACTION_MOCK = { from: '0x0', to: '0x1', value: '0x0' };
const NETWORK_CLIENT_ID_MOCK = 'testNetworkClientId';

const TRANSACTION_OPTIONS_MOCK = {
  deviceConfirmedOn: WalletDevice.MM_MOBILE,
  networkClientId: NETWORK_CLIENT_ID_MOCK,
  origin: 'origin',
};

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      addTransaction: jest.fn(),
      estimateGas: jest.fn(),
      estimateGasFee: jest.fn(),

      // Proxy methods
      handleMethodData: jest.fn(),
      getNonceLock: jest.fn(),
      speedUpTransaction: jest.fn(),
      startIncomingTransactionPolling: jest.fn(),
      stopIncomingTransactionPolling: jest.fn(),
      updateIncomingTransactions: jest.fn(),
      updateSecurityAlertResponse: jest.fn(),
      updateTransaction: jest.fn(),
      wipeTransactions: jest.fn(),
      updateEditableParams: jest.fn(),
    },
  },
}));

describe('Transaction Controller Util', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addTransaction', () => {
    it('should call addTransaction with correct parameters', async () => {
      await addTransaction(TRANSACTION_MOCK, TRANSACTION_OPTIONS_MOCK);

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(TRANSACTION_MOCK, TRANSACTION_OPTIONS_MOCK);
    });
  });

  describe('estimateGas', () => {
    it('should call estimateGas with correct parameters', async () => {
      await estimateGas(TRANSACTION_MOCK, NETWORK_CLIENT_ID_MOCK);

      expect(
        Engine.context.TransactionController.estimateGas,
      ).toHaveBeenCalledWith(TRANSACTION_MOCK, NETWORK_CLIENT_ID_MOCK);
    });
  });

  describe('estimateGasFee', () => {
    it('should call estimateGasFee with correct parameters', async () => {
      await estimateGasFee({
        transactionParams: TRANSACTION_MOCK,
        chainId: '0x1',
      });

      expect(
        Engine.context.TransactionController.estimateGasFee,
      ).toHaveBeenCalledWith({
        transactionParams: TRANSACTION_MOCK,
        chainId: '0x1',
      });
    });
  });

  describe('proxy methods', () => {
    it('should call Transaction controller API methods', () => {
      const proxyMethodsKeys = Object.keys(proxyMethods);
      proxyMethodsKeys.forEach((key) => {
        const proxyMethod = proxyMethods[key as keyof typeof proxyMethods];
        proxyMethod();
        expect(
          Engine.context.TransactionController[
          key as keyof typeof proxyMethods
          ],
        ).toHaveBeenCalled();
      });
    });
  });

  describe('startIncomingTransactionPolling', () => {
    it('should call Transaction controller API method if privacy mode is not enabled', () => {
      TransactionControllerUtils.startIncomingTransactionPolling();
      expect(
        Engine.context.TransactionController.startIncomingTransactionPolling,
      ).toHaveBeenCalled();
    });

    it('should not call Transaction controller API method if privacy mode is enabled', () => {
      jest.spyOn(store, 'getState').mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as RootState);
      TransactionControllerUtils.startIncomingTransactionPolling();
      expect(
        Engine.context.TransactionController.startIncomingTransactionPolling,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateIncomingTransactions', () => {
    it('should call Transaction controller API method is privacy mode is not enabled', () => {
      jest.spyOn(store, 'getState').mockReturnValue({
        settings: { basicFunctionalityEnabled: true },
      } as RootState);
      TransactionControllerUtils.updateIncomingTransactions();
      expect(
        Engine.context.TransactionController.updateIncomingTransactions,
      ).toHaveBeenCalled();
    });

    it('should not call Transaction controller API method is privacy mode is enabled', () => {
      jest.spyOn(store, 'getState').mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as RootState);
      TransactionControllerUtils.updateIncomingTransactions();
      expect(
        Engine.context.TransactionController.updateIncomingTransactions,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getNetworkNonce', () => {
    const nonceMock = 123;
    const fromMock = '0x123';
    const networkClientIdMock = 'testNetworkClientId';

    beforeEach(() => {
      jest.spyOn(Engine.context.TransactionController, 'getNonceLock');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns value from TransactionController', async () => {
      (
        Engine.context.TransactionController.getNonceLock as jest.Mock
      ).mockResolvedValueOnce({
        nextNonce: nonceMock,
        releaseLock: jest.fn(),
      });

      expect(
        await TransactionControllerUtils.getNetworkNonce(
          { from: fromMock },
          networkClientIdMock,
        ),
      ).toBe(nonceMock);

      expect(
        Engine.context.TransactionController.getNonceLock,
      ).toHaveBeenCalledWith(fromMock, networkClientIdMock);
    });

    it('releases nonce lock', async () => {
      const releaseLockMock = jest.fn();

      (
        Engine.context.TransactionController.getNonceLock as jest.Mock
      ).mockResolvedValueOnce({
        nextNonce: nonceMock,
        releaseLock: releaseLockMock,
      });

      await TransactionControllerUtils.getNetworkNonce(
        { from: fromMock },
        networkClientIdMock,
      );

      expect(releaseLockMock).toHaveBeenCalledTimes(1);
    });
  });

  // TODO: [ffmcgee] fix these
  describe('requestPermittedChainsPermissionIncremental', () => {
    it('throws if the origin is snapId', async () => {
      await expect(() =>
        TransactionControllerUtils.requestPermittedChainsPermissionIncremental({
          origin: 'npm:snap',
          chainId: '0x1',
          autoApprove: false,
        }),
      ).rejects.toThrow(
        new Error(
          'Cannot request permittedChains permission for Snaps with origin "npm:snap"',
        ),
      );
    });

    it('requests permittedChains approval if autoApprove: false', async () => {
      const subjectPermissions: Partial<
        SubjectPermissions<
          ExtractPermission<
            PermissionSpecificationConstraint,
            CaveatSpecificationConstraint
          >
        >
      > = {
        [Caip25EndowmentPermissionName]: {
          id: 'id',
          date: 1,
          invoker: 'origin',
          parentCapability: PermissionKeys.permittedChains,
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: { 'eip155:1': { accounts: [] } },
                isMultichainOrigin: false,
                sessionProperties: {},
              },
            },
          ],
        },
      };

      const expectedCaip25Permission = {
        [Caip25EndowmentPermissionName]: pick(
          subjectPermissions[Caip25EndowmentPermissionName],
          'caveats',
        ),
      };

      jest
        .spyOn(
          Engine.context.PermissionController,
          'requestPermissionsIncremental',
        )
        .mockResolvedValue([
          subjectPermissions,
          { id: 'id', origin: 'origin' },
        ]);

      await TransactionControllerUtils.requestPermittedChainsPermissionIncremental({
        origin: 'test.com',
        chainId: '0x1',
        autoApprove: false,
      });

      expect(
        Engine.context.PermissionController.requestPermissionsIncremental,
      ).toHaveBeenCalledWith({ origin: 'test.com' }, expectedCaip25Permission);
    });

    it('throws if permittedChains approval is rejected', async () => {
      jest
        .spyOn(
          Engine.context.PermissionController,
          'requestPermissionsIncremental',
        )
        .mockRejectedValue(new Error('approval rejected'));

      await expect(() =>
        TransactionControllerUtils.requestPermittedChainsPermissionIncremental({
          origin: 'test.com',
          chainId: '0x1',
          autoApprove: false,
        }),
      ).rejects.toThrow(new Error('approval rejected'));
    });

    it('grants permittedChains approval if autoApprove: true', async () => {
      const subjectPermissions: Partial<
        SubjectPermissions<
          ExtractPermission<
            PermissionSpecificationConstraint,
            CaveatSpecificationConstraint
          >
        >
      > = {
        [Caip25EndowmentPermissionName]: {
          id: 'id',
          date: 1,
          invoker: 'origin',
          parentCapability: PermissionKeys.permittedChains,
          caveats: [
            {
              type: Caip25CaveatType,
              value: {
                requiredScopes: {},
                optionalScopes: { 'eip155:1': { accounts: [] } },
                isMultichainOrigin: false,
                sessionProperties: {},
              },
            },
          ],
        },
      };

      const expectedCaip25Permission = {
        [Caip25EndowmentPermissionName]: pick(
          subjectPermissions[Caip25EndowmentPermissionName],
          'caveats',
        ),
      };

      jest
        .spyOn(
          Engine.context.PermissionController,
          'grantPermissionsIncremental',
        )
        .mockReturnValue(subjectPermissions);

      await TransactionControllerUtils.requestPermittedChainsPermissionIncremental({
        origin: 'test.com',
        chainId: '0x1',
        autoApprove: true,
      });

      expect(
        Engine.context.PermissionController.grantPermissionsIncremental,
      ).toHaveBeenCalledWith({
        subject: { origin: 'test.com' },
        approvedPermissions: expectedCaip25Permission,
      });
    });

    it('throws if autoApprove: true and granting permittedChains throws', async () => {
      jest
        .spyOn(
          Engine.context.PermissionController,
          'grantPermissionsIncremental',
        )
        .mockImplementation(() => {
          throw new Error('Invalid merged permissions for subject "test.com"');
        });

      await expect(() =>
        TransactionControllerUtils.requestPermittedChainsPermissionIncremental({
          origin: 'test.com',
          chainId: '0x1',
          autoApprove: true,
        }),
      ).rejects.toThrow(
        new Error('Invalid merged permissions for subject "test.com"'),
      );
    });
  });

  // TODO: [ffmcgee] fix these
  describe.skip('getCaip25PermissionFromLegacyPermissions', () => {
    it('returns valid CAIP-25 permissions', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {},
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for eth_accounts and permittedChains when only eth_accounts is specified in params and origin is not snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsControllerr for eth_accounts and permittedChains when only permittedChains is specified in params and origin is not snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [],
                    },
                    'eip155:100': {
                      accounts: [],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for eth_accounts and permittedChains when both are specified in params and origin is not snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                    'eip155:100': {
                      accounts: [
                        'eip155:100:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for only eth_accounts when only eth_accounts is specified in params and origin is snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'npm:snap',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for only eth_accounts when only permittedChains is specified in params and origin is snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'npm:snap',
        {
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns approval from the PermissionsController for only eth_accounts when both eth_accounts and permittedChains are specified in params and origin is snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'npm:snap',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x0000000000000000000000000000000000000001'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: CaveatTypes.restrictNetworkSwitching,
                value: ['0x64'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: [
                        'wallet:eip155:0x0000000000000000000000000000000000000001',
                      ],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns CAIP-25 approval with accounts and chainIds specified from `eth_accounts` and `endowment:permittedChains` permissions caveats, and isMultichainOrigin: false if origin is not snapId', async () => {
      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        'test.com',
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: 'restrictReturnedAccounts',
                value: ['0xdeadbeef'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: 'restrictNetworkSwitching',
                value: ['0x1', '0x5'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: ['wallet:eip155:0xdeadbeef'],
                    },
                    'eip155:1': {
                      accounts: ['eip155:1:0xdeadbeef'],
                    },
                    'eip155:5': {
                      accounts: ['eip155:5:0xdeadbeef'],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });

    it('returns CAIP-25 approval with approved accounts for the `wallet:eip155` scope (and no approved chainIds) with isMultichainOrigin: false if origin is snapId', async () => {
      const origin = 'npm:snap';

      const permissions = await TransactionControllerUtils.getCaip25PermissionFromLegacyPermissions(
        origin,
        {
          [PermissionKeys.eth_accounts]: {
            caveats: [
              {
                type: 'restrictReturnedAccounts',
                value: ['0xdeadbeef'],
              },
            ],
          },
          [PermissionKeys.permittedChains]: {
            caveats: [
              {
                type: 'restrictNetworkSwitching',
                value: ['0x1', '0x5'],
              },
            ],
          },
        },
      );

      expect(permissions).toStrictEqual(
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: {
                  requiredScopes: {},
                  optionalScopes: {
                    'wallet:eip155': {
                      accounts: ['wallet:eip155:0xdeadbeef'],
                    },
                  },
                  isMultichainOrigin: false,
                  sessionProperties: {},
                },
              },
            ],
          },
        }),
      );
    });
  });

});
