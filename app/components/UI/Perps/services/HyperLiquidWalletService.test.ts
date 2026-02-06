/**
 * Unit tests for HyperLiquidWalletService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock keyring-api to avoid import issues with definePattern
jest.mock('@metamask/keyring-api', () => ({
  isEvmAccountType: jest.fn((accountType: string) =>
    accountType?.startsWith('eip155:'),
  ),
}));

// Mock keyring controller to avoid import issues
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

  const mockAccountTreeController = {
    getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue([
      {
        address: '0x1234567890123456789012345678901234567890',
        type: 'eip155:1',
      },
    ]),
  };

  return {
    __esModule: true,
    default: {
      context: {
        KeyringController: mockKeyringController,
        AccountTreeController: mockAccountTreeController,
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

import type { CaipAccountId } from '@metamask/utils';
import { HyperLiquidWalletService } from './HyperLiquidWalletService';
import {
  createMockInfrastructure,
  createMockMessenger,
  createMockEvmAccount,
} from '../__mocks__/serviceMocks';
import type { PerpsControllerMessenger } from '../controllers/PerpsController';

describe('HyperLiquidWalletService', () => {
  let service: HyperLiquidWalletService;
  let mockDeps: ReturnType<typeof createMockInfrastructure>;
  let mockMessenger: jest.Mocked<PerpsControllerMessenger>;
  const mockEvmAccount = createMockEvmAccount();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeps = createMockInfrastructure();
    mockMessenger = createMockMessenger();
    service = new HyperLiquidWalletService(mockDeps, mockMessenger);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with mainnet by default', () => {
      expect(service.isTestnetMode()).toBe(false);
    });

    it('should initialize with testnet when specified', () => {
      const testnetService = new HyperLiquidWalletService(
        mockDeps,
        mockMessenger,
        { isTestnet: true },
      );

      expect(testnetService.isTestnetMode()).toBe(true);
    });

    it('should update testnet mode', () => {
      service.setTestnetMode(true);

      expect(service.isTestnetMode()).toBe(true);
    });
  });

  describe('Wallet Adapter Creation', () => {
    let walletAdapter: {
      signTypedData: (params: {
        domain: {
          name: string;
          version: string;
          chainId: number;
          verifyingContract: `0x${string}`;
        };
        types: {
          [key: string]: { name: string; type: string }[];
        };
        primaryType: string;
        message: Record<string, unknown>;
      }) => Promise<`0x${string}`>;
      getChainId?: () => Promise<number>;
    };

    beforeEach(() => {
      walletAdapter = service.createWalletAdapter();
    });

    it('should create wallet adapter with signTypedData method', () => {
      expect(walletAdapter).toHaveProperty('signTypedData');
      expect(typeof walletAdapter.signTypedData).toBe('function');
    });

    it('should have getChainId method', () => {
      expect(walletAdapter).toHaveProperty('getChainId');
      expect(typeof walletAdapter.getChainId).toBe('function');
    });

    describe('getChainId method', () => {
      it('should return mainnet chain ID', async () => {
        expect(walletAdapter.getChainId).toBeDefined();
        const chainId = await walletAdapter.getChainId?.();

        expect(chainId).toBe(42161);
      });

      it('should return testnet chain ID when in testnet mode', async () => {
        const testnetService = new HyperLiquidWalletService(
          mockDeps,
          mockMessenger,
          { isTestnet: true },
        );
        const testnetAdapter = testnetService.createWalletAdapter();

        expect(testnetAdapter.getChainId).toBeDefined();
        const chainId = await testnetAdapter.getChainId?.();

        expect(chainId).toBe(421614);
      });
    });

    describe('signTypedData method', () => {
      const mockTypedDataParams = {
        domain: {
          name: 'HyperLiquid',
          version: '1',
          chainId: 42161,
          verifyingContract:
            '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        types: {
          Order: [
            { name: 'asset', type: 'uint32' },
            { name: 'isBuy', type: 'bool' },
            { name: 'limitPx', type: 'uint64' },
            { name: 'sz', type: 'uint64' },
            { name: 'reduceOnly', type: 'bool' },
            { name: 'timestamp', type: 'uint64' },
          ],
        },
        primaryType: 'Order',
        message: {
          asset: 0,
          isBuy: true,
          limitPx: '30000',
          sz: '1',
          reduceOnly: false,
          timestamp: Date.now(),
        },
      };

      it('should sign typed data successfully', async () => {
        const result = await walletAdapter.signTypedData(mockTypedDataParams);

        expect(result).toBe('0xSignatureResult');
        expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
          'HyperLiquidWalletService: Signing typed data',
          {
            address: mockEvmAccount.address,
            primaryType: 'Order',
            domain: mockTypedDataParams.domain,
          },
        );
        expect(mockMessenger.call).toHaveBeenCalledWith(
          'KeyringController:signTypedMessage',
          {
            from: mockEvmAccount.address,
            data: {
              domain: mockTypedDataParams.domain,
              types: mockTypedDataParams.types,
              primaryType: mockTypedDataParams.primaryType,
              message: mockTypedDataParams.message,
            },
          },
          'V4',
        );
      });

      it('should throw error when no account selected', async () => {
        // Mock messenger to return empty array (no account selected)
        (mockMessenger.call as jest.Mock).mockImplementation(
          (action: string) => {
            if (
              action ===
              'AccountTreeController:getAccountsFromSelectedAccountGroup'
            ) {
              return [];
            }
            return undefined;
          },
        );

        // Creating wallet adapter should throw when no account
        expect(() => service.createWalletAdapter()).toThrow(
          'NO_ACCOUNT_SELECTED',
        );
      });

      it('should handle keyring controller errors', async () => {
        (mockMessenger.call as jest.Mock).mockImplementation(
          (action: string) => {
            if (
              action ===
              'AccountTreeController:getAccountsFromSelectedAccountGroup'
            ) {
              return [mockEvmAccount];
            }
            if (action === 'KeyringController:signTypedMessage') {
              return Promise.reject(new Error('Signing failed'));
            }
            return undefined;
          },
        );

        await expect(
          walletAdapter.signTypedData(mockTypedDataParams),
        ).rejects.toThrow('Signing failed');
      });
    });
  });

  describe('Account Management', () => {
    it('should get current account ID for mainnet', async () => {
      const accountId = await service.getCurrentAccountId();

      // Uses address from mockMessenger's AccountTreeController:getAccountsFromSelectedAccountGroup
      expect(accountId).toBe(`eip155:42161:${mockEvmAccount.address}`);
    });

    it('should get current account ID for testnet', async () => {
      service.setTestnetMode(true);

      const accountId = await service.getCurrentAccountId();

      expect(accountId).toBe(`eip155:421614:${mockEvmAccount.address}`);
    });

    it('should throw error when getting account ID with no selected account', async () => {
      // Mock messenger to return empty array (no account selected)
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
        'INVALID_ADDRESS_FORMAT',
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

      // Uses address from mockMessenger's AccountTreeController:getAccountsFromSelectedAccountGroup
      expect(address).toBe(mockEvmAccount.address);
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
      // Mock messenger to throw an error
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          throw new Error('Store error');
        }
        return undefined;
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
      // Override messenger.call for the signing call
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [mockEvmAccount];
        }
        if (action === 'KeyringController:signTypedMessage') {
          return Promise.reject(new Error('Keyring not initialized'));
        }
        return undefined;
      });

      const mockTypedData = {
        domain: {
          name: 'Test',
          version: '1',
          chainId: 42161,
          verifyingContract:
            '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        types: {
          Test: [{ name: 'value', type: 'string' }],
        },
        primaryType: 'Test',
        message: { value: 'test' },
      };

      await expect(walletAdapter.signTypedData(mockTypedData)).rejects.toThrow(
        'Keyring not initialized',
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full wallet adapter workflow', async () => {
      const walletAdapter = service.createWalletAdapter();

      // Get chain ID
      expect(walletAdapter.getChainId).toBeDefined();
      const chainId = await (
        walletAdapter.getChainId as () => Promise<number>
      )();
      expect(chainId).toBe(42161);

      // Sign typed data
      const mockTypedData = {
        domain: {
          name: 'Test',
          version: '1',
          chainId,
          verifyingContract:
            '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        types: {
          Test: [{ name: 'value', type: 'string' }],
        },
        primaryType: 'Test',
        message: { value: 'test' },
      };

      const signature = await walletAdapter.signTypedData(mockTypedData);
      expect(signature).toBe('0xSignatureResult');
    });

    it('should maintain consistency between wallet adapter and service methods', async () => {
      const walletAdapter = service.createWalletAdapter();

      // Get chain ID through wallet adapter
      expect(walletAdapter.getChainId).toBeDefined();
      const chainId = await walletAdapter.getChainId?.();

      // Get account through service method
      const accountId = await service.getCurrentAccountId();
      const serviceAddress = service.getUserAddress(accountId);

      // Chain ID should match
      expect(accountId).toContain(`eip155:${chainId}:`);
      expect(accountId).toContain(serviceAddress);
    });
  });
});
