import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsPortfolioBalance } from './usePerpsPortfolioBalance';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsBalances } from '../selectors/perpsController';
import { selectConversionRateBySymbol } from '../../../../selectors/currencyRateController';
import { AccountState } from '../controllers/types';

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

describe('usePerpsPortfolioBalance', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockGetAccountState = Engine.context.PerpsController
    .getAccountState as jest.MockedFunction<
    typeof Engine.context.PerpsController.getAccountState
  >;

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      expect(result.current).toEqual({
        perpsBalance: 1000.5,
        perpsBalance1dAgo: 950,
        unrealizedPnl: 50.25,
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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      // Should use fallback rate of 1
      expect(result.current.perpsBalance).toBe(1000);
      expect(result.current.perpsBalance1dAgo).toBe(900);
      expect(result.current.unrealizedPnl).toBe(50);
    });
  });

  describe('Fetch on mount behavior', () => {
    it('should fetch account state when fetchOnMount is true and eligible', async () => {
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

      mockGetAccountState.mockResolvedValue({} as AccountState);

      renderHook(() => usePerpsPortfolioBalance({ fetchOnMount: true }));

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalledTimes(1);
      });
    });

    it('should not fetch when fetchOnMount is false', async () => {
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

      renderHook(() => usePerpsPortfolioBalance({ fetchOnMount: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });

    it('should not fetch when not eligible', async () => {
      Engine.context.PerpsController.state.isEligible = false;

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

      renderHook(() => usePerpsPortfolioBalance({ fetchOnMount: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
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

      mockGetAccountState.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePerpsPortfolioBalance({ fetchOnMount: true }),
      );

      await waitFor(() => {
        // Should still return default values even if fetch fails
        expect(result.current).toEqual({
          perpsBalance: 0,
          perpsBalance1dAgo: 0,
          unrealizedPnl: 0,
          hasPerpsData: false,
          perpsBalances: {},
        });
      });
    });

    it('should only fetch once even if component re-renders', async () => {
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

      mockGetAccountState.mockResolvedValue({} as AccountState);

      const { rerender } = renderHook(() =>
        usePerpsPortfolioBalance({ fetchOnMount: true }),
      );

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalledTimes(1);
      });

      // Re-render the hook
      rerender({});

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should still only have been called once
      expect(mockGetAccountState).toHaveBeenCalledTimes(1);
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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

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

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

      expect(result.current.perpsBalance).toBe(1000);

      // Update the conversion rate
      conversionRate = 0.85;
      rerender({});

      // Balance should be converted
      expect(result.current.perpsBalance).toBeCloseTo(850, 2);
    });
  });
});
