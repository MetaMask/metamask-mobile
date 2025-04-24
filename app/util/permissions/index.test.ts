import Engine from '../../core/Engine';
import { CaveatSpecificationConstraint, ExtractPermission, PermissionSpecificationConstraint, SubjectPermissions } from '@metamask/permission-controller';
import { Caip25CaveatType, Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { PermissionKeys } from '../../core/Permissions/specifications';
import { pick } from 'lodash';
import { CaveatTypes } from '../../core/Permissions/constants';
import { getCaip25PermissionFromLegacyPermissions, requestPermittedChainsPermissionIncremental } from './index';


jest.mock('../../core/Engine', () => ({
  context: {
    PermissionController: {
      requestPermissionsIncremental: jest.fn(),
      grantPermissionsIncremental: jest.fn(),
    },
  },
}));

const mockRequestPermissionsIncremental = Engine.context.PermissionController.requestPermissionsIncremental as jest.Mock;
const mockGrantPermissionsIncremental = Engine.context.PermissionController.grantPermissionsIncremental as jest.Mock;

describe('Permission Utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermittedChainsPermissionIncremental', () => {
    it('throws if the origin is snapId', async () => {
      await expect(() =>
        requestPermittedChainsPermissionIncremental({
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

      mockRequestPermissionsIncremental.
        mockResolvedValue([
          subjectPermissions,
          { id: 'id', origin: 'origin' },
        ]);

      await requestPermittedChainsPermissionIncremental({
        origin: 'test.com',
        chainId: '0x1',
        autoApprove: false,
      });

      expect(
        mockRequestPermissionsIncremental,
      ).toHaveBeenCalledWith({ origin: 'test.com' }, expectedCaip25Permission);
    });

    it('throws if permittedChains approval is rejected', async () => {
      mockRequestPermissionsIncremental
        .mockRejectedValue(new Error('approval rejected'));

      await expect(() =>
        requestPermittedChainsPermissionIncremental({
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

      mockGrantPermissionsIncremental
        .mockReturnValue(subjectPermissions);

      await requestPermittedChainsPermissionIncremental({
        origin: 'test.com',
        chainId: '0x1',
        autoApprove: true,
      });

      expect(
        mockGrantPermissionsIncremental,
      ).toHaveBeenCalledWith({
        subject: { origin: 'test.com' },
        approvedPermissions: expectedCaip25Permission,
      });
    });

    it('throws if autoApprove: true and granting permittedChains throws', async () => {
      mockGrantPermissionsIncremental.mockImplementation(() => {
        throw new Error('Invalid merged permissions for subject "test.com"');
      });

      await expect(() =>
        requestPermittedChainsPermissionIncremental({
          origin: 'test.com',
          chainId: '0x1',
          autoApprove: true,
        }),
      ).rejects.toThrow(
        new Error('Invalid merged permissions for subject "test.com"'),
      );
    });
  });

  describe('getCaip25PermissionFromLegacyPermissions', () => {
    it('returns valid CAIP-25 permissions', async () => {
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
      const permissions = await getCaip25PermissionFromLegacyPermissions(
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

      const permissions = await getCaip25PermissionFromLegacyPermissions(
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
