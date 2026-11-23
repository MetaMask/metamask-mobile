import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import {
  fetchHyperliquidHistoricalPrices,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import { usePerpsTraderPositionPrices } from './usePerpsTraderPositionPrices';

jest.mock('../utils/hyperliquidPrices', () => ({
  ...jest.requireActual('../utils/hyperliquidPrices'),
  fetchHyperliquidHistoricalPrices: jest.fn().mockResolvedValue([]),
}));

const mockFetchHyperliquid =
  fetchHyperliquidHistoricalPrices as jest.MockedFunction<
    typeof fetchHyperliquidHistoricalPrices
  >;

const perpPosition = {
  chain: 'hyperliquid',
  perpPositionType: 'long',
  tokenSymbol: 'ETH',
  tokenAddress: '0x0000000000000000000000000000000000000000',
  trades: [],
} as unknown as Position;

const renderPerpPrices = (position: Position = perpPosition) =>
  renderHook(() =>
    usePerpsTraderPositionPrices(
      {
        positionParam: position,
        activeTimePeriod: '1M',
        earliestTradeMs: undefined,
      },
      { enabled: true },
    ),
  );

describe('usePerpsTraderPositionPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchHyperliquid.mockResolvedValue([]);
  });

  it('pre-fetches every period up front so an interval switch needs no network', async () => {
    renderPerpPrices();

    await waitFor(() => expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5));

    const intervals = mockFetchHyperliquid.mock.calls.map(
      ([opts]) => opts.interval,
    );
    const expected: HyperliquidCandleInterval[] = [
      '1m',
      '15m',
      '1h',
      '4h',
      '1d',
    ];
    expect(new Set(intervals)).toEqual(new Set(expected));
  });

  it('requests every period for the position symbol', async () => {
    renderPerpPrices();

    await waitFor(() => expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5));
    for (const [opts] of mockFetchHyperliquid.mock.calls) {
      expect(opts.symbol).toBe('ETH');
    }
  });

  it('clears loading when the active period resolves without waiting on earlier periods', async () => {
    const oneMonthPrices: TokenPrice[] = [
      ['1', 100],
      ['2', 101],
    ];
    let resolveSlowPeriods: () => void = () => undefined;
    const slowPeriodsPromise = new Promise<TokenPrice[]>((resolve) => {
      resolveSlowPeriods = () => resolve([]);
    });

    mockFetchHyperliquid.mockImplementation(({ interval }) => {
      if (interval === '4h') {
        return Promise.resolve(oneMonthPrices);
      }
      if (interval === '1m' || interval === '15m' || interval === '1h') {
        return slowPeriodsPromise;
      }
      return Promise.resolve([]);
    });

    const { result } = renderPerpPrices();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);

    resolveSlowPeriods();
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('does not refetch already-loaded periods when positionParam gets a new reference', async () => {
    const goodPrices: TokenPrice[] = [
      ['1', 100],
      ['2', 101],
    ];
    mockFetchHyperliquid.mockResolvedValue(goodPrices);

    const { rerender } = renderHook(
      (position: Position) =>
        usePerpsTraderPositionPrices(
          {
            positionParam: position,
            activeTimePeriod: '1M',
            earliestTradeMs: undefined,
          },
          { enabled: true },
        ),
      { initialProps: perpPosition },
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);

    rerender({ ...perpPosition } as Position);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);
  });

  it('refetches with a larger limit when an earlier trade extends the required window', async () => {
    const savedNow = Date.now;
    Date.now = () => 2_000_000_000_000;
    try {
      mockFetchHyperliquid.mockResolvedValue([
        ['1', 100],
        ['2', 101],
      ] as TokenPrice[]);

      const snapshot = { ...perpPosition, trades: [] } as unknown as Position;
      const { rerender } = renderHook(
        (position: Position) =>
          usePerpsTraderPositionPrices(
            {
              positionParam: position,
              activeTimePeriod: '1M',
              earliestTradeMs: position.trades?.length
                ? 1_000_000_000_000
                : undefined,
            },
            { enabled: true },
          ),
        { initialProps: snapshot },
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetchHyperliquid).toHaveBeenCalledTimes(5);
      const initialOneMinLimit = mockFetchHyperliquid.mock.calls.find(
        ([opts]) => opts.interval === '1m',
      )?.[0].limit as number;

      const withOldTrade = {
        ...perpPosition,
        trades: [{ timestamp: 1_000_000_000_000 }],
      } as unknown as Position;
      rerender(withOldTrade);
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetchHyperliquid.mock.calls.length).toBeGreaterThan(5);
      const oneMinCalls = mockFetchHyperliquid.mock.calls.filter(
        ([opts]) => opts.interval === '1m',
      );
      expect(oneMinCalls.length).toBeGreaterThanOrEqual(2);
      expect(oneMinCalls.at(-1)?.[0].limit).toBeGreaterThan(initialOneMinLimit);
    } finally {
      Date.now = savedNow;
    }
  });

  it('does not fetch when enabled is false', async () => {
    renderHook(() =>
      usePerpsTraderPositionPrices(
        {
          positionParam: perpPosition,
          activeTimePeriod: '1M',
          earliestTradeMs: undefined,
        },
        { enabled: false },
      ),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetchHyperliquid).not.toHaveBeenCalled();
  });
});
