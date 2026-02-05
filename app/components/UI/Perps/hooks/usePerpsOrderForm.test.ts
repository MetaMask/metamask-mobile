/* eslint-disable react/no-children-prop */
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, act } from '@testing-library/react-native';
import { usePerpsOrderForm } from './usePerpsOrderForm';
import { usePerpsNetwork } from './usePerpsNetwork';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import { usePerpsLivePrices } from './stream/usePerpsLivePrices';
import { usePerpsLivePositions } from './stream/usePerpsLivePositions';
import { usePerpsMarketData } from './usePerpsMarketData';
import { TRADING_DEFAULTS } from '../constants/hyperLiquidConfig';
import {
  PerpsStreamProvider,
  PerpsStreamManager,
} from '../providers/PerpsStreamManager';
import type { Position } from '../controllers/types';

jest.mock('./usePerpsNetwork');
jest.mock('./stream/usePerpsLiveAccount');
jest.mock('./stream/usePerpsLivePrices');
jest.mock('./stream/usePerpsLivePositions');
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

// Test wrapper with Redux Provider using configureStore pattern
const createWrapper = () => {
  const mockStore = configureStore({
    reducer: {
      engine: (
        state = {
          backgroundState: {
            PerpsController: {},
          },
        },
      ) => state,
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    const streamProvider = React.createElement(PerpsStreamProvider, {
      testStreamManager: createMockStreamManager(),
      children,
    } as React.ComponentProps<typeof PerpsStreamProvider>);

    return React.createElement(Provider, {
      store: mockStore,
      children: streamProvider,
    });
  };
};

// Helper to create mock positions
const createMockPosition = (
  symbol: string,
  leverageValue: number,
): Position => ({
  symbol,
  size: '1.5',
  entryPrice: '50000',
  positionValue: '75000',
  unrealizedPnl: '0',
  marginUsed: '7500',
  leverage: { type: 'isolated', value: leverageValue },
  liquidationPrice: '45000',
  maxLeverage: 50,
  returnOnEquity: '0',
  cumulativeFunding: {
    allTime: '0',
    sinceOpen: '0',
    sinceChange: '0',
  },
  takeProfitCount: 0,
  stopLossCount: 0,
});

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
  const mockUsePerpsLivePositions =
    usePerpsLivePositions as jest.MockedFunction<typeof usePerpsLivePositions>;
  const mockUsePerpsMarketData = usePerpsMarketData as jest.MockedFunction<
    typeof usePerpsMarketData
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        availableBalance: '1000',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalBalance: '1000',
      },
      isInitialLoading: false,
    });
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: { price: '50000', timestamp: Date.now(), symbol: 'BTC' },
      ETH: { price: '3000', timestamp: Date.now(), symbol: 'ETH' },
    });
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
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
        wrapper: createWrapper(),
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

    it('should prioritize existing position leverage over saved config', () => {
      // Mock existing position with 10x leverage
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [createMockPosition('BTC', 10)],
        isInitialLoading: false,
      });

      // Create a wrapper with saved config for BTC at 5x leverage
      const mockStoreWithSavedConfig = configureStore({
        reducer: {
          engine: (
            state = {
              backgroundState: {
                PerpsController: {
                  isTestnet: false,
                  tradeConfigurations: {
                    mainnet: {
                      BTC: { leverage: 5 },
                    },
                    testnet: {},
                  },
                },
              },
            },
          ) => state,
        },
      });

      const WrapperWithSavedConfig = ({
        children,
      }: {
        children: React.ReactNode;
      }) => {
        const streamProvider = React.createElement(PerpsStreamProvider, {
          testStreamManager: createMockStreamManager(),
          children,
        } as React.ComponentProps<typeof PerpsStreamProvider>);

        return React.createElement(Provider, {
          store: mockStoreWithSavedConfig,
          children: streamProvider,
        });
      };

      // Render hook - should use existing position leverage from mocked positions
      const { result } = renderHook(
        () =>
          usePerpsOrderForm({
            initialAsset: 'BTC',
          }),
        { wrapper: WrapperWithSavedConfig },
      );

      // Should use existing position leverage (10x), not saved config (5x) or default (3x)
      expect(result.current.orderForm.leverage).toBe(10);
    });

    it('should use saved config when no existing position leverage', () => {
      // Create a wrapper with saved config for BTC at 5x leverage
      const mockStoreWithSavedConfig = configureStore({
        reducer: {
          engine: (
            state = {
              backgroundState: {
                PerpsController: {
                  isTestnet: false,
                  tradeConfigurations: {
                    mainnet: {
                      BTC: { leverage: 5 },
                    },
                    testnet: {},
                  },
                },
              },
            },
          ) => state,
        },
      });

      const WrapperWithSavedConfig = ({
        children,
      }: {
        children: React.ReactNode;
      }) => {
        const streamProvider = React.createElement(PerpsStreamProvider, {
          testStreamManager: createMockStreamManager(),
          children,
        } as React.ComponentProps<typeof PerpsStreamProvider>);

        return React.createElement(Provider, {
          store: mockStoreWithSavedConfig,
          children: streamProvider,
        });
      };

      // Render without existing position leverage
      const { result } = renderHook(
        () =>
          usePerpsOrderForm({
            initialAsset: 'BTC',
          }),
        { wrapper: WrapperWithSavedConfig },
      );

      // Should use saved config (5x), not default (3x)
      expect(result.current.orderForm.leverage).toBe(5);
    });

    it('should prioritize navigation param over existing position leverage', () => {
      // Mock existing position with 10x leverage
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [createMockPosition('BTC', 10)],
        isInitialLoading: false,
      });

      // Render with both navigation param (12x) and existing position leverage (10x)
      const { result } = renderHook(
        () =>
          usePerpsOrderForm({
            initialAsset: 'BTC',
            initialLeverage: 12,
          }),
        { wrapper: createWrapper() },
      );

      // Should use navigation param (12x), highest priority
      expect(result.current.orderForm.leverage).toBe(12);
    });

    it('should update leverage when existing position loads asynchronously', async () => {
      // Initial render without existing position (positions haven't loaded via WebSocket yet)
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(
        () =>
          usePerpsOrderForm({
            initialAsset: 'BTC',
          }),
        { wrapper: createWrapper() },
      );

      // Initially should use default leverage (3x) since no position loaded yet
      expect(result.current.orderForm.leverage).toBe(3);

      // Simulate position loading asynchronously with 10x leverage
      act(() => {
        mockUsePerpsLivePositions.mockReturnValue({
          positions: [createMockPosition('BTC', 10)],
          isInitialLoading: false,
        });
      });

      // Re-render the existing hook instance to trigger useEffect
      rerender({});

      // Should update to 10x when position loads
      expect(result.current.orderForm.leverage).toBe(10);
    });

    it('should not update leverage if navigation param is provided even when position loads', () => {
      // Initial render with navigation param but no existing position
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result, rerender } = renderHook(
        () =>
          usePerpsOrderForm({
            initialAsset: 'BTC',
            initialLeverage: 12, // explicit navigation param
          }),
        { wrapper: createWrapper() },
      );

      // Should use navigation param (12x)
      expect(result.current.orderForm.leverage).toBe(12);

      // Simulate position loading asynchronously with 10x leverage
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [createMockPosition('BTC', 10)],
        isInitialLoading: false,
      });

      // Re-render the existing hook instance to trigger useEffect
      rerender({});

      // Should still be 12x (navigation param takes priority)
      expect(result.current.orderForm.leverage).toBe(12);
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
        { wrapper: createWrapper() },
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
        wrapper: createWrapper(),
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
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '2',
        },
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
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
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '5',
        },
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
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
      // Arrange - Start with balance high enough that max >= 999 (e.g. 334 * 3x = 1002)
      const mockAccount = {
        account: {
          availableBalance: '334',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '334',
        },
        isInitialLoading: false,
      };
      mockUsePerpsLiveAccount.mockReturnValue(mockAccount);

      const { result, rerender } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      // Verify initial amount is set correctly
      expect(result.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      );

      // Act - User changes the amount (within current max)
      act(() => {
        result.current.setAmount('999');
      });
      expect(result.current.orderForm.amount).toBe('999');

      // Act - Change the available balance so the new max is below user's amount
      mockAccount.account.availableBalance = '1'; // $1 balance → max order size drops below 999
      mockUsePerpsLiveAccount.mockReturnValue(mockAccount);
      rerender({});

      // Assert - Amount should be clamped to the new max when effective balance drops (payment token change or balance update)
      expect(Number(result.current.orderForm.amount)).toBeLessThanOrEqual(
        result.current.maxPossibleAmount,
      );
      expect(result.current.orderForm.amount).not.toBe('999');
    });

    it('should use useMemo for initialAmountValue calculation', () => {
      // This test verifies that useMemo is working by testing different scenarios
      // that should produce different initialAmountValue calculations

      // Test 1: Low balance scenario
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '2', // $2 balance = $6 max with 3x leverage (less than $10 default)
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '2',
        },
        isInitialLoading: false,
      });

      const { result: result1 } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      expect(result1.current.orderForm.amount).toBe('6'); // Should use maxPossibleAmount

      // Test 2: High balance scenario
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '100', // $100 balance = $300 max with 3x leverage (more than $10 default)
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '100',
        },
        isInitialLoading: false,
      });

      const { result: result2 } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      expect(result2.current.orderForm.amount).toBe(
        TRADING_DEFAULTS.amount.mainnet.toString(),
      ); // Should use default amount
    });
  });

  describe('form updates', () => {
    it('should update amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAmount('250');
      });

      expect(result.current.orderForm.amount).toBe('250');
    });

    it('should update leverage', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setLeverage(15);
      });

      expect(result.current.orderForm.leverage).toBe(15);
    });

    it('should update direction', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setDirection('short');
      });

      expect(result.current.orderForm.direction).toBe('short');
    });

    it('should update asset', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAsset('SOL');
      });

      expect(result.current.orderForm.asset).toBe('SOL');
    });

    it('should update take profit price', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTakeProfitPrice('55000');
      });

      expect(result.current.orderForm.takeProfitPrice).toBe('55000');
    });

    it('should update stop loss price', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setStopLossPrice('45000');
      });

      expect(result.current.orderForm.stopLossPrice).toBe('45000');
    });

    it('should update limit price', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setLimitPrice('50000');
      });

      expect(result.current.orderForm.limitPrice).toBe('50000');
    });

    it('should update order type', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setOrderType('limit');
      });

      expect(result.current.orderForm.type).toBe('limit');
    });

    it('should update multiple fields at once', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlePercentageAmount(0.5);
      });

      expect(result.current.orderForm.amount).toBe('1500'); // 50% of 1000 * 3x leverage
    });

    it('should handle max amount', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleMaxAmount();
      });

      expect(result.current.orderForm.amount).toBe('3000'); // 1000 * 3x leverage
    });

    it('should handle min amount for mainnet', () => {
      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
          totalBalance: '0',
        },
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsOrderForm(), {
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAmount('');
      });

      expect(result.current.orderForm.amount).toBe('0');
    });
  });
});
