import { Messenger } from '@metamask/base-controller';
import {
  getDefaultPerpsControllerState,
  PerpsController,
  type PerpsControllerState,
} from './PerpsController';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import type { CaipAssetId } from './types';

// Mock dependencies
jest.mock('./providers/HyperLiquidProvider');
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        id: 'mock-account-id',
        metadata: { name: 'Test Account' },
      }),
    },
    NetworkController: {
      state: {
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
}));

describe('PerpsController', () => {
  let mockHyperLiquidProvider: jest.Mocked<HyperLiquidProvider>;
  let messenger: Messenger<any, any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock provider
    mockHyperLiquidProvider = {
      protocolId: 'hyperliquid',
      initialize: jest.fn().mockResolvedValue({ success: true }),
      checkWithdrawalStatus: jest.fn().mockResolvedValue({
        status: 'pending',
        metadata: {},
      }),
      withdraw: jest.fn(),
      deposit: jest.fn(),
      getPositions: jest.fn().mockResolvedValue([]),
      getAccountState: jest.fn().mockResolvedValue(null),
    } as any;

    (HyperLiquidProvider as jest.MockedClass<typeof HyperLiquidProvider>).mockImplementation(
      () => mockHyperLiquidProvider
    );

    // Create messenger
    messenger = new Messenger();
    messenger.registerActionHandler(
      'AccountsController:getSelectedAccount',
      jest.fn().mockReturnValue({
        id: 'mock-account-id',
        address: '0x1234567890123456789012345678901234567890',
      })
    );
    messenger.registerActionHandler(
      'NetworkController:getState',
      jest.fn().mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      })
    );
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const controller = new PerpsController({
        messenger: messenger.getRestricted({
          name: 'PerpsController',
          allowedActions: [
            'AccountsController:getSelectedAccount',
            'NetworkController:getState',
          ],
          allowedEvents: [
            'AccountsController:selectedAccountChange',
            'NetworkController:stateChange',  
            'TransactionController:transactionSubmitted',
            'TransactionController:transactionConfirmed',
            'TransactionController:transactionFailed',
          ],
        }),
        state: undefined,
      });

      expect(controller.state).toEqual(getDefaultPerpsControllerState());
      expect(controller.state.activeProvider).toBe('hyperliquid');
      expect(controller.state.pendingWithdrawals).toEqual([]);
    });

    it('should initialize with custom state', () => {
      const customState: Partial<PerpsControllerState> = {
        isTestnet: false,
        pendingWithdrawals: [
          {
            withdrawalId: 'test-id',
            amount: '100',
            provider: 'hyperliquid',
            status: 'pending',
            createdAt: Date.now(),
            checkCount: 0,
          },
        ],
      };

      const controller = new PerpsController({
        messenger: messenger.getRestricted({
          name: 'PerpsController',
          allowedActions: [
            'AccountsController:getSelectedAccount',
            'NetworkController:getState',
          ],
          allowedEvents: [
            'AccountsController:selectedAccountChange',
            'NetworkController:stateChange',  
            'TransactionController:transactionSubmitted',
            'TransactionController:transactionConfirmed',
            'TransactionController:transactionFailed',
          ],
        }),
        state: customState,
      });

      expect(controller.state.isTestnet).toBe(false);
      expect(controller.state.pendingWithdrawals).toHaveLength(1);
    });
  });

  describe('withdrawal methods', () => {
    it('should have withdrawal monitoring methods', () => {
      const controller = new PerpsController({
        messenger: messenger.getRestricted({
          name: 'PerpsController',
          allowedActions: [
            'AccountsController:getSelectedAccount',
            'NetworkController:getState',
          ],
          allowedEvents: [
            'AccountsController:selectedAccountChange',
            'NetworkController:stateChange',  
            'TransactionController:transactionSubmitted',
            'TransactionController:transactionConfirmed',
            'TransactionController:transactionFailed',
          ],
        }),
        state: undefined,
      });

      expect(controller.startWithdrawalMonitoring).toBeDefined();
      expect(controller.stopWithdrawalMonitoring).toBeDefined();
      expect(controller.monitorPendingWithdrawals).toBeDefined();
    });

    it('should handle withdraw with required assetId', async () => {
      const controller = new PerpsController({
        messenger: messenger.getRestricted({
          name: 'PerpsController',
          allowedActions: [
            'AccountsController:getSelectedAccount',
            'NetworkController:getState',
          ],
          allowedEvents: [
            'AccountsController:selectedAccountChange',
            'NetworkController:stateChange',  
            'TransactionController:transactionSubmitted',
            'TransactionController:transactionConfirmed',
            'TransactionController:transactionFailed',
          ],
        }),
        state: undefined,
      });

      mockHyperLiquidProvider.withdraw.mockResolvedValue({
        success: true,
        txHash: 'mock-hash',
      });

      await controller.initializeProviders();
      
      const result = await controller.withdraw({
        amount: '100',
        assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831' as CaipAssetId,
      });

      // Just verify withdraw was called - the actual validation happens in provider
      expect(mockHyperLiquidProvider.withdraw).toHaveBeenCalledWith({
        amount: '100',
        assetId: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      });
    });
  });

  describe('provider methods', () => {
    it('should get positions', async () => {
      const controller = new PerpsController({
        messenger: messenger.getRestricted({
          name: 'PerpsController',
          allowedActions: [
            'AccountsController:getSelectedAccount',
            'NetworkController:getState',
          ],
          allowedEvents: [
            'AccountsController:selectedAccountChange',
            'NetworkController:stateChange',  
            'TransactionController:transactionSubmitted',
            'TransactionController:transactionConfirmed',
            'TransactionController:transactionFailed',
          ],
        }),
        state: undefined,
      });

      const mockPositions = [
        {
          coin: 'BTC',
          size: '1.0',
          entryPrice: '50000',
          positionValue: '50000',
          unrealizedPnl: '0',
          marginUsed: '10000',
          leverage: { type: 'cross' as const, value: 5 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '0',
          cumulativeFunding: {
            allTime: '0',
            sinceOpen: '0',
            sinceChange: '0',
          },
        },
      ];

      mockHyperLiquidProvider.getPositions.mockResolvedValue(mockPositions);

      await controller.initializeProviders();
      const positions = await controller.getPositions();

      expect(positions).toEqual(mockPositions);
      expect(controller.state.positions).toEqual(mockPositions);
    });
  });
});