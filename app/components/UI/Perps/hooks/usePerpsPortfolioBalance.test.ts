import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectConversionRateBySymbol } from '../../../../selectors/currencyRateController';
import { createTestWrapperWithStreamProvider } from '../__mocks__';
import { selectPerpsBalances } from '../selectors/perpsController';
import { usePerpsPortfolioBalance } from './usePerpsPortfolioBalance';

// Mock dependencies
jest.mock('react-redux');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getAccountState: jest.fn(),
      state: {
        isEligible: true,
      },
    },
  },
}));
jest.mock('../selectors/perpsController');
jest.mock('../../../../selectors/currencyRateController');
jest.mock('./stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: {
      totalBalance: '1000.00',
      availableBalance: '750.00',
      marginUsed: '250.00',
      unrealizedPnl: '25.50',
      returnOnEquity: '2.55',
      totalValue: '1025.50',
    },
    isLoading: false,
    error: null,
  })),
}));

describe('usePerpsPortfolioBalance', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  // Get the mock function directly from the mocked module
  const streamMocks = jest.requireMock('./stream');

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset eligibility to default
    Engine.context.PerpsController.state.isEligible = true;
  });

  describe('Basic functionality', () => {
    it('should return zero balance when no perps balances exist', () => {
      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return {};
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return empty account data
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current).toEqual({
        perpsBalance: 0,
        perpsBalance1dAgo: 0,
        unrealizedPnl: 0,
        hasPerpsData: false,
        perpsBalances: {},
      });
    });

    it('should return balance data when perps balances exist', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.50',
          unrealizedPnl: '50.25',
          accountValue1dAgo: '950.00',
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return account data that matches the expected calculations
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '1000.00',
          unrealizedPnl: '25.50',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current).toEqual({
        perpsBalance: 1000,
        perpsBalance1dAgo: 950,
        unrealizedPnl: 25.5,
        hasPerpsData: true,
        perpsBalances: mockBalances,
      });
    });
  });

  describe('Balance aggregation', () => {
    it('should aggregate balances from multiple providers', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.50',
          unrealizedPnl: '-50.25',
          accountValue1dAgo: '950.00',
          lastUpdated: Date.now(),
        },
        dydx: {
          totalValue: '500.25',
          unrealizedPnl: '25.10',
          accountValue1dAgo: '480.00',
          lastUpdated: Date.now(),
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (selector === (selectConversionRateBySymbol as unknown)) return 1;
        return undefined;
      });

      // Mock the live account data to match expected aggregated values
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '1500.75', // 1000.50 + 500.25
          unrealizedPnl: '-25.15', // -50.25 + 25.10
          // other fields don't matter for this test
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBeCloseTo(1500.75, 2);
      expect(result.current.perpsBalance1dAgo).toBeCloseTo(1430, 2);
      expect(result.current.unrealizedPnl).toBeCloseTo(-25.15, 2);
      expect(result.current.hasPerpsData).toBe(true);
    });

    it('should handle single provider balance', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '2500.00',
          unrealizedPnl: '100.00',
          accountValue1dAgo: '2400.00',
          lastUpdated: Date.now(),
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (selector === (selectConversionRateBySymbol as unknown)) return 1;
        return undefined;
      });

      // Mock the live account data to match expected single provider values
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '2500.00',
          unrealizedPnl: '100.00',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(2500);
      expect(result.current.perpsBalance1dAgo).toBe(2400);
      expect(result.current.unrealizedPnl).toBe(100);
      expect(result.current.hasPerpsData).toBe(true);
    });
  });

  describe('Currency conversion', () => {
    it('should convert USD values to display currency', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          unrealizedPnl: '50.00',
          accountValue1dAgo: '900.00',
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 0.85); // EUR conversion rate
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the live account data for currency conversion test
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '1000.00',
          unrealizedPnl: '50.00',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBeCloseTo(850, 2);
      expect(result.current.perpsBalance1dAgo).toBeCloseTo(765, 2);
      expect(result.current.unrealizedPnl).toBeCloseTo(42.5, 2);
    });

    it('should handle missing conversion rate (defaults to 1)', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          unrealizedPnl: '50.00',
          accountValue1dAgo: '900.00',
          lastUpdated: Date.now(),
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (selector === (selectConversionRateBySymbol as unknown))
          return undefined;
        return undefined;
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      // Should use fallback rate of 1
      expect(result.current.perpsBalance).toBe(1000);
      expect(result.current.perpsBalance1dAgo).toBe(900);
      expect(result.current.unrealizedPnl).toBe(50);
    });
  });

  describe('Stream integration', () => {
    it('should handle null account from stream provider', async () => {
      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return {};
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return null account
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: null,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(0);
      expect(result.current.hasPerpsData).toBe(false);
    });

    it('should use live account data when available', async () => {
      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return {};
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return account data
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '500.00',
          unrealizedPnl: '25.00',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(500);
      expect(result.current.unrealizedPnl).toBe(25);
      expect(result.current.hasPerpsData).toBe(true);
    });

    it('should handle loading state from stream provider', async () => {
      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return {};
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider in loading state
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: null,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(0);
      expect(result.current.hasPerpsData).toBe(false);
    });

    it('should handle stream errors gracefully', async () => {
      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return {};
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider with error state
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: null,
        isLoading: false,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      // Should still return default values even if stream has errors
      expect(result.current).toEqual({
        perpsBalance: 0,
        perpsBalance1dAgo: 0,
        unrealizedPnl: 0,
        hasPerpsData: false,
        perpsBalances: {},
      });
    });

    it('should maintain consistent values across re-renders', async () => {
      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return {};
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock consistent account data
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '100.00',
          unrealizedPnl: '10.00',
        },
        isLoading: false,
        error: null,
      });

      const { result, rerender } = renderHook(
        () => usePerpsPortfolioBalance(),
        { wrapper: createTestWrapperWithStreamProvider() },
      );

      const initialResult = { ...result.current };

      // Re-render the hook
      rerender({});

      // Values should remain consistent
      expect(result.current).toEqual(initialResult);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid numeric values in balances', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: 'invalid',
          unrealizedPnl: 'NaN',
          accountValue1dAgo: undefined as unknown as string,
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock invalid account data from stream to test invalid number handling
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: 'invalid',
          unrealizedPnl: 'NaN',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      // BigNumber handles invalid values by creating NaN, which .toNumber() converts to NaN for 'invalid'
      // and undefined values are handled with || '0' fallback
      expect(result.current.perpsBalance).toBeNaN();
      expect(result.current.perpsBalance1dAgo).toBe(0); // undefined falls back to '0'
      expect(result.current.unrealizedPnl).toBeNaN();
    });

    it('should handle negative balances', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '-100.50',
          unrealizedPnl: '-200.25',
          accountValue1dAgo: '50.00',
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return negative balance data
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '-100.50',
          unrealizedPnl: '-200.25',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(-100.5);
      expect(result.current.perpsBalance1dAgo).toBe(50);
      expect(result.current.unrealizedPnl).toBe(-200.25);
    });

    it('should handle very large numbers', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '999999999.99',
          unrealizedPnl: '123456789.12',
          accountValue1dAgo: '888888888.88',
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return large number data
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '999999999.99',
          unrealizedPnl: '123456789.12',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(999999999.99);
      expect(result.current.perpsBalance1dAgo).toBe(888888888.88);
      expect(result.current.unrealizedPnl).toBe(123456789.12);
    });

    it('should handle missing fields in balance objects', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          // Missing unrealizedPnl and accountValue1dAgo
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock stream data with missing fields to test fallbacks
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '1000.00',
          // Missing unrealizedPnl field
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      expect(result.current.perpsBalance).toBe(1000);
      expect(result.current.perpsBalance1dAgo).toBe(0);
      expect(result.current.unrealizedPnl).toBe(0);
    });

    it('should handle null provider balance objects', () => {
      const mockBalances = {
        hyperliquid: null as unknown as {
          totalValue: string;
          unrealizedPnl: string;
          accountValue1dAgo: string;
          lastUpdated: number;
        },
        dydx: {
          totalValue: '500.00',
          unrealizedPnl: '25.00',
          accountValue1dAgo: '450.00',
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock stream data that corresponds to the expected values
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '500.00',
          unrealizedPnl: '25.00',
        },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance(), {
        wrapper: createTestWrapperWithStreamProvider(),
      });

      // Should only count the valid provider
      expect(result.current.perpsBalance).toBe(500);
      expect(result.current.perpsBalance1dAgo).toBe(450);
      expect(result.current.unrealizedPnl).toBe(25);
    });
  });

  describe('Memoization', () => {
    it('should not recalculate when dependencies have not changed', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          unrealizedPnl: '50.00',
          accountValue1dAgo: '900.00',
          lastUpdated: Date.now(),
        },
      };

      let selectorCallCount = 0;
      mockUseSelector.mockImplementation((selector) => {
        selectorCallCount++;
        if (selector === selectPerpsBalances) return mockBalances;
        if (selector === (selectConversionRateBySymbol as unknown)) return 1;
        return undefined;
      });

      const { result, rerender } = renderHook(
        () => usePerpsPortfolioBalance(),
        { wrapper: createTestWrapperWithStreamProvider() },
      );

      const initialBalance = result.current.perpsBalance;
      const initialPnl = result.current.unrealizedPnl;
      const initialBalance1dAgo = result.current.perpsBalance1dAgo;
      const initialCallCount = selectorCallCount;

      // Re-render without changing any dependencies
      rerender({});

      // Values should remain the same (memoized calculation)
      expect(result.current.perpsBalance).toBe(initialBalance);
      expect(result.current.unrealizedPnl).toBe(initialPnl);
      expect(result.current.perpsBalance1dAgo).toBe(initialBalance1dAgo);

      // Selectors are called again on re-render
      expect(selectorCallCount).toBeGreaterThan(initialCallCount);
    });

    it('should recalculate when perps balances change', () => {
      let mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          unrealizedPnl: '50.00',
          accountValue1dAgo: '900.00',
          lastUpdated: Date.now(),
        },
      };

      const mockSelectConversionRateBySymbol = jest.fn(() => 1);
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        mockSelectConversionRateBySymbol,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return mockSelectConversionRateBySymbol();
        }
        return undefined;
      });

      // Mock the stream provider to return initial balance data
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '1000.00',
          unrealizedPnl: '50.00',
        },
        isLoading: false,
        error: null,
      });

      const { result, rerender } = renderHook(
        () => usePerpsPortfolioBalance(),
        { wrapper: createTestWrapperWithStreamProvider() },
      );

      const initialBalance = result.current.perpsBalance;

      // Update the balances
      mockBalances = {
        hyperliquid: {
          totalValue: '2000.00',
          unrealizedPnl: '100.00',
          accountValue1dAgo: '1800.00',
          lastUpdated: Date.now(),
        },
      };

      // Update the stream provider to match the new balances
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '2000.00',
          unrealizedPnl: '100.00',
        },
        isLoading: false,
        error: null,
      });

      rerender({});

      // Balance should be updated
      expect(result.current.perpsBalance).toBe(2000);
      expect(result.current.perpsBalance).not.toBe(initialBalance);
    });

    it('should recalculate when conversion rate changes', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          unrealizedPnl: '50.00',
          accountValue1dAgo: '900.00',
          lastUpdated: Date.now(),
        },
      };

      let conversionRate = 1;
      (selectConversionRateBySymbol as unknown as jest.Mock).mockImplementation(
        () => conversionRate,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return conversionRate;
        }
        return undefined;
      });

      // Mock stream data that corresponds to the expected values
      streamMocks.usePerpsLiveAccount.mockReturnValue({
        account: {
          totalBalance: '1000.00',
          unrealizedPnl: '50.00',
        },
        isLoading: false,
        error: null,
      });

      const { result, rerender } = renderHook(
        () => usePerpsPortfolioBalance(),
        { wrapper: createTestWrapperWithStreamProvider() },
      );

      expect(result.current.perpsBalance).toBe(1000);

      // Update the conversion rate
      conversionRate = 0.85;
      rerender({});

      // Balance should be converted
      expect(result.current.perpsBalance).toBeCloseTo(850, 2);
    });
  });
});
