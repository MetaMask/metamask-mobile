import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useArbitrumTransactionMonitor } from './useArbitrumTransactionMonitor';
import { detectHyperLiquidWithdrawal } from '../utils/arbitrumWithdrawalDetection';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

// Mock dependencies
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../utils/arbitrumWithdrawalDetection');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockDetectHyperLiquidWithdrawal =
  detectHyperLiquidWithdrawal as jest.MockedFunction<
    typeof detectHyperLiquidWithdrawal
  >;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('useArbitrumTransactionMonitor', () => {
  const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
  const mockChainId = '0xa4b1';
  const mockTransactions = {
    tx1: {
      hash: '0x123',
      txParams: {
        from: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7', // HyperLiquid bridge contract
        to: mockSelectedAddress,
        data:
          '0xa9059cbb' +
          '0000000000000000000000001234567890123456789012345678901234567890' + // recipient
          '0000000000000000000000000000000000000000000000000000000005f5e100', // 100 USDC
      },
      chainId: mockChainId,
      time: 1640995200000,
      status: 'confirmed',
      blockNumber: '12345',
    },
    tx2: {
      hash: '0x456',
      txParams: {
        from: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7', // HyperLiquid bridge contract
        to: mockSelectedAddress,
        data:
          '0xa9059cbb' +
          '0000000000000000000000001234567890123456789012345678901234567890' + // recipient
          '0000000000000000000000000000000000000000000000000000000007a120', // 0.5 USDC
      },
      chainId: mockChainId,
      time: 1640995201000,
      status: 'confirmed',
      blockNumber: '12346',
    },
  };

  const mockWithdrawal = {
    id: 'arbitrum-withdrawal-0x123',
    timestamp: 1640995200000,
    amount: '100',
    txHash: '0x123',
    from: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
    to: mockSelectedAddress,
    status: 'completed' as const,
    blockNumber: '12345',
  };

  // Helper function to set up mocks for each test
  const setupMocks = (
    overrides: {
      selectedAddress?: string | null;
      chainId?: string;
      transactions?: Record<string, unknown>;
    } = {},
  ) => {
    const {
      selectedAddress = mockSelectedAddress,
      chainId = mockChainId,
      transactions = mockTransactions,
    } = overrides;

    mockUseSelector
      .mockReturnValueOnce(selectedAddress) // selectedAddress
      .mockReturnValueOnce(chainId) // currentChainId
      .mockReturnValueOnce(transactions); // allTransactions
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectHyperLiquidWithdrawal.mockReturnValue(mockWithdrawal);
  });

  describe('Arbitrum detection', () => {
    it('does not process transactions when not on Arbitrum', async () => {
      setupMocks({ chainId: '0x1' }); // Set up mocks for non-Arbitrum network
      const { result } = renderHook(() => useArbitrumTransactionMonitor());

      // Wait for the effect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.withdrawals).toEqual([]);
      expect(mockDetectHyperLiquidWithdrawal).not.toHaveBeenCalled();
    });

    it('does not process transactions when no selected address', async () => {
      setupMocks({ selectedAddress: null }); // Set up mocks with no selected address
      const { result } = renderHook(() => useArbitrumTransactionMonitor());

      // Wait for the effect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.withdrawals).toEqual([]);
      expect(mockDetectHyperLiquidWithdrawal).not.toHaveBeenCalled();
    });
  });

  describe('transaction processing', () => {
    it('handles empty transactions object', async () => {
      setupMocks({ transactions: {} }); // Set up mocks with empty transactions
      const { result } = renderHook(() => useArbitrumTransactionMonitor());

      // Wait for the effect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.withdrawals).toEqual([]);
    });
  });

  describe('loading and error states', () => {
    it('sets loading state during processing', () => {
      const { result } = renderHook(() => useArbitrumTransactionMonitor());

      act(() => {
        mockUseSelector
          .mockReturnValueOnce(mockSelectedAddress)
          .mockReturnValueOnce(mockChainId)
          .mockReturnValueOnce(mockTransactions);
      });

      // Loading should be false after processing completes
      expect(result.current.isLoading).toBe(false);
    });

    it('handles processing errors gracefully', () => {
      mockDetectHyperLiquidWithdrawal.mockImplementation(() => {
        throw new Error('Detection error');
      });

      const { result } = renderHook(() => useArbitrumTransactionMonitor());

      act(() => {
        mockUseSelector
          .mockReturnValueOnce(mockSelectedAddress)
          .mockReturnValueOnce(mockChainId)
          .mockReturnValueOnce(mockTransactions);
      });

      expect(result.current.error).toBe('Detection error');
      expect(result.current.withdrawals).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error processing Arbitrum transactions:',
        'Detection error',
      );
    });

    it('handles non-Error exceptions', () => {
      mockDetectHyperLiquidWithdrawal.mockImplementation(() => {
        throw 'String error';
      });

      const { result } = renderHook(() => useArbitrumTransactionMonitor());

      act(() => {
        mockUseSelector
          .mockReturnValueOnce(mockSelectedAddress)
          .mockReturnValueOnce(mockChainId)
          .mockReturnValueOnce(mockTransactions);
      });

      expect(result.current.error).toBe('Failed to process transactions');
    });
  });

  describe('logging', () => {
    it('logs detected withdrawals', () => {
      setupMocks(); // Set up default mocks
      renderHook(() => useArbitrumTransactionMonitor());

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Arbitrum withdrawals detected:',
        expect.objectContaining({
          count: 2,
          withdrawals: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              amount: expect.any(String),
              txHash: expect.any(String),
            }),
          ]),
        }),
      );
    });
  });
});
