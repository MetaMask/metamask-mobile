/**
 * Shared Engine context mocks for Perps tests
 * Provides reusable mock implementations for common Engine dependencies
 */

export const createMockAccountData = () => ({
  address: '0x1234567890123456789012345678901234567890',
  id: 'mock-account-id',
  type: 'eip155:eoa' as const,
  options: {},
  metadata: {
    name: 'Test Account',
    importTime: Date.now(),
    keyring: { type: 'HD Key Tree' },
  },
  scopes: ['eip155:1', 'eip155:42161'],
  methods: ['eth_sendTransaction', 'eth_sign'],
});

export const createMockEngineContext = () => ({
  AccountsController: {
    getSelectedAccount: jest.fn().mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      id: 'mock-account-id',
      metadata: { name: 'Test Account' },
    }),
  },
  AccountTreeController: {
    getAccountsFromSelectedAccountGroup: jest
      .fn()
      .mockReturnValue([createMockAccountData()]),
  },
  NetworkController: {
    state: {
      selectedNetworkClientId: 'mainnet',
    },
    findNetworkClientIdByChainId: jest.fn().mockReturnValue('arbitrum'),
  },
  TransactionController: {
    addTransaction: jest.fn(),
  },
  PerpsController: {
    clearDepositResult: jest.fn(),
  },
  RewardsController: {
    getPerpsDiscountForAccount: jest.fn(),
  },
});

export const mockEngineContext = createMockEngineContext();
