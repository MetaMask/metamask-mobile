import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import type { AccountState } from '../controllers/types';
import { usePerpsAccount } from './usePerpsAccount';

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('usePerpsAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default state', () => {
    it('should return null when PerpsController is undefined', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: undefined,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current).toBeNull();
    });

    it('should return null when accountState is undefined', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: undefined,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current).toBeNull();
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: mockAccountState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current).toEqual(mockAccountState);
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: mockAccountState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current).toEqual(mockAccountState);
      expect(result.current?.availableBalance).toBe('0');
      expect(result.current?.totalBalance).toBe('0');
    });
  });

  describe('partial state handling', () => {
    it('should handle partial account state', () => {
      const partialAccountState: Partial<AccountState> = {
        availableBalance: '100',
        totalBalance: '200',
        // Missing marginUsed and unrealizedPnl
      };

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: partialAccountState as AccountState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current?.availableBalance).toBe('100');
      expect(result.current?.totalBalance).toBe('200');
    });

    it('should handle empty PerpsController state', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {},
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current).toBeNull();
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: positivePnlState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current?.unrealizedPnl).toBe('500');
      expect(Number(result.current?.unrealizedPnl)).toBeGreaterThan(0);
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: negativePnlState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current?.unrealizedPnl).toBe('-500');
      expect(Number(result.current?.unrealizedPnl)).toBeLessThan(0);
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: highMarginState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current?.marginUsed).toBe('9500');
      expect(Number(result.current?.marginUsed)).toBe(9500);
      expect(Number(result.current?.availableBalance)).toBe(500);
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: noMarginState,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsAccount(), {
        state,
      });

      expect(result.current?.marginUsed).toBe('0');
      expect(result.current?.availableBalance).toBe(
        result.current?.totalBalance,
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

      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              accountState: mockAccountState,
            },
          },
        },
      };

      const { result: result1 } = renderHookWithProvider(
        () => usePerpsAccount(),
        { state },
      );

      const { result: result2 } = renderHookWithProvider(
        () => usePerpsAccount(),
        { state },
      );

      expect(result1.current).toBe(result2.current);
    });
  });
});
