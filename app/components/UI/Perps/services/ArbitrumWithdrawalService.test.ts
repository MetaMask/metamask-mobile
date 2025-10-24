import { ArbitrumWithdrawalService } from './ArbitrumWithdrawalService';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { detectHyperLiquidWithdrawal } from '../utils/arbitrumWithdrawalDetection';
import { transformArbitrumWithdrawalsToHistoryItems } from '../utils/arbitrumWithdrawalTransforms';
import { selectChainId } from '../../../../selectors/networkController';
import { store } from '../../../../store';
import type { RootState } from '../../../../reducers';
import { TransactionMeta } from '@metamask/transaction-controller';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../utils/arbitrumWithdrawalDetection');
jest.mock('../utils/arbitrumWithdrawalTransforms');
jest.mock('../../../../selectors/networkController');
jest.mock('../../../../store');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockDetectHyperLiquidWithdrawal =
  detectHyperLiquidWithdrawal as jest.MockedFunction<
    typeof detectHyperLiquidWithdrawal
  >;
const mockTransformArbitrumWithdrawalsToHistoryItems =
  transformArbitrumWithdrawalsToHistoryItems as jest.MockedFunction<
    typeof transformArbitrumWithdrawalsToHistoryItems
  >;
const mockSelectChainId = selectChainId as jest.MockedFunction<
  typeof selectChainId
>;
const mockStore = store as jest.Mocked<typeof store>;

describe('ArbitrumWithdrawalService', () => {
  let service: ArbitrumWithdrawalService;
  let mockTransactionController: unknown;
  let mockPreferencesController: unknown;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Engine context
    mockTransactionController = {
      state: {
        transactions: {
          tx1: {
            hash: '0x123',
            txParams: {
              from: '0xbridge',
              to: '0xuser',
              data: '0xdata',
            },
            chainId: '0xa4b1',
            time: 1640995200000,
            status: 'confirmed',
            blockNumber: '12345',
          },
          tx2: {
            hash: '0x456',
            txParams: {
              from: '0xother',
              to: '0xuser',
              data: '0xdata2',
            },
            chainId: '0xa4b1',
            time: 1640995201000,
            status: 'confirmed',
            blockNumber: '12346',
          },
        },
      },
    };

    mockPreferencesController = {
      state: {
        selectedAddress: '0xuser',
      },
    };

    (
      mockEngine as unknown as {
        context: {
          TransactionController: unknown;
          PreferencesController: unknown;
        };
      }
    ).context = {
      TransactionController: mockTransactionController,
      PreferencesController: mockPreferencesController,
    };

    // Mock store
    mockStore.getState.mockReturnValue({
      engine: {
        backgroundState: {
          NetworkController: {
            provider: {
              chainId: '0xa4b1',
            },
          },
        },
      },
    } as unknown as RootState);

    // Mock selectors
    mockSelectChainId.mockReturnValue('0xa4b1');

    service = new ArbitrumWithdrawalService();
  });

  describe('getTransactions', () => {
    it('returns transactions from TransactionController', () => {
      const transactions = (
        service as unknown as { getTransactions: () => TransactionMeta[] }
      ).getTransactions();

      expect(transactions).toHaveLength(2);
      expect(transactions[0].hash).toBe('0x123');
      expect(transactions[1].hash).toBe('0x456');
    });

    it('returns empty array when TransactionController throws error', () => {
      (
        mockEngine as unknown as { context: { TransactionController: unknown } }
      ).context.TransactionController = undefined;

      const transactions = (
        service as unknown as { getTransactions: () => TransactionMeta[] }
      ).getTransactions();

      expect(transactions).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error getting transactions from TransactionController:',
        expect.any(Error),
      );
    });

    it('returns empty array when transactions state is undefined', () => {
      (
        mockTransactionController as unknown as {
          state: { transactions: undefined };
        }
      ).state.transactions = undefined;

      const transactions = (
        service as unknown as { getTransactions: () => TransactionMeta[] }
      ).getTransactions();

      expect(transactions).toEqual([]);
    });
  });

  describe('getCurrentChainId', () => {
    it('returns chain ID from store', () => {
      const chainId = (
        service as unknown as { getCurrentChainId: () => string | null }
      ).getCurrentChainId();

      expect(chainId).toBe('0xa4b1');
      expect(mockSelectChainId).toHaveBeenCalledWith(mockStore.getState());
    });

    it('returns null when selector throws error', () => {
      mockSelectChainId.mockImplementation(() => {
        throw new Error('Selector error');
      });

      const chainId = (
        service as unknown as { getCurrentChainId: () => string | null }
      ).getCurrentChainId();

      expect(chainId).toBeNull();
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error getting current chain ID:',
        expect.any(Error),
      );
    });

    it('returns null when selector returns undefined', () => {
      mockSelectChainId.mockReturnValue(
        null as unknown as SupportedCaipChainId,
      );

      const chainId = (
        service as unknown as { getCurrentChainId: () => string | null }
      ).getCurrentChainId();

      expect(chainId).toBeNull();
    });
  });

  describe('getCurrentAddress', () => {
    it('returns selected address from PreferencesController', () => {
      const address = (
        service as unknown as { getCurrentAddress: () => string | null }
      ).getCurrentAddress();

      expect(address).toBe('0xuser');
    });

    it('returns null when PreferencesController throws error', () => {
      (
        mockEngine as unknown as { context: { PreferencesController: unknown } }
      ).context.PreferencesController = undefined;

      const address = (
        service as unknown as { getCurrentAddress: () => string | null }
      ).getCurrentAddress();

      expect(address).toBeNull();
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error getting current address:',
        expect.any(Error),
      );
    });

    it('returns null when selectedAddress is undefined', () => {
      (
        mockPreferencesController as unknown as {
          state: { selectedAddress: undefined };
        }
      ).state.selectedAddress = undefined;

      const address = (
        service as unknown as { getCurrentAddress: () => string | null }
      ).getCurrentAddress();

      expect(address).toBeNull();
    });
  });

  describe('detectWithdrawals', () => {
    const mockWithdrawal = {
      id: 'arbitrum-withdrawal-0x123',
      timestamp: 1640995200000,
      amount: '100',
      txHash: '0x123',
      from: '0xbridge',
      to: '0xuser',
      status: 'completed' as const,
      blockNumber: '12345',
    };

    beforeEach(() => {
      mockDetectHyperLiquidWithdrawal.mockReturnValue(mockWithdrawal);
    });

    it('detects withdrawals from transactions', () => {
      const withdrawals = service.detectWithdrawals();

      expect(withdrawals).toHaveLength(2);
      expect(withdrawals[0]).toEqual(mockWithdrawal);
      expect(mockDetectHyperLiquidWithdrawal).toHaveBeenCalledTimes(2);
    });

    it('sorts withdrawals by timestamp descending', () => {
      const mockWithdrawal2 = {
        ...mockWithdrawal,
        id: 'arbitrum-withdrawal-0x456',
        txHash: '0x456',
        timestamp: 1640995201000,
      };

      mockDetectHyperLiquidWithdrawal
        .mockReturnValueOnce(mockWithdrawal)
        .mockReturnValueOnce(mockWithdrawal2);

      const withdrawals = service.detectWithdrawals();

      expect(withdrawals[0].timestamp).toBeGreaterThan(
        withdrawals[1].timestamp,
      );
    });

    it('uses provided user address and chain ID', () => {
      const customAddress = '0xcustom';
      const customChainId = '0x66eee';

      service.detectWithdrawals(customAddress, customChainId);

      expect(mockDetectHyperLiquidWithdrawal).toHaveBeenCalledWith(
        expect.any(Object),
        customAddress,
        customChainId,
      );
    });

    it('filters out null detection results', () => {
      mockDetectHyperLiquidWithdrawal
        .mockReturnValueOnce(mockWithdrawal)
        .mockReturnValueOnce(null);

      const withdrawals = service.detectWithdrawals();

      expect(withdrawals).toHaveLength(1);
      expect(withdrawals[0]).toEqual(mockWithdrawal);
    });

    it('handles detection errors gracefully', () => {
      mockDetectHyperLiquidWithdrawal.mockImplementation(() => {
        throw new Error('Detection error');
      });

      const withdrawals = service.detectWithdrawals();

      expect(withdrawals).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error detecting Arbitrum withdrawals:',
        expect.any(Error),
      );
    });

    it('logs detected withdrawals', () => {
      service.detectWithdrawals();

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Detected Arbitrum withdrawals:',
        expect.objectContaining({
          count: 2,
          withdrawals: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              amount: expect.any(String),
              txHash: expect.any(String),
              timestamp: expect.any(Number),
            }),
          ]),
        }),
      );
    });
  });

  describe('getWithdrawalHistory', () => {
    const mockWithdrawals = [
      {
        id: 'arbitrum-withdrawal-0x123',
        timestamp: 1640995200000,
        amount: '100',
        txHash: '0x123',
        from: '0xbridge',
        to: '0xuser',
        status: 'completed' as const,
        blockNumber: '12345',
      },
    ];

    const mockHistoryItems = [
      {
        id: 'history-1',
        timestamp: 1640995200000,
        type: 'withdrawal' as const,
        amount: '100',
        asset: 'USDC',
        status: 'completed' as const,
        txHash: '0x123',
        details: {
          source: 'arbitrum',
          bridgeContract: '0x1234567890123456789012345678901234567890',
          recipient: '0x9876543210987654321098765432109876543210',
          blockNumber: '12345',
          chainId: '42161',
          synthetic: false,
        },
      },
    ];

    beforeEach(() => {
      jest.spyOn(service, 'detectWithdrawals').mockReturnValue(mockWithdrawals);
      mockTransformArbitrumWithdrawalsToHistoryItems.mockReturnValue(
        mockHistoryItems,
      );
    });

    it('transforms withdrawals to history items', () => {
      const history = service.getWithdrawalHistory();

      expect(history).toEqual(mockHistoryItems);
      expect(
        mockTransformArbitrumWithdrawalsToHistoryItems,
      ).toHaveBeenCalledWith(mockWithdrawals);
    });

    it('passes parameters to detectWithdrawals', () => {
      const customAddress = '0xcustom';
      const customChainId = '0x66eee';

      service.getWithdrawalHistory(customAddress, customChainId);

      expect(service.detectWithdrawals).toHaveBeenCalledWith(
        customAddress,
        customChainId,
      );
    });
  });

  describe('isOnArbitrum', () => {
    it('returns true for Arbitrum mainnet', () => {
      mockSelectChainId.mockReturnValue('0xa4b1');

      const result = service.isOnArbitrum();

      expect(result).toBe(true);
    });

    it('returns true for Arbitrum testnet', () => {
      mockSelectChainId.mockReturnValue('0x66eee');

      const result = service.isOnArbitrum();

      expect(result).toBe(true);
    });

    it('returns false for other networks', () => {
      mockSelectChainId.mockReturnValue('0x1');

      const result = service.isOnArbitrum();

      expect(result).toBe(false);
    });

    it('returns false when chain ID is null', () => {
      mockSelectChainId.mockReturnValue(
        null as unknown as SupportedCaipChainId,
      );

      const result = service.isOnArbitrum();

      expect(result).toBe(false);
    });
  });
});
