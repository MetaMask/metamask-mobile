import { renderHook } from '@testing-library/react-native';
import { usePerpsPortfolioBalance } from './usePerpsPortfolioBalance';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsBalances } from '../selectors/perpsController';
import { AccountState } from '../controllers/types';
import { usePerpsLiveAccount } from './stream';

// Type for mock balances
interface MockBalance {
  totalValue: string;
  unrealizedPnl: string;
  accountValue1dAgo: string;
  lastUpdated: number;
}

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

// Mock usePerpsLiveAccount to avoid PerpsStreamProvider requirement
jest.mock('./stream', () => ({
  usePerpsLiveAccount: jest.fn(),
}));

describe('usePerpsPortfolioBalance', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
    typeof usePerpsLiveAccount
  >;

  // Helper function to set up mocks for tests
  const setupMocks = (
    balances: Record<string, MockBalance> = {},
    accountData: AccountState | null = null,
    conversionRate: number = 1,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsBalances) return balances;
      if (typeof selector === 'function') {
        return conversionRate;
      }
      return undefined;
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      account: accountData,
      isInitialLoading: false,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset eligibility to default
    Engine.context.PerpsController.state.isEligible = true;

    // Set up default mock for usePerpsLiveAccount with zero balances
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

    // Set up default mock for useSelector to return empty balances
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsBalances) return {};
      if (typeof selector === 'function') {
        // Default conversion rate
        return 1;
      }
      return undefined;
    });
  });

  describe('Basic functionality', () => {
    it('should return zero balance when no perps balances exist', () => {
      setupMocks({}, null); // No balances, no account data

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

      const accountData = {
        availableBalance: '1000.50',
        totalBalance: '1000.50',
        marginUsed: '0',
        unrealizedPnl: '50.25',
        returnOnEquity: '0',
        totalValue: '1000.50',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '1500.75',
        totalBalance: '1500.75',
        marginUsed: '0',
        unrealizedPnl: '-25.15',
        returnOnEquity: '0',
        totalValue: '1500.75',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '2500.00',
        totalBalance: '2500.00',
        marginUsed: '0',
        unrealizedPnl: '100.00',
        returnOnEquity: '0',
        totalValue: '2500.00',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '50.00',
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      setupMocks(mockBalances, accountData, 0.85); // EUR conversion rate

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

      const accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '50.00',
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      // Mock useSelector to return undefined for conversion rate (should default to 1)
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsBalances) return mockBalances;
        if (typeof selector === 'function') {
          return undefined; // Missing conversion rate
        }
        return undefined;
      });

      mockUsePerpsLiveAccount.mockReturnValue({
        account: accountData,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      // Should use fallback rate of 1
      expect(result.current.perpsBalance).toBe(1000);
      expect(result.current.perpsBalance1dAgo).toBe(900);
      expect(result.current.unrealizedPnl).toBe(50);
    });
  });

  describe('Hook behavior', () => {
    it('should return default values when no data is available', () => {
      setupMocks({}, null); // No balances, no account data

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      expect(result.current).toEqual({
        perpsBalance: 0,
        perpsBalance1dAgo: 0,
        unrealizedPnl: 0,
        perpsBalances: {},
        hasPerpsData: false,
      });
    });

    it('should return zero values when not eligible', () => {
      // Mock not eligible state
      Engine.context.PerpsController.state.isEligible = false;

      setupMocks({}, null); // No balances, no account data

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      expect(result.current).toEqual({
        perpsBalance: 0,
        perpsBalance1dAgo: 0,
        unrealizedPnl: 0,
        perpsBalances: {},
        hasPerpsData: false,
      });
    });

    it('should handle errors gracefully', () => {
      // Mock error scenario by returning null account data
      setupMocks({}, null);

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      // Should still return default values even if there are errors
      expect(result.current).toEqual({
        perpsBalance: 0,
        perpsBalance1dAgo: 0,
        unrealizedPnl: 0,
        perpsBalances: {},
        hasPerpsData: false,
      });
    });

    it('should be stable across re-renders', () => {
      const mockBalances = {
        hyperliquid: {
          totalValue: '1000.00',
          unrealizedPnl: '50.00',
          accountValue1dAgo: '900.00',
          lastUpdated: Date.now(),
        },
      };

      const accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '50.00',
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      setupMocks(mockBalances, accountData);

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

      const initialBalance = result.current.perpsBalance;

      // Re-render the hook
      rerender({});

      // Values should remain stable
      expect(result.current.perpsBalance).toBe(initialBalance);
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

      const accountData = {
        availableBalance: 'invalid',
        totalBalance: 'invalid',
        marginUsed: '0',
        unrealizedPnl: 'NaN',
        returnOnEquity: '0',
        totalValue: 'invalid',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '-100.50',
        totalBalance: '-100.50',
        marginUsed: '0',
        unrealizedPnl: '-200.25',
        returnOnEquity: '0',
        totalValue: '-100.50',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '999999999.99',
        totalBalance: '999999999.99',
        marginUsed: '0',
        unrealizedPnl: '123456789.12',
        returnOnEquity: '0',
        totalValue: '999999999.99',
      };

      setupMocks(mockBalances, accountData);

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
        } as Partial<MockBalance>,
      };

      const accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '0', // Missing field defaults to 0
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      setupMocks(mockBalances as Record<string, MockBalance>, accountData);

      const { result } = renderHook(() => usePerpsPortfolioBalance());

      expect(result.current.perpsBalance).toBe(1000);
      expect(result.current.perpsBalance1dAgo).toBe(0);
      expect(result.current.unrealizedPnl).toBe(0);
    });

    it('should handle null provider balance objects', () => {
      const mockBalances = {
        hyperliquid: null as unknown as MockBalance,
        dydx: {
          totalValue: '500.00',
          unrealizedPnl: '25.00',
          accountValue1dAgo: '450.00',
          lastUpdated: Date.now(),
        },
      };

      const accountData = {
        availableBalance: '500.00',
        totalBalance: '500.00',
        marginUsed: '0',
        unrealizedPnl: '25.00',
        returnOnEquity: '0',
        totalValue: '500.00',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '50.00',
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      setupMocks(mockBalances, accountData);

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

      const initialBalance = result.current.perpsBalance;
      const initialPnl = result.current.unrealizedPnl;
      const initialBalance1dAgo = result.current.perpsBalance1dAgo;

      // Re-render without changing any dependencies
      rerender({});

      // Values should remain the same (memoized calculation)
      expect(result.current.perpsBalance).toBe(initialBalance);
      expect(result.current.unrealizedPnl).toBe(initialPnl);
      expect(result.current.perpsBalance1dAgo).toBe(initialBalance1dAgo);
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

      let accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '50.00',
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      setupMocks(mockBalances, accountData);

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

      const initialBalance = result.current.perpsBalance;

      // Update the balances and account data
      mockBalances = {
        hyperliquid: {
          totalValue: '2000.00',
          unrealizedPnl: '100.00',
          accountValue1dAgo: '1800.00',
          lastUpdated: Date.now(),
        },
      };

      accountData = {
        availableBalance: '2000.00',
        totalBalance: '2000.00',
        marginUsed: '0',
        unrealizedPnl: '100.00',
        returnOnEquity: '0',
        totalValue: '2000.00',
      };

      setupMocks(mockBalances, accountData);

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

      const accountData = {
        availableBalance: '1000.00',
        totalBalance: '1000.00',
        marginUsed: '0',
        unrealizedPnl: '50.00',
        returnOnEquity: '0',
        totalValue: '1000.00',
      };

      setupMocks(mockBalances, accountData, 1);

      const { result, rerender } = renderHook(() => usePerpsPortfolioBalance());

      expect(result.current.perpsBalance).toBe(1000);

      // Update the conversion rate
      setupMocks(mockBalances, accountData, 0.85);
      rerender({});

      // Balance should be converted
      expect(result.current.perpsBalance).toBeCloseTo(850, 2);
    });
  });
});
