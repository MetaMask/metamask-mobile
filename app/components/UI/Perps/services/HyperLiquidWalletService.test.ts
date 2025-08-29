/**
 * Unit tests for HyperLiquidWalletService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock keyring controller to avoid import issues
enum SignTypedDataVersion {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3',
  V4 = 'V4',
}

jest.mock('@metamask/keyring-controller', () => ({
  SignTypedDataVersion: {
    V1: 'V1',
    V2: 'V2',
    V3: 'V3',
    V4: 'V4',
  },
}));

// Mock MetaMask utils
// Mock using the MetaMask mobile testing patterns
const MOCK_SELECTED_ACCOUNT = {
  address: '0x1234567890123456789012345678901234567890',
};

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'test-account-id',
          accounts: {
            'test-account-id': MOCK_SELECTED_ACCOUNT,
          },
        },
      },
    },
  },
};

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

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(() => MOCK_STORE_STATE),
  },
}));

// Mock selectors
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(
    () => MOCK_SELECTED_ACCOUNT.address,
  ),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(
    () => () => MOCK_SELECTED_ACCOUNT,
  ),
}));

// Mock Engine with proper hoisting
jest.mock('../../../../core/Engine', () => {
  const mockKeyringController = {
    signTypedMessage: jest.fn().mockResolvedValue('0xSignatureResult'),
  };

  return {
    __esModule: true,
    default: {
      context: {
        KeyringController: mockKeyringController,
      },
    },
  };
});

// Mock config
jest.mock('../constants/hyperLiquidConfig', () => ({
  getChainId: jest.fn((isTestnet: boolean) => (isTestnet ? '421614' : '42161')),
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

import { HyperLiquidWalletService } from './HyperLiquidWalletService';
import type { CaipAccountId } from '@metamask/utils';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { store } from '../../../../store';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

describe('HyperLiquidWalletService', () => {
  let service: HyperLiquidWalletService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HyperLiquidWalletService();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with mainnet by default', () => {
      expect(service.isTestnetMode()).toBe(false);
    });

    it('should initialize with testnet when specified', () => {
      const testnetService = new HyperLiquidWalletService({ isTestnet: true });

      expect(testnetService.isTestnetMode()).toBe(true);
    });

    it('should update testnet mode', () => {
      service.setTestnetMode(true);

      expect(service.isTestnetMode()).toBe(true);
    });
  });

  describe('Wallet Adapter Creation', () => {
    let walletAdapter: {
      request: (args: {
        method: string;
        params: unknown[];
      }) => Promise<unknown>;
    };

    beforeEach(() => {
      walletAdapter = service.createWalletAdapter();
    });

    it('should create wallet adapter with request method', () => {
      expect(walletAdapter).toHaveProperty('request');
      expect(typeof walletAdapter.request).toBe('function');
    });

    describe('eth_requestAccounts method', () => {
      it('should return selected account address', async () => {
        const result = await walletAdapter.request({
          method: 'eth_requestAccounts',
          params: [],
        });

        expect(result).toEqual(['0x1234567890123456789012345678901234567890']);
      });

      it('should throw error when no account selected', async () => {
        // Mock selector to return null for this test
        jest
          .mocked(selectSelectedInternalAccountByScope)
          .mockReturnValueOnce(() => undefined);

        await expect(
          walletAdapter.request({
            method: 'eth_requestAccounts',
            params: [],
          }),
        ).rejects.toThrow('No account selected');
      });
    });

    describe('eth_chainId method', () => {
      it('should return mainnet chain ID in hex format', async () => {
        const result = await walletAdapter.request({
          method: 'eth_chainId',
          params: [],
        });

        expect(result).toBe('0xa4b1'); // 42161 in hex
        expect(DevLogger.log).toHaveBeenCalledWith(
          'HyperLiquidWalletService: eth_chainId requested',
          {
            isTestnet: false,
            decimalChainId: '42161',
            hexChainId: '0xa4b1',
          },
        );
      });

      it('should return testnet chain ID in hex format when in testnet mode', async () => {
        const testnetService = new HyperLiquidWalletService({
          isTestnet: true,
        });
        const testnetAdapter = testnetService.createWalletAdapter();

        const result = await testnetAdapter.request({
          method: 'eth_chainId',
          params: [],
        });

        expect(result).toBe('0x66eee'); // 421614 in hex
        expect(DevLogger.log).toHaveBeenCalledWith(
          'HyperLiquidWalletService: eth_chainId requested',
          {
            isTestnet: true,
            decimalChainId: '421614',
            hexChainId: '0x66eee',
          },
        );
      });
    });

    describe('eth_signTypedData_v4 method', () => {
      const mockTypedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
          ],
        },
        primaryType: 'Message',
        domain: { name: 'Test', version: '1' },
        message: { content: 'Hello World' },
      };

      it('should sign typed data successfully', async () => {
        const result = await walletAdapter.request({
          method: 'eth_signTypedData_v4',
          params: ['0x1234567890123456789012345678901234567890', mockTypedData],
        });

        expect(result).toBe('0xSignatureResult');
        expect(
          Engine.context.KeyringController.signTypedMessage,
        ).toHaveBeenCalledWith(
          {
            from: '0x1234567890123456789012345678901234567890',
            data: mockTypedData,
          },
          SignTypedDataVersion.V4,
        );
      });

      it('should handle JSON string typed data', async () => {
        const jsonString = JSON.stringify(mockTypedData);

        const result = await walletAdapter.request({
          method: 'eth_signTypedData_v4',
          params: ['0x1234567890123456789012345678901234567890', jsonString],
        });

        expect(result).toBe('0xSignatureResult');
        expect(
          Engine.context.KeyringController.signTypedMessage,
        ).toHaveBeenCalledWith(
          {
            from: '0x1234567890123456789012345678901234567890',
            data: mockTypedData,
          },
          SignTypedDataVersion.V4,
        );
      });

      it('should throw error when no account selected', async () => {
        // Mock selector to return null for this test
        jest
          .mocked(selectSelectedInternalAccountByScope)
          .mockReturnValueOnce(() => undefined);

        await expect(
          walletAdapter.request({
            method: 'eth_signTypedData_v4',
            params: [
              '0x1234567890123456789012345678901234567890',
              mockTypedData,
            ],
          }),
        ).rejects.toThrow('No account selected');
      });

      it('should throw error when signing address does not match selected account', async () => {
        await expect(
          walletAdapter.request({
            method: 'eth_signTypedData_v4',
            params: [
              '0x9999999999999999999999999999999999999999',
              mockTypedData,
            ],
          }),
        ).rejects.toThrow('No account selected');
      });

      it('should handle keyring controller errors', async () => {
        (
          Engine.context.KeyringController.signTypedMessage as jest.Mock
        ).mockRejectedValueOnce(new Error('Signing failed'));

        await expect(
          walletAdapter.request({
            method: 'eth_signTypedData_v4',
            params: [
              '0x1234567890123456789012345678901234567890',
              mockTypedData,
            ],
          }),
        ).rejects.toThrow('Signing failed');
      });
    });

    describe('Unsupported methods', () => {
      it('should throw error for unsupported methods', async () => {
        await expect(
          walletAdapter.request({
            method: 'unsupported_method',
            params: [],
          }),
        ).rejects.toThrow('Unsupported method: unsupported_method');
      });
    });
  });

  describe('Account Management', () => {
    it('should get current account ID for mainnet', async () => {
      const accountId = await service.getCurrentAccountId();

      expect(accountId).toBe(
        'eip155:42161:0x1234567890123456789012345678901234567890',
      );
    });

    it('should get current account ID for testnet', async () => {
      service.setTestnetMode(true);

      const accountId = await service.getCurrentAccountId();

      expect(accountId).toBe(
        'eip155:421614:0x1234567890123456789012345678901234567890',
      );
    });

    it('should throw error when getting account ID with no selected account', async () => {
      // Mock selector to return null for this test
      jest
        .mocked(selectSelectedInternalAccountByScope)
        .mockReturnValueOnce(() => undefined);

      await expect(service.getCurrentAccountId()).rejects.toThrow(
        'No account selected',
      );
    });

    it('should parse user address from account ID', () => {
      const accountId =
        'eip155:42161:0x1234567890123456789012345678901234567890' as CaipAccountId;

      const address = service.getUserAddress(accountId);

      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should throw error for invalid address format', () => {
      // Mock isValidHexAddress at the module level
      const { isValidHexAddress } = jest.requireMock('@metamask/utils');
      isValidHexAddress.mockReturnValueOnce(false);

      const accountId = 'eip155:42161:invalid-address' as CaipAccountId;

      expect(() => service.getUserAddress(accountId)).toThrow(
        'Invalid address format: invalid-address',
      );
    });

    it('should get user address with provided account ID', async () => {
      const accountId =
        'eip155:42161:0x9999999999999999999999999999999999999999' as CaipAccountId;

      const address = await service.getUserAddressWithDefault(accountId);

      expect(address).toBe('0x9999999999999999999999999999999999999999');
    });

    it('should get user address with default fallback', async () => {
      const address = await service.getUserAddressWithDefault();

      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('Network Management', () => {
    it('should update testnet mode correctly', () => {
      expect(service.isTestnetMode()).toBe(false);

      service.setTestnetMode(true);
      expect(service.isTestnetMode()).toBe(true);

      service.setTestnetMode(false);
      expect(service.isTestnetMode()).toBe(false);
    });

    it('should affect chain ID in account ID generation', async () => {
      // Test mainnet
      service.setTestnetMode(false);
      const mainnetAccountId = await service.getCurrentAccountId();
      expect(mainnetAccountId).toContain('eip155:42161:');

      // Test testnet
      service.setTestnetMode(true);
      const testnetAccountId = await service.getCurrentAccountId();
      expect(testnetAccountId).toContain('eip155:421614:');
    });
  });

  describe('Error Handling', () => {
    it('should handle store state errors gracefully', async () => {
      // Mock store.getState to throw an error
      (store.getState as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Store error');
      });

      await expect(service.getCurrentAccountId()).rejects.toThrow(
        'Store error',
      );
    });

    it('should handle malformed CAIP account IDs', () => {
      // Mock parseCaipAccountId at the module level
      const { parseCaipAccountId } = jest.requireMock('@metamask/utils');
      parseCaipAccountId.mockImplementationOnce(() => {
        throw new Error('Invalid CAIP account ID');
      });

      const accountId = 'invalid-caip-id' as CaipAccountId;

      expect(() => service.getUserAddress(accountId)).toThrow(
        'Invalid CAIP account ID',
      );
    });

    it('should handle keyring controller initialization errors', async () => {
      const walletAdapter = service.createWalletAdapter();
      (
        Engine.context.KeyringController.signTypedMessage as jest.Mock
      ).mockRejectedValueOnce(new Error('Keyring not initialized'));

      await expect(
        walletAdapter.request({
          method: 'eth_signTypedData_v4',
          params: ['0x1234567890123456789012345678901234567890', {}],
        }),
      ).rejects.toThrow('Keyring not initialized');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full wallet adapter workflow', async () => {
      const walletAdapter = service.createWalletAdapter();

      // Request accounts
      const accounts = await walletAdapter.request({
        method: 'eth_requestAccounts',
        params: [],
      });

      expect(accounts).toEqual(['0x1234567890123456789012345678901234567890']);

      // Sign typed data
      const signature = await walletAdapter.request({
        method: 'eth_signTypedData_v4',
        params: [(accounts as string[])[0], { test: 'data' }],
      });

      expect(signature).toBe('0xSignatureResult');
    });

    it('should maintain consistency between wallet adapter and service methods', async () => {
      const walletAdapter = service.createWalletAdapter();

      // Get account through wallet adapter
      const accounts = await walletAdapter.request({
        method: 'eth_requestAccounts',
        params: [],
      });

      // Get account through service method
      const accountId = await service.getCurrentAccountId();
      const serviceAddress = service.getUserAddress(accountId);

      const accountsArray = accounts as string[];
      expect(accountsArray[0]).toBe(serviceAddress);
    });
  });
});
