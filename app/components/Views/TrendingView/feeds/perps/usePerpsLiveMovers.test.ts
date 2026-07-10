/**
 * usePerpsLiveMovers — unit tests
 *
 * Covers the behavior that makes each live-price tick cheap:
 * 1. Initial ranking matches filterAndSortByPriceChangeDirection over the full base set (ranking correctness is preserved).
 * 2. A push that doesn't change the displayed top-N triggers no re-render.
 * 3. A push that changes the displayed top-N updates the result.
 * 4. Items whose displayed value is unchanged keep their previous object identity (so memoized pill components skip re-rendering).
 * 5. Disabling tears down the subscription and freezes the last result.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  type PerpsMarketData,
  formatPercentage,
} from '@metamask/perps-controller';
import { usePerpsLiveMovers } from './usePerpsLiveMovers';
import {
  filterAndSortByPriceChangeDirection,
  type PerpsFeedItem,
} from './usePerpsFeed';

const mockSubscribeToSymbols = jest.fn();

jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    prices: {
      subscribeToSymbols: mockSubscribeToSymbols,
    },
  })),
}));

// Real market data always arrives with change24hPercent pre-formatted (the
// REST transform calls formatPercentage itself), so fixtures use the same
// formatting the live-price merge path produces — otherwise a live push
// with an unchanged numeric value would look like a change (raw "5" vs
// formatted "+5.00%") purely due to fixture shape, not hook behavior.
const makeMarket = (symbol: string, rawPercent: number): PerpsMarketData =>
  ({
    symbol,
    name: symbol,
    change24hPercent: formatPercentage(rawPercent),
  }) as unknown as PerpsMarketData;

const makeFeedItem = (symbol: string, rawPercent: number): PerpsFeedItem => ({
  market: makeMarket(symbol, rawPercent),
  isWatchlisted: false,
});

type PriceUpdatePayload = Record<string, { percentChange24h?: string }>;

describe('usePerpsLiveMovers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ranks the initial base set the same way filterAndSortByPriceChangeDirection does', async () => {
    mockSubscribeToSymbols.mockReturnValue(jest.fn());
    const items = [
      makeFeedItem('LOSER', -3),
      makeFeedItem('HIGH_GAINER', 5),
      makeFeedItem('LOW_GAINER', 1),
    ];

    const { result } = renderHook(() =>
      usePerpsLiveMovers({ items, direction: 'gainers', maxCount: 12 }),
    );

    const expectedSymbols = filterAndSortByPriceChangeDirection(
      items.map((item) => item.market),
      'gainers',
    ).map((market) => market.symbol);

    await waitFor(() => {
      expect(result.current.map((item) => item.market.symbol)).toEqual(
        expectedSymbols,
      );
    });
  });

  it('slices to maxCount', async () => {
    mockSubscribeToSymbols.mockReturnValue(jest.fn());
    const items = [
      makeFeedItem('A', 5),
      makeFeedItem('B', 4),
      makeFeedItem('C', 3),
    ];

    const { result } = renderHook(() =>
      usePerpsLiveMovers({ items, direction: 'gainers', maxCount: 2 }),
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
    });
    expect(result.current.map((item) => item.market.symbol)).toEqual([
      'A',
      'B',
    ]);
  });

  it('does not re-render when a push does not change the displayed top-N', async () => {
    let capturedCallback: (prices: PriceUpdatePayload) => void = jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const items = [
      makeFeedItem('HIGH_GAINER', 5),
      makeFeedItem('LOW_GAINER', 1),
    ];

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return usePerpsLiveMovers({ items, direction: 'gainers', maxCount: 12 });
    });

    await waitFor(() => {
      expect(result.current.map((item) => item.market.symbol)).toEqual([
        'HIGH_GAINER',
        'LOW_GAINER',
      ]);
    });

    const renderCountAfterMount = renderCount;

    // Push the exact same percent changes already reflected in the base data.
    act(() => {
      capturedCallback({
        HIGH_GAINER: { percentChange24h: '5' },
        LOW_GAINER: { percentChange24h: '1' },
      });
    });

    expect(renderCount).toBe(renderCountAfterMount);
  });

  it('updates the displayed order when a push changes the ranking', async () => {
    let capturedCallback: (prices: PriceUpdatePayload) => void = jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const items = [
      makeFeedItem('HIGH_GAINER', 5),
      makeFeedItem('LOW_GAINER', 1),
    ];

    const { result } = renderHook(() =>
      usePerpsLiveMovers({ items, direction: 'gainers', maxCount: 12 }),
    );

    await waitFor(() => {
      expect(result.current.map((item) => item.market.symbol)).toEqual([
        'HIGH_GAINER',
        'LOW_GAINER',
      ]);
    });

    // LOW_GAINER overtakes HIGH_GAINER.
    act(() => {
      capturedCallback({
        HIGH_GAINER: { percentChange24h: '2' },
        LOW_GAINER: { percentChange24h: '9' },
      });
    });

    await waitFor(() => {
      expect(result.current.map((item) => item.market.symbol)).toEqual([
        'LOW_GAINER',
        'HIGH_GAINER',
      ]);
    });
  });

  it('reuses the previous item identity for symbols whose displayed value is unchanged', async () => {
    let capturedCallback: (prices: PriceUpdatePayload) => void = jest.fn();
    mockSubscribeToSymbols.mockImplementation((params) => {
      capturedCallback = params.callback;
      return jest.fn();
    });

    const items = [makeFeedItem('MOVES', 5), makeFeedItem('STAYS', 3)];

    const { result } = renderHook(() =>
      usePerpsLiveMovers({ items, direction: 'gainers', maxCount: 12 }),
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
    });

    const staysItemBefore = result.current.find(
      (item) => item.market.symbol === 'STAYS',
    );

    // Only MOVES changes; STAYS keeps the same percent change.
    act(() => {
      capturedCallback({
        MOVES: { percentChange24h: '8' },
        STAYS: { percentChange24h: '3' },
      });
    });

    await waitFor(() => {
      const movesItem = result.current.find(
        (item) => item.market.symbol === 'MOVES',
      );
      expect(movesItem?.market.change24hPercent).toBe('+8.00%');
    });

    const staysItemAfter = result.current.find(
      (item) => item.market.symbol === 'STAYS',
    );
    expect(staysItemAfter).toBe(staysItemBefore);
  });

  it('unsubscribes and freezes the displayed data when disabled', async () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToSymbols.mockReturnValue(mockUnsubscribe);

    const items = [
      makeFeedItem('HIGH_GAINER', 5),
      makeFeedItem('LOW_GAINER', 1),
    ];

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePerpsLiveMovers({
          items,
          direction: 'gainers',
          maxCount: 12,
          enabled,
        }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(result.current.map((item) => item.market.symbol)).toEqual([
        'HIGH_GAINER',
        'LOW_GAINER',
      ]);
    });

    const displayedBeforeDisable = result.current;

    act(() => {
      rerender({ enabled: false });
    });

    // The channel subscription is torn down (no more ticks are delivered to
    // this hook) and the last computed slice stays exactly as it was.
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(result.current).toBe(displayedBeforeDisable);
  });

  it('does not subscribe when there are no items', () => {
    mockSubscribeToSymbols.mockReturnValue(jest.fn());

    renderHook(() =>
      usePerpsLiveMovers({ items: [], direction: 'gainers', maxCount: 12 }),
    );

    expect(mockSubscribeToSymbols).not.toHaveBeenCalled();
  });
});
