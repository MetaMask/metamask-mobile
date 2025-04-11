import {
  getPermittedAccounts,
  getPermittedChains,
  switchActiveAccounts,
} from './index';
import { errorCodes as rpcErrorCodes } from '@metamask/rpc-errors';
import { RestrictedMethods, CaveatTypes } from './constants';
import { PermissionKeys } from './specifications';
import ImportedEngine from '../Engine';

// Mock dependencies
jest.mock('../Engine', () => ({
  context: {
    PermissionController: {
      executeRestrictedMethod: jest.fn(),
      getCaveat: jest.fn(),
      updateCaveat: jest.fn(),
    },
    AccountsController: {
      getSelectedAccount: jest.fn(),
    },
  },
}));

// Type assertion for mocked Engine
// Use any here to avoid type errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Engine = ImportedEngine as jest.Mocked<any>;

// Mock normalizeOrigin from wc-utils
jest.mock('../WalletConnect/wc-utils', () => ({
  normalizeOrigin: jest.fn((hostname) => hostname),
}));

describe('Permission Management Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPermittedAccounts', () => {
    it('returns accounts from PermissionController for external hostname', async () => {
      const hostname = 'example.com';
      Engine.context.PermissionController.executeRestrictedMethod.mockResolvedValue([
        '0xabc',
        '0xdef',
      ]);

      const result = await getPermittedAccounts(hostname);

      expect(Engine.context.PermissionController.executeRestrictedMethod).toHaveBeenCalledWith(
        hostname,
        RestrictedMethods.eth_accounts,
      );
      expect(result).toEqual(['0xabc', '0xdef']);
    });

    it('returns empty array on unauthorized error', async () => {
      const hostname = 'example.com';
      Engine.context.PermissionController.executeRestrictedMethod.mockRejectedValue({
        code: rpcErrorCodes.provider.unauthorized,
      });

      const result = await getPermittedAccounts(hostname);

      expect(result).toEqual([]);
    });

    it('throws on unexpected error', async () => {
      const hostname = 'example.com';
      const error = new Error('Unexpected error');
      Engine.context.PermissionController.executeRestrictedMethod.mockRejectedValue(error);

      await expect(getPermittedAccounts(hostname)).rejects.toThrow(error);
    });
  });

  describe('getPermittedChains', () => {
    it('returns formatted chains from caveat', async () => {
      const hostname = 'example.com';
      Engine.context.PermissionController.getCaveat.mockReturnValue({
        value: ['1', '2', 'invalid'],
      });

      const result = await getPermittedChains(hostname);

      expect(Engine.context.PermissionController.getCaveat).toHaveBeenCalledWith(
        hostname,
        PermissionKeys.permittedChains,
        CaveatTypes.restrictNetworkSwitching,
      );
      expect(result).toEqual(['eip155:1', 'eip155:2']); // Should filter out 'invalid'
    });

    it('returns empty array if no caveat exists', async () => {
      const hostname = 'example.com';
      Engine.context.PermissionController.getCaveat.mockReturnValue(undefined);

      const result = await getPermittedChains(hostname);

      expect(result).toEqual([]);
    });

    it('returns empty array if caveat value is not an array', async () => {
      const hostname = 'example.com';
      Engine.context.PermissionController.getCaveat.mockReturnValue({
        value: 'not-an-array',
      });

      const result = await getPermittedChains(hostname);

      expect(result).toEqual([]);
    });
  });

  describe('switchActiveAccounts', () => {
    it('reorders accounts to make the specified account active', () => {
      const hostname = 'example.com';
      const accAddress = '0xdef';
      Engine.context.PermissionController.getCaveat.mockReturnValue({
        value: ['0xabc', '0xdef', '0x123'],
      });

      switchActiveAccounts(hostname, accAddress);

      expect(Engine.context.PermissionController.getCaveat).toHaveBeenCalledWith(
        hostname,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
      );
      expect(Engine.context.PermissionController.updateCaveat).toHaveBeenCalledWith(
        hostname,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
        ['0xdef', '0xabc', '0x123'],
      );
    });

    it('throws if account is not permitted', () => {
      const hostname = 'example.com';
      const accAddress = '0x999';
      Engine.context.PermissionController.getCaveat.mockReturnValue({
        value: ['0xabc', '0xdef'],
      });

      expect(() => switchActiveAccounts(hostname, accAddress)).toThrow(
        `eth_accounts permission for hostname "${hostname}" does not permit "${accAddress} account".`,
      );
    });

    it('de-duplicates accounts', () => {
      const hostname = 'example.com';
      const accAddress = '0xdef';
      Engine.context.PermissionController.getCaveat.mockReturnValue({
        value: ['0xabc', '0xdef', '0xdef'],
      });

      switchActiveAccounts(hostname, accAddress);

      expect(Engine.context.PermissionController.updateCaveat).toHaveBeenCalledWith(
        hostname,
        RestrictedMethods.eth_accounts,
        CaveatTypes.restrictReturnedAccounts,
        ['0xdef', '0xabc'],
      );
    });
  });
});
