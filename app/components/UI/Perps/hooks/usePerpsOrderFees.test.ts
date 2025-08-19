import { renderHook, waitFor } from '@testing-library/react-native';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsOrderFees, formatFeeRate } from './usePerpsOrderFees';
import { METAMASK_FEE_CONFIG } from '../constants/perpsConfig';
import type { FeeCalculationResult } from '../controllers/types';

// Mock dependencies
jest.mock('./usePerpsTrading');

const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
  typeof usePerpsTrading
>;

describe('usePerpsOrderFees', () => {
  const mockCalculateFees = jest.fn<
    Promise<FeeCalculationResult>,
    [{ orderType: 'market' | 'limit'; isMaker?: boolean; amount?: string }]
  >();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsTrading.mockReturnValue({
      calculateFees: mockCalculateFees,
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      closePosition: jest.fn(),
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      getAccountState: jest.fn(),
      subscribeToPrices: jest.fn(),
      subscribeToPositions: jest.fn(),
      subscribeToOrderFills: jest.fn(),
      deposit: jest.fn(),
      depositWithConfirmation: jest.fn(),
      getDepositRoutes: jest.fn(),
      resetDepositState: jest.fn(),
      withdraw: jest.fn(),
      calculateLiquidationPrice: jest.fn(),
      calculateMaintenanceMargin: jest.fn(),
      getMaxLeverage: jest.fn(),
      updatePositionTPSL: jest.fn(),
      validateOrder: jest.fn(),
      validateClosePosition: jest.fn(),
      validateWithdrawal: jest.fn(),
      getFunding: jest.fn(),
      getOrders: jest.fn(),
      getOrderFills: jest.fn(),
    });
  });

  describe('Fee calculation', () => {
    it('should calculate fees for market orders', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045, // 0.045%
        feeAmount: 45,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '100000',
          isMaker: false,
        }),
      );

      // Initial loading state
      expect(result.current.isLoadingMetamaskFee).toBe(true);
      expect(result.current.error).toBeNull();

      // Wait for async calculation
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      // Verify calculated fees
      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'market',
        isMaker: false,
        amount: '100000',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45); // 100000 * 0.00045
      expect(result.current.metamaskFeeRate).toBe(
        METAMASK_FEE_CONFIG.TRADING_FEE_RATE,
      );
      expect(result.current.metamaskFee).toBe(0); // 100000 * 0
      expect(result.current.totalFee).toBe(45); // protocol + metamask
    });

    it('should calculate fees for limit orders as maker', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00015, // 0.015%
        feeAmount: 15,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'limit',
          amount: '100000',
          isMaker: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: true,
        amount: '100000',
      });
      expect(result.current.protocolFeeRate).toBe(0.00015);
      expect(result.current.protocolFee).toBeCloseTo(15, 10);
    });

    it('should calculate fees for limit orders as taker', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045, // 0.045%
        feeAmount: 45,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'limit',
          amount: '100000',
          isMaker: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(mockCalculateFees).toHaveBeenCalledWith({
        orderType: 'limit',
        isMaker: false,
        amount: '100000',
      });
      expect(result.current.protocolFeeRate).toBe(0.00045);
      expect(result.current.protocolFee).toBe(45);
    });

    it('should handle zero amount', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '0',
          isMaker: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
    });

    it('should handle empty amount string', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 0,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '',
          isMaker: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.protocolFee).toBe(0);
      expect(result.current.metamaskFee).toBe(0);
      expect(result.current.totalFee).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should fall back to default fee rate on error', async () => {
      mockCalculateFees.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '100000',
          isMaker: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.protocolFeeRate).toBe(0); // No fallback - error state
      expect(result.current.protocolFee).toBe(0); // 100000 * 0
    });

    it('should handle non-Error rejection', async () => {
      mockCalculateFees.mockRejectedValue('Unknown error');

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '100000',
          isMaker: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch protocol fees');
      expect(result.current.protocolFeeRate).toBe(0); // No fallback - error state
    });
  });

  describe('Loading states', () => {
    it('should show loading state during fee calculation', async () => {
      // Create a deferred promise that we can control
      const deferred: {
        promise: Promise<FeeCalculationResult>;
        resolve: (value: FeeCalculationResult) => void;
      } = (() => {
        let resolve: (value: FeeCalculationResult) => void = () => true;
        const promise = new Promise<FeeCalculationResult>((res) => {
          resolve = res;
        });
        return { promise, resolve };
      })();

      mockCalculateFees.mockReturnValue(deferred.promise);

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '100000',
          isMaker: false,
        }),
      );

      // Should be loading initially
      expect(result.current.isLoadingMetamaskFee).toBe(true);

      // Resolve the calculation
      deferred.resolve({
        feeRate: 0.00045,
        feeAmount: 45,
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });
    });
  });

  describe('Re-calculation on parameter changes', () => {
    it('should recalculate when order type changes', async () => {
      const mockMarketFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
      };
      const mockLimitFeeResult: FeeCalculationResult = {
        feeRate: 0.00015,
        feeAmount: 15,
      };

      mockCalculateFees
        .mockResolvedValueOnce(mockMarketFeeResult)
        .mockResolvedValueOnce(mockLimitFeeResult);

      const { result, rerender } = renderHook(
        (props: {
          orderType: 'market' | 'limit';
          amount: string;
          isMaker: boolean;
        }) => usePerpsOrderFees(props),
        {
          initialProps: {
            orderType: 'market' as 'market' | 'limit',
            amount: '100000',
            isMaker: false,
          },
        },
      );

      await waitFor(() => {
        expect(result.current.protocolFeeRate).toBe(0.00045);
      });

      // Change to limit order
      rerender({
        orderType: 'limit' as 'market' | 'limit',
        amount: '100000',
        isMaker: true,
      });

      await waitFor(() => {
        expect(result.current.protocolFeeRate).toBe(0.00015);
      });

      expect(mockCalculateFees).toHaveBeenCalledTimes(2);
    });

    it('should recalculate when amount changes', async () => {
      mockCalculateFees
        .mockResolvedValueOnce({ feeRate: 0.00045, feeAmount: 45 })
        .mockResolvedValueOnce({ feeRate: 0.00045, feeAmount: 90 });

      const { result, rerender } = renderHook(
        ({ amount }) =>
          usePerpsOrderFees({ orderType: 'market', amount, isMaker: false }),
        {
          initialProps: { amount: '100000' },
        },
      );

      await waitFor(() => {
        expect(result.current.protocolFee).toBe(45);
      });

      rerender({ amount: '200000' });

      await waitFor(() => {
        expect(result.current.protocolFee).toBe(90);
      });
    });
  });

  describe('MetaMask fee integration', () => {
    it('should include MetaMask fees in total calculation', async () => {
      const mockFeeResult: FeeCalculationResult = {
        feeRate: 0.00045,
        feeAmount: 45,
      };
      mockCalculateFees.mockResolvedValue(mockFeeResult);

      // Temporarily mock a non-zero MetaMask fee
      const originalMetamaskFee = METAMASK_FEE_CONFIG.TRADING_FEE_RATE;
      Object.defineProperty(METAMASK_FEE_CONFIG, 'TRADING_FEE_RATE', {
        value: 0.01, // 1%
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() =>
        usePerpsOrderFees({
          orderType: 'market',
          amount: '100000',
          isMaker: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoadingMetamaskFee).toBe(false);
      });

      expect(result.current.metamaskFeeRate).toBe(0.01);
      expect(result.current.metamaskFee).toBe(1000); // 100000 * 0.01
      expect(result.current.totalFee).toBe(1045); // 45 + 1000

      // Restore original value
      Object.defineProperty(METAMASK_FEE_CONFIG, 'TRADING_FEE_RATE', {
        value: originalMetamaskFee,
        writable: true,
        configurable: true,
      });
    });
  });
});

describe('formatFeeRate', () => {
  it('should format fee rate as percentage', () => {
    expect(formatFeeRate(0.00045)).toBe('0.045%');
    expect(formatFeeRate(0.00015)).toBe('0.015%');
    expect(formatFeeRate(0.01)).toBe('1.000%');
    expect(formatFeeRate(0)).toBe('0.000%');
  });

  it('should handle very small fee rates', () => {
    expect(formatFeeRate(0.000001)).toBe('0.000%');
    expect(formatFeeRate(0.00001)).toBe('0.001%');
  });

  it('should handle large fee rates', () => {
    expect(formatFeeRate(0.1)).toBe('10.000%');
    expect(formatFeeRate(1)).toBe('100.000%');
  });

  it('should handle invalid values', () => {
    expect(formatFeeRate(undefined)).toBe('N/A');
    expect(formatFeeRate(null)).toBe('N/A');
    expect(formatFeeRate(NaN)).toBe('N/A');
  });
});
