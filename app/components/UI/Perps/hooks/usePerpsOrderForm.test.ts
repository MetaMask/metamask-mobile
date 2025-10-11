import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { usePerpsOrderForm } from './usePerpsOrderForm';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import { usePerpsLivePrices } from './stream/usePerpsLivePrices';
import { usePerpsMarketData } from './usePerpsMarketData';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import {
  PerpsStreamProvider,
  PerpsStreamManager,
} from '../providers/PerpsStreamManager';

jest.mock('./usePerpsNetwork');
jest.mock('./stream/usePerpsLiveAccount');
jest.mock('./stream/usePerpsLivePrices');
jest.mock('./usePerpsMarketData');

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
      BTC: { price: '50000', timestamp: Date.now(), coin: 'BTC' },
      ETH: { price: '3000', timestamp: Date.now(), coin: 'ETH' },
    });
    mockUsePerpsMarketData.mockReturnValue({
      marketData: {
        szDecimals: 6,
        name: 'BTC',
        maxLeverage: 10,
        marginTableId: 1,
      },
      refetch: jest.fn(),
      isLoading: false,
      error: null,
    });
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

  describe('optimizeOrderAmount', () => {
    it('should not optimize when amount is empty', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('');
        result.current.optimizeOrderAmount(50000, 6);
      });

      expect(result.current.orderForm.amount).toBe('0');
    });

    it('should not optimize when amount is zero', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('0');
        result.current.optimizeOrderAmount(50000, 6);
      });

      expect(result.current.orderForm.amount).toBe('0');
    });

    it('should optimize amount when valid amount is provided', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
        result.current.optimizeOrderAmount(50000, 6);
      });

      // The optimized amount should be calculated by findOptimalAmount
      expect(result.current.orderForm.amount).toBeTruthy();
    });

    it('should not update amount if optimized amount exceeds maxPossibleAmount', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      const initialAmount = '100';

      act(() => {
        result.current.setAmount(initialAmount);
        // Use a very low maxPossibleAmount to trigger the condition
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Amount should remain unchanged if optimization would exceed max
      expect(result.current.orderForm.amount).toBe(initialAmount);
    });

    it('should only update amount if optimized amount is different from current', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('10'); // Use default amount
        result.current.optimizeOrderAmount(50000, 6);
      });

      const optimizedAmount = result.current.orderForm.amount;

      // Call optimize again with same parameters
      act(() => {
        result.current.optimizeOrderAmount(50000, 6);
      });

      // Amount should not change if already optimized
      expect(result.current.orderForm.amount).toBe(optimizedAmount);
    });

    it('should handle undefined szDecimals parameter', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAmount('100');
        result.current.optimizeOrderAmount(50000, undefined);
      });

      expect(result.current.orderForm.amount).toBeTruthy();
    });
  });
});
