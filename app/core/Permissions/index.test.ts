import * as permissions from '.'; // eslint-disable-line import/no-namespace
import { captureException } from '@sentry/react-native';
import Logger from '../../util/Logger';
import TransactionTypes from '../TransactionTypes';
import Engine from '../Engine';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getEthAccounts,
  setChainIdsInCaip25CaveatValue,
  setNonSCACaipAccountIdsInCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import {
  Caveat,
  PermissionDoesNotExistError,
  PermissionSubjectEntry,
  ValidPermission,
} from '@metamask/permission-controller';
import {
  getPermittedEvmAddressesByHostname,
  getPermittedCaipAccountIdsByHostname,
  getPermittedCaipChainIdsByHostname,
  getDefaultCaip25CaveatValue,
  getCaip25Caveat,
  addPermittedAccounts,
  removePermittedAccounts,
  removeAccountsFromPermissions,
  updatePermittedChains,
  sortEvmAccountsByLastSelected,
  sortMultichainAccountsByLastSelected,
  getPermittedAccounts,
  removePermittedChain,
} from '.';
import { CaipAccountId, CaipChainId, Hex, Json } from '@metamask/utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('@metamask/chain-agnostic-permission', () => ({
  ...jest.requireActual('@metamask/chain-agnostic-permission'),
  getEthAccounts: jest.fn(),
  getPermittedEthChainIds: jest.fn(),
  setChainIdsInCaip25CaveatValue: jest.fn(),
  setNonSCACaipAccountIdsInCaip25CaveatValue: jest.fn(),
}));

const mockGetCaveat = Engine.context.PermissionController
  .getCaveat as jest.Mock;
const mockListAccounts = Engine.context.AccountsController
  .listAccounts as jest.Mock;
const mockListMultichainAccounts = Engine.context.AccountsController
  .listMultichainAccounts as jest.Mock;
const mockGetAccountByAddress = Engine.context.AccountsController
  .getAccountByAddress as jest.Mock;
const mockIsUnlocked = Engine.context.KeyringController.isUnlocked as jest.Mock;

// Mock process.env
process.env.MM_FOX_CODE = 'metamask';

describe('Permission Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermittedEvmAddressesByHostname', () => {
    it('should return accounts for a given hostname', () => {
      const mockState = {
        subjects: {
          'https://example.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {},
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
          'https://another.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {},
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const mockAccounts1: Hex[] = ['0x1', '0x2'];
      const mockAccounts2: Hex[] = ['0x3', '0x4'];

      mockListAccounts.mockReturnValue(
        [...mockAccounts1, ...mockAccounts2].map((a, i) => ({
          address: a,
          metadata: { lastSelected: 1 - i },
        })),
      );

      // Mock getEthAccounts for different subjects
      (getEthAccounts as jest.Mock).mockImplementation((value) => {
        if (
          value ===
          mockState.subjects['https://example.com'].permissions[
            Caip25EndowmentPermissionName
          ].caveats[0].value
        ) {
          return mockAccounts1;
        }
        return mockAccounts2;
      });

      const result = getPermittedEvmAddressesByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual(mockAccounts1);
    });

    it('should return empty array if hostname has no accounts', () => {
      const mockState = {
        subjects: {
          'https://example.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {},
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
        },
      };

      // Mock sortEvmAccountsByLastSelected to return empty array
      jest
        .spyOn(permissions, 'sortEvmAccountsByLastSelected')
        .mockReturnValue([]);

      const result = getPermittedEvmAddressesByHostname(
        mockState,
        'https://nonexistent.com',
      );
      expect(result).toEqual([]);
    });

    it('should handle subjects without permissions', () => {
      const mockState = {
        subjects: {
          'https://example.com': {},
        },
      };

      const result = getPermittedEvmAddressesByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual([]);
    });
  });

  describe('getPermittedCaipAccountIdsByHostname', () => {
    it('should return accounts for a given hostname', () => {
      const mockState = {
        subjects: {
          'https://example.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {},
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          'https://another.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {},
                      requiredScopes: {
                        'eip155:1': {
                          accounts: ['eip155:1:0x3', 'eip155:1:0x4'],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getPermittedCaipAccountIdsByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual(['eip155:1:0x1', 'eip155:1:0x2']);
    });

    it('should return empty array if hostname has no accounts', () => {
      const mockState = {
        subjects: {
          'https://example.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {},
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
        },
      };

      // Mock sortEvmAccountsByLastSelected to return empty array
      jest
        .spyOn(permissions, 'sortEvmAccountsByLastSelected')
        .mockReturnValue([]);

      const result = getPermittedCaipAccountIdsByHostname(
        mockState,
        'https://nonexistent.com',
      );
      expect(result).toEqual([]);
    });

    it('should handle subjects without permissions', () => {
      const mockState = {
        subjects: {
          'https://example.com': {},
        },
      };

      const result = getPermittedCaipAccountIdsByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual([]);
    });
  });

  describe('getPermittedCaipChainIdsByHostname', () => {
    it('should return caip chainIds for a given hostname', () => {
      const mockState = {
        subjects: {
          'https://example.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {
                        'eip155:1': {
                          accounts: [],
                        },
                        'eip155:2': {
                          accounts: [],
                        },
                      },
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
          'https://another.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {
                        'eip155:3': {
                          accounts: [],
                        },
                      },
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getPermittedCaipChainIdsByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual(['eip155:1', 'eip155:2']);
    });

    it('should return empty array if hostname has no eth chainIds', () => {
      const mockState = {
        subjects: {
          'https://example.com': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {
                        wallet: {
                          accounts: [],
                        },
                      },
                      requiredScopes: {},
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const result = getPermittedCaipChainIdsByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual([]);
    });

    it('should handle subjects without permissions', () => {
      const mockState = {
        subjects: {
          'https://example.com': {},
        },
      };

      const result = getPermittedCaipChainIdsByHostname(
        mockState,
        'https://example.com',
      );
      expect(result).toEqual([]);
    });
  });

  describe('getDefaultCaip25CaveatValue', () => {
    it('should return default caveat value', () => {
      const result = getDefaultCaip25CaveatValue();
      expect(result).toEqual({
        requiredScopes: {},
        optionalScopes: { 'wallet:eip155': { accounts: [] } },
        sessionProperties: {},
        isMultichainOrigin: false,
      });
    });
  });

  describe('getCaip25Caveat', () => {
    it('should return caveat when it exists', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {},
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaveat.mockReturnValue(mockCaveat);

      const result = getCaip25Caveat('https://example.com');
      expect(result).toEqual(mockCaveat);
      expect(
        Engine.context.PermissionController.getCaveat,
      ).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );
    });

    it('should return undefined when permission does not exist', () => {
      mockGetCaveat.mockImplementation(() => {
        throw new PermissionDoesNotExistError(
          'Permission does not exist',
          Caip25EndowmentPermissionName,
        );
      });

      const result = getCaip25Caveat('https://example.com');
      expect(result).toBeUndefined();
    });

    it('should throw error for other errors', () => {
      const error = new Error('Some other error');
      mockGetCaveat.mockImplementation(() => {
        throw error;
      });

      expect(() => getCaip25Caveat('https://example.com')).toThrow(error);
    });
  });

  describe('addPermittedAccounts', () => {
    it('should add accounts to permitted accounts', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const newAccounts: CaipAccountId[] = ['eip155:0:0x3', 'eip155:0:0x4'];

      mockGetCaveat.mockReturnValue(mockCaveat);

      (setChainIdsInCaip25CaveatValue as jest.Mock).mockReturnValue({
        ...mockCaveat.value,
        // The updated accounts would be here in the real implementation
      });

      (setNonSCACaipAccountIdsInCaip25CaveatValue as jest.Mock).mockReturnValue(
        {
          ...mockCaveat.value,
          // The updated accounts would be here in the real implementation
        },
      );

      addPermittedAccounts('https://example.com', newAccounts);

      expect(setNonSCACaipAccountIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:1:0x1', 'eip155:1:0x2', ...newAccounts],
      );
      expect(
        Engine.context.PermissionController.updateCaveat,
      ).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
        expect.anything(),
      );
    });

    it('should throw error if no permission exists', () => {
      mockGetCaveat.mockReturnValue(undefined);

      expect(() =>
        addPermittedAccounts('https://example.com', ['eip155:0:0x1']),
      ).toThrow(
        'Cannot add account permissions for origin "https://example.com": no permission currently exists for this origin.',
      );
    });
  });

  describe('removePermittedAccounts', () => {
    it('should remove accounts from permitted accounts', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const accountsToRemove: Hex[] = ['0x2', '0x3'];

      mockGetAccountByAddress.mockImplementation((address) => ({
        address,
        scopes: ['eip155:0'],
      }));
      mockGetCaveat.mockReturnValue(mockCaveat);
      (setNonSCACaipAccountIdsInCaip25CaveatValue as jest.Mock).mockReturnValue(
        {
          ...mockCaveat.value,
          // The updated accounts would be here in the real implementation
        },
      );

      removePermittedAccounts('https://example.com', accountsToRemove);

      expect(setNonSCACaipAccountIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:1:0x1'],
      );
      expect(
        Engine.context.PermissionController.updateCaveat,
      ).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
        expect.anything(),
      );
    });

    it('should revoke permission if no accounts remain', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const accountsToRemove: Hex[] = ['0x1', '0x2'];

      mockGetAccountByAddress.mockImplementation((address) => ({
        address,
        scopes: ['eip155:0'],
      }));

      mockGetCaveat.mockReturnValue(mockCaveat);

      removePermittedAccounts('https://example.com', accountsToRemove);

      expect(
        Engine.context.PermissionController.revokePermission,
      ).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
      );
      expect(
        Engine.context.PermissionController.updateCaveat,
      ).not.toHaveBeenCalled();
    });

    it('should throw error if no permission exists', () => {
      // Mock getCaip25Caveat to return undefined
      mockGetCaveat.mockReturnValue(undefined);

      expect(() =>
        removePermittedAccounts('https://example.com', ['0x1']),
      ).toThrow(
        'Cannot remove accounts "0x1": No permissions exist for origin "https://example.com".',
      );
    });

    it('should do nothing if accounts to remove are not in permitted accounts', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const accountsToRemove: Hex[] = ['0x3', '0x4'];

      mockGetAccountByAddress.mockImplementation((address) => ({
        address,
        scopes: ['eip155:0'],
      }));

      mockGetCaveat.mockReturnValue(mockCaveat);

      removePermittedAccounts('https://example.com', accountsToRemove);

      expect(
        Engine.context.PermissionController.updateCaveat,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.PermissionController.revokePermission,
      ).not.toHaveBeenCalled();
    });
  });

  describe('removeAccountsFromPermissions', () => {
    it('should remove accounts from all subjects', async () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const ethAccounts: Hex[] = ['0x1', '0x2'];
      Engine.context.PermissionController.state.subjects = {
        'https://example.com': {} as PermissionSubjectEntry<
          ValidPermission<string, Caveat<string, Json>>
        >,
        'https://another.com': {} as PermissionSubjectEntry<
          ValidPermission<string, Caveat<string, Json>>
        >,
      };

      mockGetCaveat.mockReturnValue(mockCaveat);

      (getEthAccounts as jest.Mock).mockReturnValue(ethAccounts);

      // Mock removePermittedAccounts
      const removePermittedAccountsSpy = jest
        .spyOn(Engine.context.PermissionController, 'revokePermission')
        .mockImplementation();

      await removeAccountsFromPermissions(ethAccounts);

      expect(removePermittedAccountsSpy).toHaveBeenCalledTimes(2);
      expect(removePermittedAccountsSpy).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
      );
      expect(removePermittedAccountsSpy).toHaveBeenCalledWith(
        'https://another.com',
        Caip25EndowmentPermissionName,
      );
    });

    it('should continue and not log errors if caip-25 endowment is not found for subject', async () => {
      Engine.context.PermissionController.state.subjects = {
        'https://example.com': {} as PermissionSubjectEntry<
          ValidPermission<string, Caveat<string, Json>>
        >,
        'https://another.com': {} as PermissionSubjectEntry<
          ValidPermission<string, Caveat<string, Json>>
        >,
      };

      // Mock getCaip25Caveat return undefined
      mockGetCaveat.mockReturnValue(undefined);

      await removeAccountsFromPermissions(['0x1', '0x2']);

      expect(Logger.log).not.toHaveBeenCalled();
    });

    it('should log errors if removing accounts fails', async () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x1', 'eip155:1:0x2'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const ethAccounts: Hex[] = ['0x1', '0x2'];
      Engine.context.PermissionController.state.subjects = {
        'https://example.com': {} as PermissionSubjectEntry<
          ValidPermission<string, Caveat<string, Json>>
        >,
        'https://another.com': {} as PermissionSubjectEntry<
          ValidPermission<string, Caveat<string, Json>>
        >,
      };

      mockGetCaveat.mockReturnValue(mockCaveat);

      (getEthAccounts as jest.Mock).mockReturnValue(ethAccounts);

      mockGetAccountByAddress.mockImplementation(() => {
        throw new Error('something unexpected happened');
      });

      await removeAccountsFromPermissions(['0x1', '0x2']);

      expect(Logger.log).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to remove account from permissions after deleting account from wallet.',
      );
    });
  });

  describe('updatePermittedChains', () => {
    it('should add chains to permitted chains', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x123'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const newChainIds: CaipChainId[] = ['eip155:10'];

      mockGetCaveat.mockReturnValue(mockCaveat);

      (setChainIdsInCaip25CaveatValue as jest.Mock).mockReturnValue({
        ...mockCaveat.value,
        // The updated chains would be here in the real implementation
      });

      (setNonSCACaipAccountIdsInCaip25CaveatValue as jest.Mock).mockReturnValue(
        {
          ...mockCaveat.value,
          // The updated chains would be here in the real implementation
        },
      );

      updatePermittedChains('https://example.com', newChainIds);

      expect(setChainIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:1', 'eip155:10'],
      );
      expect(setNonSCACaipAccountIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:1:0x123'],
      );
      expect(
        Engine.context.PermissionController.updateCaveat,
      ).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
        expect.anything(),
      );
    });

    it('should add chains and remove existing chain permissions if "shouldRemoveExistingChainPermissions" is passed', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x123'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const shouldRemoveExistingChainPermissions = true;

      mockGetCaveat.mockReturnValue(mockCaveat);

      (setChainIdsInCaip25CaveatValue as jest.Mock).mockReturnValue({
        ...mockCaveat.value,
        // The updated chains would be here in the real implementation
      });

      (setNonSCACaipAccountIdsInCaip25CaveatValue as jest.Mock).mockReturnValue(
        {
          ...mockCaveat.value,
          // The updated chains would be here in the real implementation
        },
      );

      updatePermittedChains(
        'https://example.com',
        ['eip155:10'],
        shouldRemoveExistingChainPermissions,
      );

      expect(setChainIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:10'],
      );
      expect(setNonSCACaipAccountIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:1:0x123'],
      );
      expect(
        Engine.context.PermissionController.updateCaveat,
      ).toHaveBeenCalledWith(
        'https://example.com',
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
        expect.anything(),
      );
    });

    it('should throw error if no permission exists', () => {
      // Mock getCaip25Caveat to return undefined
      mockGetCaveat.mockReturnValue(undefined);

      expect(() =>
        updatePermittedChains('https://example.com', ['eip155:1']),
      ).toThrow(
        'Cannot add chain permissions for origin "https://example.com": no permission currently exists for this origin.',
      );
    });
  });

  describe('sortEvmAccountsByLastSelected', () => {
    it('should sort accounts by lastSelected timestamp', () => {
      const accounts: Hex[] = ['0x1', '0x2', '0x3'];
      const internalAccounts = [
        {
          address: '0x1',
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          metadata: { lastSelected: 300 },
        },
        {
          address: '0x3',
          metadata: { lastSelected: 200 },
        },
      ];

      mockListAccounts.mockReturnValue(internalAccounts);

      const result = sortEvmAccountsByLastSelected(accounts);
      expect(result).toEqual(['0x2', '0x3', '0x1']);
    });

    it('should handle accounts with undefined lastSelected', () => {
      const accounts: Hex[] = ['0x1', '0x2', '0x3'];
      const internalAccounts = [
        {
          address: '0x1',
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          metadata: { lastSelected: undefined },
        },
        {
          address: '0x3',
          metadata: { lastSelected: 200 },
        },
      ];

      mockListAccounts.mockReturnValue(internalAccounts);

      const result = sortEvmAccountsByLastSelected(accounts);
      expect(result).toEqual(['0x3', '0x1', '0x2']);
    });

    it('should handle accounts with same lastSelected value', () => {
      const accounts: Hex[] = ['0x1', '0x2', '0x3'];
      const internalAccounts = [
        {
          address: '0x1',
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x3',
          metadata: { lastSelected: 200 },
        },
      ];

      mockListAccounts.mockReturnValue(internalAccounts);

      const result = sortEvmAccountsByLastSelected(accounts);
      // We don't assert the exact order for accounts with the same lastSelected value
      expect(result).toContain('0x1');
      expect(result).toContain('0x2');
      expect(result).toContain('0x3');
      expect(result[0]).toBe('0x3'); // The one with highest lastSelected should be first
    });

    it('should throw error if account is missing from identities', () => {
      const accounts: Hex[] = ['0x1', '0x2', '0x3'];
      const internalAccounts = [
        {
          address: '0x1',
          metadata: { lastSelected: 100 },
        },
        // 0x2 is missing
        {
          address: '0x3',
          metadata: { lastSelected: 200 },
        },
      ];

      mockListAccounts.mockReturnValue(internalAccounts);
      (
        Engine.context.KeyringController.getAccountKeyringType as jest.Mock
      ).mockResolvedValue('Simple Key Pair');

      expect(() => sortEvmAccountsByLastSelected(accounts)).toThrow(
        'Missing identity for address: "0x2".',
      );
      expect(captureException).toHaveBeenCalled();
    });

    it('should handle case insensitive address comparison', () => {
      const accounts: Hex[] = [
        '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
      ];
      const internalAccounts = [
        {
          address: '0xC4955C0D639D99699BFD7EC54D9FAFEE40E4D272', // Uppercase
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          metadata: { lastSelected: 300 },
        },
        {
          address: '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
          metadata: { lastSelected: 200 },
        },
      ];

      mockListAccounts.mockReturnValue(internalAccounts);

      const result = sortEvmAccountsByLastSelected(accounts);
      expect(result).toEqual([
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0x49b6FFd1BD9d1c64EEf400a64a1e4bBC33E2CAB2',
        '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
      ]);
    });
  });

  describe('sortMultichainAccountsByLastSelected', () => {
    it('should sort accounts by lastSelected timestamp', () => {
      const accounts: CaipAccountId[] = [
        'eip155:0:0x1',
        'eip155:0:0x2',
        'eip155:0:0x3',
      ];
      const internalAccounts = [
        {
          address: '0x1',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 300 },
        },
        {
          address: '0x3',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 200 },
        },
      ];

      mockListMultichainAccounts.mockReturnValue(internalAccounts);

      const result = sortMultichainAccountsByLastSelected(accounts);
      expect(result).toEqual(['eip155:0:0x2', 'eip155:0:0x3', 'eip155:0:0x1']);
    });

    it('should handle accounts with undefined lastSelected', () => {
      const accounts: CaipAccountId[] = [
        'eip155:0:0x1',
        'eip155:0:0x2',
        'eip155:0:0x3',
      ];
      const internalAccounts = [
        {
          address: '0x1',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          scopes: ['eip155:0'],
          metadata: { lastSelected: undefined },
        },
        {
          address: '0x3',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 200 },
        },
      ];

      mockListMultichainAccounts.mockReturnValue(internalAccounts);

      const result = sortMultichainAccountsByLastSelected(accounts);
      expect(result).toEqual(['eip155:0:0x3', 'eip155:0:0x1', 'eip155:0:0x2']);
    });

    it('should handle accounts with same lastSelected value', () => {
      const accounts: CaipAccountId[] = [
        'eip155:0:0x1',
        'eip155:0:0x2',
        'eip155:0:0x3',
      ];
      const internalAccounts = [
        {
          address: '0x1',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x3',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 200 },
        },
      ];

      mockListMultichainAccounts.mockReturnValue(internalAccounts);

      const result = sortMultichainAccountsByLastSelected(accounts);
      // We don't assert the exact order for accounts with the same lastSelected value
      expect(result).toContain('eip155:0:0x1');
      expect(result).toContain('eip155:0:0x2');
      expect(result).toContain('eip155:0:0x3');
      expect(result[0]).toBe('eip155:0:0x3'); // The one with highest lastSelected should be first
    });

    it('should throw error if account is missing from identities', () => {
      const accounts: CaipAccountId[] = [
        'eip155:0:0x1',
        'eip155:0:0x2',
        'eip155:0:0x3',
      ];
      const internalAccounts = [
        {
          address: '0x1',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 100 },
        },
        // 0x2 is missing
        {
          address: '0x3',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 200 },
        },
      ];

      mockListMultichainAccounts.mockReturnValue(internalAccounts);
      (
        Engine.context.KeyringController.getAccountKeyringType as jest.Mock
      ).mockResolvedValue('Simple Key Pair');

      expect(() => sortMultichainAccountsByLastSelected(accounts)).toThrow(
        'Missing identity for address: "eip155:0:0x2".',
      );
      expect(captureException).toHaveBeenCalled();
    });

    it('should handle case insensitive address comparison', () => {
      const accounts: CaipAccountId[] = [
        'eip155:0:0x1',
        'eip155:0:0x2',
        'eip155:0:0x3',
      ];
      const internalAccounts = [
        {
          address: '0X1', // Uppercase
          scopes: ['eip155:0'],
          metadata: { lastSelected: 100 },
        },
        {
          address: '0x2',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 300 },
        },
        {
          address: '0x3',
          scopes: ['eip155:0'],
          metadata: { lastSelected: 200 },
        },
      ];

      mockListMultichainAccounts.mockReturnValue(internalAccounts);

      const result = sortMultichainAccountsByLastSelected(accounts);
      expect(result).toEqual(['eip155:0:0x2', 'eip155:0:0x3', 'eip155:0:0x1']);
    });
  });

  describe('getPermittedAccounts', () => {
    it('should return selected account for internal origins', () => {
      const selectedAccount = {
        address: '0x123',
      };
      (
        Engine.context.AccountsController.getSelectedAccount as jest.Mock
      ).mockReturnValue(selectedAccount);

      const result = getPermittedAccounts(TransactionTypes.MMM);
      expect(result).toEqual(['0x123']);
    });

    it('should return permitted accounts for external origins when wallet is unlocked', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: ['eip155:1:0x123'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const ethAccounts = ['0x1', '0x2', '0x3'];
      const sortedAccounts: Hex[] = ['0x3', '0x1', '0x2'];

      mockListAccounts.mockReturnValue(
        sortedAccounts.map((a, i) => ({
          address: a,
          metadata: { lastSelected: 1 - i },
        })),
      );

      mockGetCaveat.mockReturnValue(mockCaveat);
      mockIsUnlocked.mockReturnValue(true);
      (getEthAccounts as jest.Mock).mockReturnValue(ethAccounts);

      jest
        .spyOn(permissions, 'sortEvmAccountsByLastSelected')
        .mockReturnValue(sortedAccounts);

      const result = getPermittedAccounts('https://example.com');
      expect(result).toEqual(sortedAccounts);
    });

    it('should return empty array for external origins when wallet is locked', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {},
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaveat.mockReturnValue(mockCaveat);
      mockIsUnlocked.mockReturnValue(false);

      const result = getPermittedAccounts('https://example.com');
      expect(result).toEqual([]);
    });

    it('should return permitted accounts for external origins when wallet is locked but ignoreLock is true', () => {
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {},
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      const ethAccounts = ['0x1', '0x2', '0x3'];
      const sortedAccounts: Hex[] = ['0x3', '0x1', '0x2'];

      mockListAccounts.mockReturnValue(
        sortedAccounts.map((a, i) => ({
          address: a,
          metadata: { lastSelected: 1 - i },
        })),
      );
      mockGetCaveat.mockReturnValue(mockCaveat);
      mockIsUnlocked.mockReturnValue(false);
      (getEthAccounts as jest.Mock).mockReturnValue(ethAccounts);

      // Mock sortEvmAccountsByLastSelected
      jest
        .spyOn(permissions, 'sortEvmAccountsByLastSelected')
        .mockReturnValue(sortedAccounts);

      const result = getPermittedAccounts('https://example.com', {
        ignoreLock: true,
      });
      expect(result).toEqual(sortedAccounts);
    });

    it('should return empty array when permission does not exist', () => {
      mockGetCaveat.mockImplementation(() => {
        throw new PermissionDoesNotExistError(
          'Permission does not exist',
          Caip25EndowmentPermissionName,
        );
      });

      const result = getPermittedAccounts('https://example.com');
      expect(result).toEqual([]);
    });

    it('should throw error for other errors', () => {
      const error = new Error('Some other error');
      mockGetCaveat.mockImplementation(() => {
        throw error;
      });

      expect(() => getPermittedAccounts('https://example.com')).toThrow(error);
    });
  });

  describe('removePermittedChain', () => {
    it('removes a chain from permitted chains', () => {
      const hostname = 'example.com';
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: [],
            },
            'eip155:5': {
              accounts: [],
            },
            'eip155:10': {
              accounts: [],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaveat.mockReturnValue(mockCaveat);

      (setChainIdsInCaip25CaveatValue as jest.Mock).mockReturnValue({
        ...mockCaveat.value,
        // The updated accounts would be here in the real implementation
      });

      (setNonSCACaipAccountIdsInCaip25CaveatValue as jest.Mock).mockReturnValue(
        {
          ...mockCaveat.value,
          // The updated accounts would be here in the real implementation
        },
      );

      removePermittedChain(hostname, 'eip155:1');

      expect(setChainIdsInCaip25CaveatValue).toHaveBeenCalledWith(
        mockCaveat.value,
        ['eip155:5', 'eip155:10'],
      );

      expect(
        Engine.context.PermissionController.updateCaveat,
      ).toHaveBeenCalledWith(
        hostname,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
        mockCaveat.value,
      );
    });

    it('does not update permissions if chain is not in permitted chains', async () => {
      const hostname = 'example.com';
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: [],
            },
            'eip155:10': {
              accounts: [],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaveat.mockReturnValue(mockCaveat);

      removePermittedChain(hostname, 'eip155:99');

      expect(
        Engine.context.PermissionController.revokePermission,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.PermissionController.updateCaveat,
      ).not.toHaveBeenCalled();
    });

    it('revokes the permission if the last chain is removed', () => {
      const hostname = 'example.com';
      const mockCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:1': {
              accounts: [],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaveat.mockReturnValue(mockCaveat);

      removePermittedChain(hostname, 'eip155:1');

      expect(
        Engine.context.PermissionController.revokePermission,
      ).toHaveBeenCalledWith(hostname, Caip25EndowmentPermissionName);
    });
  });
});
