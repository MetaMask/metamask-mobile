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

const fixtureOpenPositions = {
  positions: [
    {
      tokenSymbol: 'ETH',
      tokenName: 'Ethereum',
      tokenAddress: '0x1',
      chain: 'ethereum',
      positionAmount: 5,
      boughtUsd: 10000,
      soldUsd: 0,
      realizedPnl: 0,
      costBasis: 10000,
      trades: [],
      lastTradeAt: Date.now(),
      currentValueUSD: 15000,
      pnlValueUsd: 5000,
      pnlPercent: 50,
    },
  ],
};

const fixtureClosedPositions = {
  positions: [
    {
      tokenSymbol: 'USDC',
      tokenName: 'USD Coin',
      tokenAddress: '0x2',
      chain: 'base',
      positionAmount: 1000,
      boughtUsd: 1000,
      soldUsd: 1100,
      realizedPnl: 100,
      costBasis: 1000,
      trades: [],
      lastTradeAt: Date.now(),
      currentValueUSD: 0,
      pnlValueUsd: 100,
      pnlPercent: 10,
    },
  ],
};

describe('useTraderPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
  });

  describe('query configuration', () => {
    it('passes the correct queryKeys for open and closed positions', () => {
      renderHook(() => useTraderPositions('trader-1'));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchOpenPositions',
            { addressOrId: 'trader-1' },
          ],
        }),
      );
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchClosedPositions',
            { addressOrId: 'trader-1' },
          ],
        }),
      );
    });

    it('enables both queries when addressOrId is non-empty', () => {
      renderHook(() => useTraderPositions('trader-1'));

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(expect.objectContaining({ enabled: true }));
      expect(calls[1][0]).toEqual(expect.objectContaining({ enabled: true }));
    });

    it('disables both queries when addressOrId is empty', () => {
      renderHook(() => useTraderPositions(''));

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(expect.objectContaining({ enabled: false }));
      expect(calls[1][0]).toEqual(expect.objectContaining({ enabled: false }));
    });

    it('forwards refetchInterval only to the open positions query', () => {
      renderHook(() =>
        useTraderPositions('trader-1', { refetchInterval: 30_000 }),
      );

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(
        expect.objectContaining({ refetchInterval: 30_000 }),
      );
      expect(calls[1][0]).not.toEqual(
        expect.objectContaining({ refetchInterval: expect.anything() }),
      );
    });

    it('does not set refetchInterval on either query when option is omitted', () => {
      renderHook(() => useTraderPositions('trader-1'));

      const calls = mockUseQuery.mock.calls;
      expect(calls[0][0]).toEqual(
        expect.objectContaining({ refetchInterval: undefined }),
      );
      expect(calls[1][0]).not.toEqual(
        expect.objectContaining({ refetchInterval: expect.anything() }),
      );
    });
  });

  describe('position data', () => {
    it('returns empty arrays when data is undefined', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });

    it('returns open positions from first query', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ data: fixtureOpenPositions as never }),
        )
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.openPositions).toEqual(
        fixtureOpenPositions.positions,
      );
    });

    it('returns closed positions from second query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(
          makeQueryResult({ data: fixtureClosedPositions as never }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.closedPositions).toEqual(
        fixtureClosedPositions.positions,
      );
    });

    it('returns both open and closed positions', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ data: fixtureOpenPositions as never }),
        )
        .mockReturnValueOnce(
          makeQueryResult({ data: fixtureClosedPositions as never }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.openPositions).toHaveLength(1);
      expect(result.current.closedPositions).toHaveLength(1);
    });
  });

  describe('loading states', () => {
    it('exposes isLoadingOpen from first query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ isLoading: true }))
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(true);
      expect(result.current.isLoadingClosed).toBe(false);
    });

    it('exposes isLoadingClosed from second query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(makeQueryResult({ isLoading: true }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(false);
      expect(result.current.isLoadingClosed).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns error from open query', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('open error') }),
        )
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('open error');
    });

    it('returns error from closed query when open has none', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('closed error') }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('closed error');
    });

    it('prefers open error when both queries fail', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('open error') }),
        )
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('closed error') }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('open error');
    });

    it('returns null when both queries succeed', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBeNull();
    });

    it('converts non-Error to string', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error: 'raw string' as never }))
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.error).toBe('raw string');
    });

    it('logs combined error via Logger.error', () => {
      const err = new Error('fetch failed');
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error: err }))
        .mockReturnValueOnce(makeQueryResult());

      renderHook(() => useTraderPositions('trader-1'));
      expect(Logger.error).toHaveBeenCalledWith(
        err,
        'useTraderPositions: positions fetch failed',
      );
    });

    it('does not log when there is no error', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });
});
