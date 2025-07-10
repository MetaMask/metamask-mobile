import Engine from '../../core/Engine';
import { CaveatSpecificationConstraint, ExtractPermission, PermissionSpecificationConstraint, SubjectPermissions } from '@metamask/permission-controller';
import { Caip25CaveatType, Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { PermissionKeys } from '../../core/Permissions/specifications';
import { pick } from 'lodash';
import { CaveatTypes } from '../../core/Permissions/constants';
import {
  getCaip25PermissionFromLegacyPermissions,
  getChangedAuthorization,
  getRemovedAuthorization,
  rejectOriginApprovals,
  requestPermittedChainsPermissionIncremental
} from '.';
import { providerErrors } from '@metamask/rpc-errors';
import { ApprovalRequest } from '@metamask/approval-controller';
import { Json } from '@metamask/utils';

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    ApprovalController: {
      reject: jest.fn(),
      state: {
        pendingApprovals: {}
      }
    },
    PermissionController: {
      requestPermissionsIncremental: jest.fn(),
      grantPermissionsIncremental: jest.fn(),
    },
  },
}));

const mockRequestPermissionsIncremental = Engine.context.PermissionController.requestPermissionsIncremental as jest.Mock;
const mockGrantPermissionsIncremental = Engine.context.PermissionController.grantPermissionsIncremental as jest.Mock;
const mockReject = Engine.context.ApprovalController.reject as jest.Mock;

describe('Permission Utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermittedChainsPermissionIncremental', () => {
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
                    'eip155:100': {
                      accounts: [],
                    },
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

    it('returns approval from the PermissionsController for eth_accounts and permittedChains when both eth_accounts and permittedChains are specified in params and origin is snapId', async () => {
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
                    'eip155:100': {
                      accounts: [
                        'eip155:100:0x0000000000000000000000000000000000000001'
                      ],
                    },
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

    it('returns CAIP-25 approval with approved accounts for the `wallet:eip155` scope with isMultichainOrigin: false if origin is snapId', async () => {
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
                    'eip155:1': {
                      accounts: ['eip155:1:0xdeadbeef'],
                    },
                    'eip155:5': {
                      accounts: ['eip155:5:0xdeadbeef'],
                    },
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

  describe('rejectOriginApprovals', () => {
    const id = '123';
    const origin = 'https://example.com';

    beforeEach(() => {
      Engine.context.ApprovalController.state.pendingApprovals = { [id]: { id, origin } as ApprovalRequest<Record<string, Json>> };
    });

    afterEach(() => {
      Engine.context.ApprovalController.state.pendingApprovals = {};
    });

    it('rejects approval requests from given origin', () => {
      const mockId = '123';
      rejectOriginApprovals({
        deleteInterface: () => undefined,
        origin: 'https://example.com',
      });

      expect(mockReject).toHaveBeenCalledTimes(1);
      expect(mockReject).toHaveBeenCalledWith(
        mockId,
        providerErrors.userRejectedRequest(),
      );
    });
  });

  describe('getChangedAuthorization', () => {
    it('returns the new authorization if the previous value is undefined', () => {
      const newAuth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getChangedAuthorization(newAuth, undefined)).toStrictEqual(expect.objectContaining({
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
      }));
    });

    it('returns empty scopes if the new and previous values are the same', () => {
      const auth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getChangedAuthorization(auth, auth)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns the current values of changed scopes', () => {
      const previousAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: ['eip155:1:0xdead' as const],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
          'eip155:10': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      const newAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: ['eip155:1:0xbeef' as const],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: ['eip155:5:0x123' as const],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getChangedAuthorization(newAuth, previousAuth)).toStrictEqual(expect.objectContaining({
        requiredScopes: {
          'eip155:1': {
            accounts: ['eip155:1:0xbeef'],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: ['eip155:5:0x123'],
          },
        },
      }));
    });
  });

  describe('getRemovedAuthorization', () => {
    it('returns empty scopes if the previous value is undefined', () => {
      const newAuth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(newAuth, undefined)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns empty scopes if the new and previous values are the same', () => {
      const auth = {
        requiredScopes: { 'eip155:1': { accounts: [] } },
        optionalScopes: {},
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(auth, auth)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {},
      });
    });

    it('returns the removed scopes in authorizations', () => {
      const previousAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
          'eip155:10': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      const newAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {
          'eip155:10': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(newAuth, previousAuth)).toStrictEqual({
        requiredScopes: {},
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
        },
      });
    });

    it('returns all previous scopes when authorization is completely removed', () => {
      const previousAuth = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {
          'eip155:5': {
            accounts: [],
          },
        },
        isMultichainOrigin: true,
        sessionProperties: {},
      };

      expect(getRemovedAuthorization(undefined, previousAuth)).toStrictEqual(
        expect.objectContaining({
          requiredScopes: {
            'eip155:1': {
              accounts: [],
            },
          },
          optionalScopes: {
            'eip155:5': {
              accounts: [],
            },
          },
        })
      );
    });
  });
});
