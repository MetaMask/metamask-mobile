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
];

const mockClosedPositions = [
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
];

describe('useTraderPositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
  });

  describe('query configuration', () => {
    it('passes the correct queryKeys for open and closed positions', () => {
      renderHook(() => useTraderPositions('trader-1'));

      expect(mockUseQuery).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchOpenPositions',
            { addressOrId: 'trader-1' },
          ],
        }),
      );
      expect(mockUseQuery).toHaveBeenNthCalledWith(
        2,
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

      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ enabled: true }),
      );
      expect(mockUseQuery.mock.calls[1][0]).toEqual(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('disables both queries when addressOrId is empty', () => {
      renderHook(() => useTraderPositions(''));

      expect(mockUseQuery.mock.calls[0][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
      expect(mockUseQuery.mock.calls[1][0]).toEqual(
        expect.objectContaining({ enabled: false }),
      );
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
    it('returns empty arrays when both queries return undefined data', () => {
      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });

    it('returns open positions from the open query', () => {
      mockUseQuery
        .mockReturnValueOnce(
          makeQueryResult({ data: { positions: mockOpenPositions } as never }),
        )
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.openPositions).toEqual(mockOpenPositions);
    });

    it('returns closed positions from the closed query', () => {
      mockUseQuery.mockReturnValueOnce(makeQueryResult()).mockReturnValueOnce(
        makeQueryResult({
          data: { positions: mockClosedPositions } as never,
        }),
      );

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.closedPositions).toEqual(mockClosedPositions);
    });

    it('falls back to empty arrays when positions is missing', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ data: {} as never }))
        .mockReturnValueOnce(makeQueryResult({ data: {} as never }));

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.openPositions).toEqual([]);
      expect(result.current.closedPositions).toEqual([]);
    });
  });

  describe('loading states', () => {
    it('exposes isLoadingOpen from the open query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ isLoading: true }))
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));
      expect(result.current.isLoadingOpen).toBe(true);
      expect(result.current.isLoadingClosed).toBe(false);
    });

    it('exposes isLoadingClosed from the closed query', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(makeQueryResult({ isLoading: true }));

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

    it('returns the open query error before the closed query error', () => {
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

    it('returns the closed query error when the open query succeeds', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult())
        .mockReturnValueOnce(
          makeQueryResult({ error: new Error('closed error') }),
        );

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.error).toBe('closed error');
    });

    it('converts non-Error values to strings', () => {
      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error: 'raw error' as never }))
        .mockReturnValueOnce(makeQueryResult());

      const { result } = renderHook(() => useTraderPositions('trader-1'));

      expect(result.current.error).toBe('raw error');
    });

    it('logs the combined error', () => {
      const error = new Error('fetch failed');

      mockUseQuery
        .mockReturnValueOnce(makeQueryResult({ error }))
        .mockReturnValueOnce(makeQueryResult());

      renderHook(() => useTraderPositions('trader-1'));

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'useTraderPositions: positions fetch failed',
      );
    });

    it('does not log when there is no error', () => {
      renderHook(() => useTraderPositions('trader-1'));
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });
});
