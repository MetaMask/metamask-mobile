import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import type { AccountState } from '../../controllers/types';
import { usePerpsLiveAccount } from './usePerpsLiveAccount';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock PerpsStreamManager
const mockSubscribe = jest.fn();
jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    account: {
      subscribe: mockSubscribe,
    },
  })),
}));

describe('usePerpsLiveAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default state', () => {
    it('should return null account when PerpsController is undefined', () => {
      // Mock the subscription to not call the callback (simulating no data)
      mockSubscribe.mockImplementation(() => jest.fn());

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current).toEqual({
        account: null,
        isInitialLoading: true,
      });
    });

    it('should return null account when accountState is undefined', () => {
      // Mock the subscription to not call the callback (simulating no data)
      mockSubscribe.mockImplementation(() => jest.fn());

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current).toEqual({
        account: null,
        isInitialLoading: true,
      });
    });
  });

  describe('state from PerpsController', () => {
    it('should return account state from PerpsController', () => {
      const mockAccountState: AccountState = {
        availableBalance: '3000',
        totalBalance: '5000',
        marginUsed: '1000',
        unrealizedPnl: '50',
        returnOnEquity: '5.0',
        totalValue: '5050',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(mockAccountState);
        return jest.fn();
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current).toEqual({
        account: mockAccountState,
        isInitialLoading: false,
      });
    });

    it('should handle zero balance account state', () => {
      const mockAccountState: AccountState = {
        availableBalance: '0',
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalValue: '0',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        // Simulate immediate callback with account data
        callback(mockAccountState);
        return jest.fn(); // Return unsubscribe function
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current).toEqual({
        account: mockAccountState,
        isInitialLoading: false,
      });
      expect(result.current?.account?.availableBalance).toBe('0');
      expect(result.current?.account?.totalBalance).toBe('0');
    });
  });

  describe('partial state handling', () => {
    it('should handle partial account state', () => {
      const partialAccountState: AccountState = {
        availableBalance: '100',
        totalBalance: '200',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalValue: '200',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(partialAccountState);
        return jest.fn();
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current?.account?.availableBalance).toBe('100');
      expect(result.current?.account?.totalBalance).toBe('200');
    });

    it('should handle empty PerpsController state', () => {
      // Mock the subscription to not call the callback (simulating no data)
      mockSubscribe.mockImplementation(() => jest.fn());

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current).toEqual({
        account: null,
        isInitialLoading: true,
      });
    });
  });

  describe('account state scenarios', () => {
    it('should handle account with positive PnL', () => {
      const positivePnlState: AccountState = {
        availableBalance: '5000',
        totalBalance: '6000',
        marginUsed: '1000',
        unrealizedPnl: '500',
        returnOnEquity: '50.0',
        totalValue: '6500',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(positivePnlState);
        return jest.fn();
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current?.account?.unrealizedPnl).toBe('500');
      expect(Number(result.current?.account?.unrealizedPnl)).toBeGreaterThan(0);
    });

    it('should handle account with negative PnL', () => {
      const negativePnlState: AccountState = {
        availableBalance: '3000',
        totalBalance: '4500',
        marginUsed: '2000',
        unrealizedPnl: '-500',
        returnOnEquity: '-25.0',
        totalValue: '4000',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(negativePnlState);
        return jest.fn();
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current?.account?.unrealizedPnl).toBe('-500');
      expect(Number(result.current?.account?.unrealizedPnl)).toBeLessThan(0);
    });

    it('should handle account with high margin usage', () => {
      const highMarginState: AccountState = {
        availableBalance: '500',
        totalBalance: '10000',
        marginUsed: '9500',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalValue: '10000',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(highMarginState);
        return jest.fn();
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current?.account?.marginUsed).toBe('9500');
      expect(Number(result.current?.account?.marginUsed)).toBe(9500);
      expect(Number(result.current?.account?.availableBalance)).toBe(500);
    });

    it('should handle account with no margin used', () => {
      const noMarginState: AccountState = {
        availableBalance: '10000',
        totalBalance: '10000',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalValue: '10000',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(noMarginState);
        return jest.fn();
      });

      const { result } = renderHookWithProvider(() => usePerpsLiveAccount(), {
        state: {},
      });

      expect(result.current?.account?.marginUsed).toBe('0');
      expect(result.current?.account?.availableBalance).toBe(
        result.current?.account?.totalBalance,
      );
    });
  });

  describe('memoization', () => {
    it('should return same reference for same state', () => {
      const mockAccountState: AccountState = {
        availableBalance: '1000',
        totalBalance: '1000',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalValue: '1000',
      };

      // Mock the subscription to immediately call the callback with the account data
      mockSubscribe.mockImplementation(({ callback }) => {
        callback(mockAccountState);
        return jest.fn();
      });

      const { result: result1 } = renderHookWithProvider(
        () => usePerpsLiveAccount(),
        { state: {} },
      );

      const { result: result2 } = renderHookWithProvider(
        () => usePerpsLiveAccount(),
        { state: {} },
      );

      expect(result1.current).toStrictEqual(result2.current);
    });
  });
});
