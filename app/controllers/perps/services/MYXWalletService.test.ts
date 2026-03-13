/**
 * Unit tests for MYXWalletService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock keyring-api to avoid import issues with definePattern
jest.mock('@metamask/keyring-api', () => ({
  isEvmAccountType: jest.fn((accountType: string) =>
    accountType?.startsWith('eip155:'),
  ),
}));

// Mock keyring-controller to avoid superstruct/abi-utils chain errors
jest.mock('@metamask/keyring-controller', () => ({
  SignTypedDataVersion: { V4: 'V4' },
}));

// Mock MetaMask utils
jest.mock('@metamask/utils', () => ({
  parseCaipAccountId: jest.fn((accountId: string) => {
    const parts = accountId.split(':');
    return {
      chainNamespace: parts[0],
      chainReference: parts[1],
      address: parts[2],
    };
  }),
  isValidHexAddress: jest.fn((address: string) =>
    /^0x[0-9a-fA-F]{40}$/.test(address),
  ),
}));

// Mock MYX config
jest.mock('../constants/myxConfig', () => ({
  getMYXChainId: jest.fn((network: string) =>
    network === 'testnet' ? 421614 : 56,
  ),
  MYX_TESTNET_CHAIN_ID: '421614',
  MYX_MAINNET_CHAIN_ID: '56',
}));

// Mock DevLogger
jest.mock('../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

import type { CaipAccountId } from '@metamask/utils';

import {
  createMockInfrastructure,
  createMockEvmAccount,
  createMockMessenger,
} from '../../../components/UI/Perps/__mocks__/serviceMocks';

import { MYXWalletService } from './MYXWalletService';

describe('MYXWalletService', () => {
  let service: MYXWalletService;
  let mockDeps: ReturnType<typeof createMockInfrastructure>;
  let mockMessenger: ReturnType<typeof createMockMessenger>;
  const mockEvmAccount = createMockEvmAccount();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeps = createMockInfrastructure();
    mockMessenger = createMockMessenger();
    service = new MYXWalletService(mockDeps, mockMessenger);
  });

  describe('Constructor and Configuration', () => {
    it('initializes with mainnet by default', () => {
      expect(service.isTestnetMode()).toBe(false);
    });

    it('initializes with testnet when specified', () => {
      const testnetService = new MYXWalletService(mockDeps, mockMessenger, {
        isTestnet: true,
      });

      expect(testnetService.isTestnetMode()).toBe(true);
    });

    it('setTestnetMode / isTestnetMode toggles correctly', () => {
      service.setTestnetMode(true);
      expect(service.isTestnetMode()).toBe(true);

      service.setTestnetMode(false);
      expect(service.isTestnetMode()).toBe(false);
    });

    it('isKeyringUnlocked returns keyring state', () => {
      expect(service.isKeyringUnlocked()).toBe(true);

      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (action === 'KeyringController:getState') {
          return { isUnlocked: false };
        }
        return undefined;
      });

      expect(service.isKeyringUnlocked()).toBe(false);
    });
  });

  describe('createEthersSigner', () => {
    it('throws NO_ACCOUNT_SELECTED when no account', () => {
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });

      expect(() => service.createEthersSigner()).toThrow('NO_ACCOUNT_SELECTED');
    });

    it('getAddress() returns current account address', async () => {
      const signer = service.createEthersSigner();
      const address = await signer.getAddress();

      expect(address).toBe(mockEvmAccount.address);
    });

    it('getAddress() throws when account disappears', async () => {
      const signer = service.createEthersSigner();

      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });

      await expect(signer.getAddress()).rejects.toThrow('NO_ACCOUNT_SELECTED');
    });

    it('signTypedData() calls messenger with correct params and returns signature', async () => {
      const signer = service.createEthersSigner();
      const domain = { name: 'MYX', version: '1', chainId: 56 };
      const types = {
        Order: [
          { name: 'asset', type: 'uint32' },
          { name: 'isBuy', type: 'bool' },
        ],
      };
      const value = { asset: 0, isBuy: true };

      const result = await signer.signTypedData(domain, types, value);

      expect(result).toBe('0xSignatureResult');
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        {
          from: mockEvmAccount.address,
          data: {
            domain,
            types,
            primaryType: 'Order',
            message: value,
          },
        },
        'V4',
      );
    });

    it('signTypedData() derives primaryType (non-EIP712Domain key)', async () => {
      const signer = service.createEthersSigner();
      const domain = { name: 'MYX' };
      const types = {
        EIP712Domain: [{ name: 'name', type: 'string' }],
        Transfer: [{ name: 'amount', type: 'uint256' }],
      };
      const value = { amount: '1000' };

      await signer.signTypedData(domain, types, value);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        expect.objectContaining({
          data: expect.objectContaining({ primaryType: 'Transfer' }),
        }),
        'V4',
      );
    });

    it('signTypedData() falls back to EIP712Domain when types only has that key', async () => {
      const signer = service.createEthersSigner();
      const domain = { name: 'MYX' };
      const types = {
        EIP712Domain: [{ name: 'name', type: 'string' }],
      };
      const value = {};

      await signer.signTypedData(domain, types, value);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        expect.objectContaining({
          data: expect.objectContaining({ primaryType: 'EIP712Domain' }),
        }),
        'V4',
      );
    });

    it('signTypedData() throws NO_ACCOUNT_SELECTED when account disappears', async () => {
      const signer = service.createEthersSigner();

      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        if (action === 'KeyringController:getState') {
          return { isUnlocked: true };
        }
        return undefined;
      });

      await expect(
        signer.signTypedData({ name: 'MYX' }, { Test: [] }, {}),
      ).rejects.toThrow('NO_ACCOUNT_SELECTED');
    });

    it('signTypedData() throws KEYRING_LOCKED when keyring locked', async () => {
      const signer = service.createEthersSigner();

      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [mockEvmAccount];
        }
        if (action === 'KeyringController:getState') {
          return { isUnlocked: false };
        }
        return undefined;
      });

      await expect(
        signer.signTypedData({ name: 'MYX' }, { Test: [] }, {}),
      ).rejects.toThrow('KEYRING_LOCKED');
    });

    it('provider is null', () => {
      const signer = service.createEthersSigner();

      expect(signer.provider).toBeNull();
    });
  });

  describe('createWalletClient', () => {
    it('throws NO_ACCOUNT_SELECTED when no account', () => {
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });

      expect(() => service.createWalletClient()).toThrow('NO_ACCOUNT_SELECTED');
    });

    it('returns correct account address and chain ID for mainnet (56)', () => {
      const client = service.createWalletClient();

      expect(client.account.address).toBe(mockEvmAccount.address);
      expect(client.chain.id).toBe(56);
    });

    it('returns correct chain ID for testnet (421614)', () => {
      const testnetService = new MYXWalletService(mockDeps, mockMessenger, {
        isTestnet: true,
      });
      const client = testnetService.createWalletClient();

      expect(client.chain.id).toBe(421614);
    });

    it('signTypedData() calls messenger and returns signature', async () => {
      const client = service.createWalletClient();
      const args = {
        domain: { name: 'MYX', chainId: 56 },
        types: { Order: [{ name: 'asset', type: 'uint32' }] },
        primaryType: 'Order',
        message: { asset: 1 },
      };

      const result = await client.signTypedData(args);

      expect(result).toBe('0xSignatureResult');
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signTypedMessage',
        {
          from: mockEvmAccount.address,
          data: {
            domain: args.domain,
            types: args.types,
            primaryType: args.primaryType,
            message: args.message,
          },
        },
        'V4',
      );
    });

    it('signTypedData() throws NO_ACCOUNT_SELECTED when account disappears', async () => {
      const client = service.createWalletClient();

      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        if (action === 'KeyringController:getState') {
          return { isUnlocked: true };
        }
        return undefined;
      });

      await expect(
        client.signTypedData({
          domain: {},
          types: {},
          primaryType: 'Test',
          message: {},
        }),
      ).rejects.toThrow('NO_ACCOUNT_SELECTED');
    });

    it('signTypedData() throws KEYRING_LOCKED when keyring locked', async () => {
      const client = service.createWalletClient();

      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [mockEvmAccount];
        }
        if (action === 'KeyringController:getState') {
          return { isUnlocked: false };
        }
        return undefined;
      });

      await expect(
        client.signTypedData({
          domain: {},
          types: {},
          primaryType: 'Test',
          message: {},
        }),
      ).rejects.toThrow('KEYRING_LOCKED');
    });
  });

  describe('getUserAddress', () => {
    it('returns address as Hex', () => {
      const address = service.getUserAddress();

      expect(address).toBe(mockEvmAccount.address);
    });

    it('throws NO_ACCOUNT_SELECTED when no account', () => {
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });

      expect(() => service.getUserAddress()).toThrow('NO_ACCOUNT_SELECTED');
    });

    it('throws INVALID_ADDRESS_FORMAT when isValidHexAddress returns false', () => {
      const { isValidHexAddress } = jest.requireMock('@metamask/utils');
      isValidHexAddress.mockReturnValueOnce(false);

      expect(() => service.getUserAddress()).toThrow('INVALID_ADDRESS_FORMAT');
    });
  });

  describe('getCurrentAccountId', () => {
    it('returns CAIP ID with mainnet chain (eip155:56:address)', async () => {
      const accountId = await service.getCurrentAccountId();

      expect(accountId).toBe(`eip155:56:${mockEvmAccount.address}`);
    });

    it('returns CAIP ID with testnet chain (eip155:421614:address)', async () => {
      service.setTestnetMode(true);

      const accountId = await service.getCurrentAccountId();

      expect(accountId).toBe(`eip155:421614:${mockEvmAccount.address}`);
    });

    it('throws NO_ACCOUNT_SELECTED when no account', async () => {
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });

      await expect(service.getCurrentAccountId()).rejects.toThrow(
        'NO_ACCOUNT_SELECTED',
      );
    });
  });

  describe('getUserAddressFromAccountId / getUserAddressWithDefault', () => {
    it('parses address from CAIP account ID', () => {
      const accountId =
        'eip155:56:0x1234567890123456789012345678901234567890' as CaipAccountId;

      const address = service.getUserAddressFromAccountId(accountId);

      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('throws INVALID_ADDRESS_FORMAT for invalid address', () => {
      const { isValidHexAddress } = jest.requireMock('@metamask/utils');
      isValidHexAddress.mockReturnValueOnce(false);

      const accountId = 'eip155:56:invalid-address' as CaipAccountId;

      expect(() => service.getUserAddressFromAccountId(accountId)).toThrow(
        'INVALID_ADDRESS_FORMAT',
      );
    });

    it('getUserAddressWithDefault uses provided accountId', async () => {
      const accountId =
        'eip155:56:0x9999999999999999999999999999999999999999' as CaipAccountId;

      const address = await service.getUserAddressWithDefault(accountId);

      expect(address).toBe('0x9999999999999999999999999999999999999999');
    });

    it('getUserAddressWithDefault falls back to getCurrentAccountId', async () => {
      const address = await service.getUserAddressWithDefault();

      expect(address).toBe(mockEvmAccount.address);
    });
  });
});
