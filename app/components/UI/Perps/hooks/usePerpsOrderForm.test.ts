import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { usePerpsOrderForm } from './usePerpsOrderForm';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsLiveAccount, usePerpsLivePrices } from './stream';
import { usePerpsMarketData } from './usePerpsMarketData';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import {
  PerpsStreamProvider,
  PerpsStreamManager,
} from '../providers/PerpsStreamManager';
import {
  findOptimalAmount,
  getMaxAllowedAmount,
} from '../utils/orderCalculations';

jest.mock('./usePerpsNetwork');
jest.mock('./stream/usePerpsLiveAccount');
jest.mock('./stream/usePerpsLivePrices');
jest.mock('./usePerpsMarketData');
jest.mock('../utils/orderCalculations', () => ({
  findOptimalAmount: jest.fn(),
  getMaxAllowedAmount: jest.fn(),
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
  const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
    typeof usePerpsLivePrices
  >;
  const mockUsePerpsMarketData = usePerpsMarketData as jest.MockedFunction<
    typeof usePerpsMarketData
  >;
  const mockFindOptimalAmount = findOptimalAmount as jest.MockedFunction<
    typeof findOptimalAmount
  >;
  const mockGetMaxAllowedAmount = getMaxAllowedAmount as jest.MockedFunction<
    typeof getMaxAllowedAmount
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
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { price: '50000', timestamp: Date.now() },
    });
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        szDecimals: 6,
        maxLeverage: 100,
        onlyIsolated: false,
      },
      isLoading: false,
      error: null,
    });
    // Mock findOptimalAmount to return the input amount by default
    mockFindOptimalAmount.mockImplementation(
      ({ targetAmount }) => targetAmount,
    );
    // Mock getMaxAllowedAmount to return a reasonable default
    mockGetMaxAllowedAmount.mockReturnValue(3000); // 1000 * 3x leverage
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

      // Should also provide maxPossibleAmount
      expect(result.current.maxPossibleAmount).toBe(3000);
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
      // Arrange - Set low available balance and corresponding maxPossibleAmount
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
      mockGetMaxAllowedAmount.mockReturnValue(6); // Mock the calculated max allowed amount

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      // Assert
      // Should use the max possible amount (6) instead of the default (10)
      expect(result.current.orderForm.amount).toBe('6');
      expect(result.current.maxPossibleAmount).toBe(6);
    });

    it('should use default amount when available balance times leverage is greater than default amount', () => {
      // Arrange - Set sufficient available balance and corresponding maxPossibleAmount
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
      mockGetMaxAllowedAmount.mockReturnValue(15); // Mock max allowed amount greater than default

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      // Assert
      // Should use default amount since maxPossibleAmount (15) > default (10)
      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      );
      expect(result.current.maxPossibleAmount).toBe(15);
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
          availableBalance: '2', // $2 balance
          totalBalance: '2',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '2',
        },
        isInitialLoading: false,
      });
      mockGetMaxAllowedAmount.mockReturnValue(6); // Mock max allowed amount

      const { result: result1 } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      expect(result1.current.orderForm.amount).toBe('6'); // Should use maxPossibleAmount

      // Test 2: High balance scenario
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '100', // $100 balance
          totalBalance: '100',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '100',
        },
        isInitialLoading: false,
      });
      mockGetMaxAllowedAmount.mockReturnValue(300); // Mock max allowed amount

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
        maxAllowedAmount: 3000,
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

    it('should update amount when optimization returns different value within balance limits', () => {
      // Arrange
      mockFindOptimalAmount.mockReturnValue('80'); // Different optimized amount

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

      // Assert - Amount should be updated to the optimized value if it's within maxPossibleAmount
      expect(result.current.orderForm.amount).toBe('80');
    });

    it('should update amount when optimized amount is within available balance', () => {
      // Arrange - Set available balance and corresponding maxPossibleAmount
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '10', // $10 balance
          totalBalance: '10',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '10',
        },
        isInitialLoading: false,
      });
      mockGetMaxAllowedAmount.mockReturnValue(30); // Mock max allowed amount

      mockFindOptimalAmount.mockReturnValue('25'); // Optimized amount within max allowed

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

      // Assert - Amount should be updated since 25 <= 30 (maxPossibleAmount)
      expect(result.current.orderForm.amount).toBe('25');
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

      // Assert - Should call with undefined szDecimals and maxAllowedAmount
      expect(mockFindOptimalAmount).toHaveBeenCalledWith({
        targetAmount: '100',
        price: 50000,
        szDecimals: undefined,
        maxAllowedAmount: 3000,
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

  describe('maxPossibleAmount', () => {
    it('should provide maxPossibleAmount from getMaxAllowedAmount calculation', () => {
      // Arrange
      mockGetMaxAllowedAmount.mockReturnValue(5000);

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      // Assert
      expect(result.current.maxPossibleAmount).toBe(5000);
      expect(mockGetMaxAllowedAmount).toHaveBeenCalledWith({
        availableBalance: 1000,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 3,
      });
    });

    it('should update maxPossibleAmount when dependencies change', () => {
      // Arrange - Initial state
      const { result, rerender } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      expect(result.current.maxPossibleAmount).toBe(3000);

      // Act - Change the available balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '2000', // Doubled balance
          totalBalance: '2000',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalValue: '2000',
        },
        isInitialLoading: false,
      });
      mockGetMaxAllowedAmount.mockReturnValue(6000); // Doubled max allowed amount

      rerender({});

      // Assert - maxPossibleAmount should update
      expect(result.current.maxPossibleAmount).toBe(6000);
    });

    it('should call getMaxAllowedAmount with correct parameters for different assets', () => {
      // Arrange
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: { price: '3000', timestamp: Date.now() },
      });
      mockUsePerpsMarketData.mockReturnValue({
        marketData: {
          szDecimals: 4,
          maxLeverage: 50,
          onlyIsolated: false,
        },
        isLoading: false,
        error: null,
      });

      // Act
      renderHook(() => usePerpsOrderForm({ initialAsset: 'ETH' }), {
        wrapper: TestWrapper,
      });

      // Assert
      expect(mockGetMaxAllowedAmount).toHaveBeenCalledWith({
        availableBalance: 1000,
        assetPrice: 3000,
        assetSzDecimals: 4,
        leverage: 3,
      });
    });
  });
});
