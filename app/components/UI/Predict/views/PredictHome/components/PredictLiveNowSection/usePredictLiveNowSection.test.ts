import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import { useCurrentPredictMarketFromSeries } from '../../../../hooks/useCurrentPredictMarketFromSeries';
import { selectPredictUpDownEnabledFlag } from '../../../../selectors/featureFlags';
import {
  BTC_UP_OR_DOWN_5M_SERIES,
  ETH_UP_OR_DOWN_5M_SERIES,
  BTC_UP_OR_DOWN_15M_SERIES,
} from '../../../../constants/liveNowCryptoSeries';
import type { PredictMarket, PredictMarketListParams } from '../../../../types';
import { CRYPTO_TAG, UP_OR_DOWN_TAG } from '../../../../utils/cryptoUpDown';
import {
  usePredictLiveNowSection,
  LIVE_NOW_FETCH_LIMIT,
  LIVE_NOW_LIVE_LIMIT,
} from './usePredictLiveNowSection';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/usePredictMarketList');
jest.mock('../../../../hooks/useCurrentPredictMarketFromSeries');

const mockUseSelector = useSelector as jest.Mock;
const mockUsePredictMarketList = usePredictMarketList as jest.Mock;
const mockUseCurrentPredictMarketFromSeries =
  useCurrentPredictMarketFromSeries as jest.Mock;

// Scoreboard-capable live market (has `game`).
const createLiveMarket = (id: string): PredictMarket =>
  ({ id, game: { id: `game-${id}` } }) as unknown as PredictMarket;

// "Regular" live market (no `game`).
const createRegularMarket = (id: string): PredictMarket =>
  ({ id }) as unknown as PredictMarket;

const createCryptoMarket = (id: string): PredictMarket =>
  ({
    id,
    tags: [CRYPTO_TAG, UP_OR_DOWN_TAG],
    series: { id, slug: 'crypto-up-or-down', recurrence: '5m' },
  }) as unknown as PredictMarket;

const setLiveMarketList = (
  overrides: Partial<{
    markets: PredictMarket[];
    isLoading: boolean;
    error: Error | null;
  }> = {},
) => {
  mockUsePredictMarketList.mockReturnValue({
    markets: [],
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    error: null,
    hasNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    ...overrides,
  });
};

// Default: no crypto market resolved, not loading, for every series.
const setNoCrypto = ({ isLoading = false }: { isLoading?: boolean } = {}) => {
  mockUseCurrentPredictMarketFromSeries.mockReturnValue({
    market: undefined,
    isLoading,
  });
};

// Resolve a distinct crypto market per series id (BTC 5m / ETH 5m / BTC 15m).
const setCryptoMarketsBySeries = (
  bySeriesId: Record<string, PredictMarket | undefined>,
  { isLoading = false }: { isLoading?: boolean } = {},
) => {
  mockUseCurrentPredictMarketFromSeries.mockImplementation(
    ({ series }: { series?: { id: string } }) => ({
      market: series ? bySeriesId[series.id] : undefined,
      isLoading,
    }),
  );
};

const setUpDownEnabled = (enabled: boolean) => {
  mockUseSelector.mockImplementation((selector) =>
    selector === selectPredictUpDownEnabledFlag ? enabled : false,
  );
};

const ids = (markets: PredictMarket[]) => markets.map((market) => market.id);

describe('usePredictLiveNowSection', () => {
  beforeEach(() => {
    setUpDownEnabled(false);
    setLiveMarketList();
    setNoCrypto();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests live markets with the live param and over-fetch limit', () => {
    renderHook(() => usePredictLiveNowSection());

    expect(mockUsePredictMarketList).toHaveBeenCalledWith({
      live: true,
      order: 'volume24hr',
      status: 'open',
      limit: LIVE_NOW_FETCH_LIMIT,
    } as PredictMarketListParams);
  });

  it('keeps scoreboard markets and drops regular markets without a game', () => {
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createRegularMarket('R1')],
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(ids(result.current.items)).toEqual(['L1']);
  });

  it('caps scoreboard markets at the display limit', () => {
    const live = Array.from({ length: LIVE_NOW_LIVE_LIMIT + 4 }, (_, i) =>
      createLiveMarket(`L${i}`),
    );
    setLiveMarketList({ markets: live });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(result.current.items).toHaveLength(LIVE_NOW_LIVE_LIMIT);
  });

  it('omits crypto markets when the Up/Down flag is off', () => {
    setUpDownEnabled(false);
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createLiveMarket('L2')],
    });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('C1'),
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(ids(result.current.items)).toEqual(['L1', 'L2']);
  });

  it('interleaves three crypto series in 2-live-1-crypto order when enabled', () => {
    setUpDownEnabled(true);
    setLiveMarketList({
      markets: [
        createLiveMarket('L1'),
        createLiveMarket('L2'),
        createLiveMarket('L3'),
        createLiveMarket('L4'),
        createLiveMarket('L5'),
        createLiveMarket('L6'),
      ],
    });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('BTC5M'),
      [ETH_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('ETH5M'),
      [BTC_UP_OR_DOWN_15M_SERIES.id]: createCryptoMarket('BTC15M'),
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(ids(result.current.items)).toEqual([
      'L1',
      'L2',
      'BTC5M',
      'L3',
      'L4',
      'ETH5M',
      'L5',
      'L6',
      'BTC15M',
    ]);
  });

  it('reports loading while the live list loads even if crypto already resolved', () => {
    setUpDownEnabled(true);
    setLiveMarketList({ markets: [], isLoading: true });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('BTC5M'),
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEmpty).toBe(false);
  });

  it('reports empty when nothing resolves after loading settles', () => {
    setUpDownEnabled(true);
    setLiveMarketList({ markets: [], isLoading: false });
    setNoCrypto({ isLoading: false });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isEmpty).toBe(true);
  });
});
