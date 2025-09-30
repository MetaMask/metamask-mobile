import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { usePerpsOrderForm } from './usePerpsOrderForm';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import {
  PerpsStreamProvider,
  PerpsStreamManager,
} from '../providers/PerpsStreamManager';
import { findOptimalAmount } from '../utils/orderCalculations';

jest.mock('./usePerpsNetwork');
jest.mock('./stream/usePerpsLiveAccount');
jest.mock('../utils/orderCalculations', () => ({
  findOptimalAmount: jest.fn(),
}));

// Create a mock stream manager for testing
const createMockStreamManager = (): PerpsStreamManager => {
  const mockStreamManager = {
    prices: {
      subscribe: jest.fn(() => jest.fn()),
      subscribeToSymbols: jest.fn(() => jest.fn()),
      prewarm: jest.fn(() => jest.fn()),
      cleanupPrewarm: jest.fn(),
      clearCache: jest.fn(),
    },
    orders: {
      subscribe: jest.fn(() => jest.fn()),
      prewarm: jest.fn(() => jest.fn()),
      cleanupPrewarm: jest.fn(),
      clearCache: jest.fn(),
    },
    positions: {
      subscribe: jest.fn(() => jest.fn()),
      prewarm: jest.fn(() => jest.fn()),
      cleanupPrewarm: jest.fn(),
      clearCache: jest.fn(),
    },
    fills: {
      subscribe: jest.fn(() => jest.fn()),
      clearCache: jest.fn(),
    },
    account: {
      subscribe: jest.fn(() => jest.fn()),
      prewarm: jest.fn(() => jest.fn()),
      cleanupPrewarm: jest.fn(),
      clearCache: jest.fn(),
    },
    marketData: {
      subscribe: jest.fn(() => jest.fn()),
      prewarm: jest.fn(() => jest.fn()),
      refresh: jest.fn(),
      clearCache: jest.fn(),
    },
  } as unknown as PerpsStreamManager;

  return mockStreamManager;
};

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(PerpsStreamProvider, {
    testStreamManager: createMockStreamManager(),
    children,
  } as React.ComponentProps<typeof PerpsStreamProvider>);
}

describe('usePerpsOrderForm', () => {
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;
  const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
    typeof usePerpsLiveAccount
  >;
  const mockFindOptimalAmount = findOptimalAmount as jest.MockedFunction<
    typeof findOptimalAmount
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        availableBalance: '1000',
        totalBalance: '1000',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalValue: '1000',
      },
      isInitialLoading: false,
    });
    // Mock findOptimalAmount to return the input amount by default
    mockFindOptimalAmount.mockImplementation(
      ({ targetAmount }) => targetAmount,
    );
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      expect(result.current.orderForm).toEqual({
        asset: 'BTC',
        direction: 'long',
        amount: TRADING_DEFAULTS.amount.mainnet.toString(),
        leverage: TRADING_DEFAULTS.leverage,
        balancePercent: expect.any(Number),
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
        limitPrice: undefined,
        type: 'market',
      });
    });

    it('should initialize with provided values', () => {
      const { result } = renderHook(
        () =>
          usePerpsOrderForm({
            initialAsset: 'ETH',
            initialDirection: 'short',
            initialAmount: '500',
            initialLeverage: 20,
            initialType: 'limit',
          }),
        { wrapper: TestWrapper },
      );

      expect(result.current.orderForm).toEqual({
        asset: 'ETH',
        direction: 'short',
        amount: '500',
        leverage: 20,
        balancePercent: expect.any(Number),
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
        limitPrice: undefined,
        type: 'limit',
      });
    });

    it('should use testnet defaults when on testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.testnet.toString(),
      );
    });

    it('should set amount to maxPossibleAmount when available balance times leverage is less than default amount', () => {
      // Arrange - Set low available balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '2', // $2 available balance
          totalBalance: '2',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '2',
        },
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      // Assert
      // With $2 balance and 3x leverage = $6 max amount, which is less than $10 default
      // Should use the max possible amount ($6) instead of the default ($10)
      expect(result.current.orderForm.amount).toBe('6');
    });

    it('should use default amount when available balance times leverage is greater than default amount', () => {
      // Arrange - Set sufficient available balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '5', // $5 available balance
          totalBalance: '5',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '5',
        },
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      // Assert
      // With $5 balance and 3x leverage = $15 max amount, which is greater than $10 default
      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      );
    });
  });

  describe('useMemo and useEffect behavior', () => {
    it('should not overwrite user input when dependencies change', async () => {
      // Arrange - Start with sufficient balance
      const mockAccount = {
        account: {
          availableBalance: '10', // $10 balance = $30 max with 3x leverage
          totalBalance: '10',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '10',
        },
        isInitialLoading: false,
      };
      mockUsePerpsLiveAccount.mockReturnValue(mockAccount);

      const { result, rerender } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      // Verify initial amount is set correctly
      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      );

      // Act - User changes the amount
      act(() => {
        result.current.setAmount('999');
      });
      expect(result.current.orderForm.amount).toBe('999');

      // Act - Change the available balance to trigger useMemo recalculation
      mockAccount.account.availableBalance = '1'; // This would normally trigger a different initialAmountValue
      mockUsePerpsLiveAccount.mockReturnValue(mockAccount);
      rerender({});

      // Assert - Amount should not be overwritten due to hasSetInitialAmount ref
      expect(result.current.orderForm.amount).toBe('999');
    });

    it('should use useMemo for initialAmountValue calculation', () => {
      // This test verifies that useMemo is working by testing different scenarios
      // that should produce different initialAmountValue calculations

      // Test 1: Low balance scenario
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '2', // $2 balance = $6 max with 3x leverage (less than $10 default)
          totalBalance: '2',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '2',
        },
        isInitialLoading: false,
      });

      const { result: result1 } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      expect(result1.current.orderForm.amount).toBe('6'); // Should use maxPossibleAmount

      // Test 2: High balance scenario
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '100', // $100 balance = $300 max with 3x leverage (more than $10 default)
          totalBalance: '100',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '100',
        },
        isInitialLoading: false,
      });

      const { result: result2 } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      expect(result2.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      ); // Should use default amount
    });
  });

  describe('form updates', () => {
    it('should update amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('250');
      });

      expect(result.current.orderForm.amount).toBe('250');
    });

    it('should update leverage', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setLeverage(15);
      });

      expect(result.current.orderForm.leverage).toBe(15);
    });

    it('should update direction', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setDirection('short');
      });

      expect(result.current.orderForm.direction).toBe('short');
    });

    it('should update asset', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAsset('SOL');
      });

      expect(result.current.orderForm.asset).toBe('SOL');
    });

    it('should update take profit price', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setTakeProfitPrice('55000');
      });

      expect(result.current.orderForm.takeProfitPrice).toBe('55000');
    });

    it('should update stop loss price', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setStopLossPrice('45000');
      });

      expect(result.current.orderForm.stopLossPrice).toBe('45000');
    });

    it('should update limit price', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setLimitPrice('50000');
      });

      expect(result.current.orderForm.limitPrice).toBe('50000');
    });

    it('should update order type', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setOrderType('limit');
      });

      expect(result.current.orderForm.type).toBe('limit');
    });

    it('should update multiple fields at once', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.updateOrderForm({
          amount: '300',
          leverage: 25,
          direction: 'short',
        });
      });

      expect(result.current.orderForm.amount).toBe('300');
      expect(result.current.orderForm.leverage).toBe(25);
      expect(result.current.orderForm.direction).toBe('short');
    });
  });

  describe('percentage handlers', () => {
    it('should handle percentage amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.handlePercentageAmount(0.5);
      });

      expect(result.current.orderForm.amount).toBe('1500'); // 50% of 1000 * 3x leverage
    });

    it('should handle max amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.handleMaxAmount();
      });

      expect(result.current.orderForm.amount).toBe('3000'); // 1000 * 3x leverage
    });

    it('should handle min amount for mainnet', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.handleMinAmount();
      });

      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      );
    });

    it('should handle min amount for testnet', () => {
      mockUsePerpsNetwork.mockReturnValue('testnet');
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.handleMinAmount();
      });

      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.testnet.toString(),
      );
    });

    it('should not update amount when balance is 0', () => {
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '0',
          totalBalance: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '0',
        },
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });
      const initialAmount = result.current.orderForm.amount;

      act(() => {
        result.current.handlePercentageAmount(0.5);
      });

      expect(result.current.orderForm.amount).toBe(initialAmount);
    });
  });

  describe('optimizeOrderAmount', () => {
    it('should call findOptimalAmount with correct parameters', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
      });

      const price = 50000;
      const szDecimals = 6;

      // Act
      act(() => {
        result.current.optimizeOrderAmount(price, szDecimals);
      });

      // Assert
      expect(mockFindOptimalAmount).toHaveBeenCalledWith({
        targetAmount: '100',
        price: 50000,
        szDecimals: 6,
      });
    });

    it('should update amount when optimization returns higher value within balance limits', () => {
      // Arrange
      mockFindOptimalAmount.mockReturnValue('120'); // Higher optimized amount

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - Amount should be updated to the optimized value
      expect(result.current.orderForm.amount).toBe('120');
    });

    it('should not update amount when optimization returns same value', () => {
      // Arrange
      mockFindOptimalAmount.mockReturnValue('100'); // Same amount

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - Amount should remain unchanged
      expect(result.current.orderForm.amount).toBe('100');
    });

    it('should not update amount when optimization returns lower value', () => {
      // Arrange
      mockFindOptimalAmount.mockReturnValue('80'); // Lower optimized amount

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - Amount should remain unchanged
      expect(result.current.orderForm.amount).toBe('100');
    });

    it('should not update amount when optimized amount exceeds available balance', () => {
      // Arrange - Set low available balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '10', // $10 balance = $30 max with 3x leverage
          totalBalance: '10',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '10',
        },
        isInitialLoading: false,
      });

      mockFindOptimalAmount.mockReturnValue('50'); // Optimized amount exceeds max allowed (30)

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('20');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - Amount should remain unchanged due to balance limit
      expect(result.current.orderForm.amount).toBe('20');
    });

    it('should not optimize when amount is zero', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('0');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - findOptimalAmount should not be called for zero amount
      expect(mockFindOptimalAmount).not.toHaveBeenCalled();
    });

    it('should not optimize when amount is empty', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - findOptimalAmount should not be called for empty amount
      expect(mockFindOptimalAmount).not.toHaveBeenCalled();
    });

    it('should handle optimization with default szDecimals when not provided', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
      });

      // Act - Call without szDecimals parameter
      act(() => {
        result.current.optimizeOrderAmount(50000);
      });

      // Assert - Should call with undefined szDecimals (handled by findOptimalAmount)
      expect(mockFindOptimalAmount).toHaveBeenCalledWith({
        targetAmount: '100',
        price: 50000,
        szDecimals: undefined,
      });
    });

    it('should work correctly with different leverage values', () => {
      // Arrange
      mockFindOptimalAmount.mockReturnValue('150'); // Higher optimized amount

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
        result.current.setLeverage(10); // Higher leverage = higher max allowed amount
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - Should update since 150 is within 1000 * 10 = 10000 limit
      expect(result.current.orderForm.amount).toBe('150');
    });

    it('should maintain precision in amount updates', () => {
      // Arrange
      mockFindOptimalAmount.mockReturnValue('123.45'); // Decimal optimized amount

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100.00');
      });

      // Act
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Assert - Should preserve decimal precision
      expect(result.current.orderForm.amount).toBe('123.45');
    });
  });

  describe('empty amount handling', () => {
    it('should convert empty string to 0', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('');
      });

      expect(result.current.orderForm.amount).toBe('0');
    });
  });
});
