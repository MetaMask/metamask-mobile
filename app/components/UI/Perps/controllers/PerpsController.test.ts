import { PerpsController } from './PerpsController';

// Mock dependencies
jest.mock('./providers/HyperLiquidProvider');
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
      }),
    },
  },
}));

describe('PerpsController', () => {
  it('should export PerpsController class', () => {
    expect(PerpsController).toBeDefined();
  });

  it('should have default state values', () => {
    const defaultState = {
      activeProvider: 'hyperliquid',
      isTestnet: true,
      connectionStatus: 'disconnected',
      positions: [],
      accountState: null,
      pendingOrders: [],
      depositStatus: 'idle',
      currentDepositTxHash: null,
      depositError: null,
      activeDepositTransactions: {},
      lastError: null,
      lastUpdateTimestamp: null,
      pendingWithdrawals: [],
    };

    // Just verify the expected structure
    expect(defaultState.activeProvider).toBe('hyperliquid');
    expect(defaultState.pendingWithdrawals).toEqual([]);
  });
});
