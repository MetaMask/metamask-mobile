import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import Logger from '../../../../../util/Logger';
import { useTraderPositions } from './useTraderPositions';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/react-data-query');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useQuery>;

const mockOpenPositions = [
  {
    tokenSymbol: 'STARKBOT',
    tokenName: 'Starkbot',
    tokenAddress: '0x123',
    chain: 'base',
    positionAmount: 1500000000,
    boughtUsd: 1200,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 1200,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: 2259.96,
    pnlValueUsd: 1059.96,
    pnlPercent: 182,
  },
];

const mockClosedPositions = [
  {
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    tokenAddress: '0x456',
    chain: 'ethereum',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 600,
    realizedPnl: 100,
    costBasis: 500,
    trades: [],
    lastTradeAt: Date.now(),
    currentValueUSD: null,
    pnlValueUsd: 100,
    pnlPercent: 20,
  },
];

describe('useTraderPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
  });

  describe('positions data', () => {
    it('returns empty arrays when both queries return undefined data', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });

    it('returns open positions from openData.positions', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchOpenPositions') {
          return makeQueryResult({
            data: { positions: mockOpenPositions } as never,
          });
        }
        return makeQueryResult();
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.openPositions).toEqual(mockOpenPositions);
    });

    it('returns closed positions from closedData.positions', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchClosedPositions') {
          return makeQueryResult({
            data: { positions: mockClosedPositions } as never,
          });
        }
        return makeQueryResult();
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.closedPositions).toEqual(mockClosedPositions);
    });

    it('defaults to empty array when positions is missing on the response', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: {} as never }));
      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });
  });

  describe('loading states', () => {
    it('exposes isLoadingOpen from the open query', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchOpenPositions') {
          return makeQueryResult({ isLoading: true });
        }
        return makeQueryResult({ isLoading: false });
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(true);
      expect(result.current.isLoadingClosed).toBe(false);
    });

    it('exposes isLoadingClosed from the closed query', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchClosedPositions') {
          return makeQueryResult({ isLoading: true });
        }
        return makeQueryResult({ isLoading: false });
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(false);
      expect(result.current.isLoadingClosed).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns null when there are no errors', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBeNull();
    });

    it('surfaces the open query error as an error string', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchOpenPositions') {
          return makeQueryResult({ error: new Error('Open error') });
        }
        return makeQueryResult();
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('Open error');
    });

    it('surfaces the closed query error when the open query has no error', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchClosedPositions') {
          return makeQueryResult({ error: new Error('Closed error') });
        }
        return makeQueryResult();
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('Closed error');
    });

    it('converts a non-Error error value to string', () => {
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchOpenPositions') {
          return makeQueryResult({ error: 'raw error' as never });
        }
        return makeQueryResult();
      });

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('raw error');
    });

    it('logs the combined error via Logger.error', () => {
      const err = new Error('Network error');
      mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
        if (options.queryKey[0] === 'SocialService:fetchOpenPositions') {
          return makeQueryResult({ error: err });
        }
        return makeQueryResult();
      });

      renderHook(() => useTraderPositions('trader-1'));
      expect(Logger.error).toHaveBeenCalledWith(
        err,
        'useTraderPositions: positions fetch failed',
      );
    });
  });

  describe('query options', () => {
    it('calls useQuery with the open positions queryKey', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchOpenPositions',
            { addressOrId: 'trader-1' },
          ],
        }),
      );
    });

    it('calls useQuery with the closed positions queryKey', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchClosedPositions',
            { addressOrId: 'trader-1' },
          ],
        }),
      );
    });

    it('sets enabled: false for both queries when addressOrId is empty', () => {
      renderHook(() => useTraderPositions(''));
      expect(mockUseQuery).toHaveBeenCalledTimes(2);
      mockUseQuery.mock.calls.forEach((call) => {
        expect(call[0]).toMatchObject({ enabled: false });
      });
    });

    it('sets enabled: true for both queries when addressOrId is provided', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(mockUseQuery).toHaveBeenCalledTimes(2);
      mockUseQuery.mock.calls.forEach((call) => {
        expect(call[0]).toMatchObject({ enabled: true });
      });
    });
  });
});
