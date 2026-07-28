import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import { useCurrentPredictMarketFromSeries } from '../../../../hooks/useCurrentPredictMarketFromSeries';
import {
  selectPredictFeedCarouselConfig,
  selectPredictUpDownEnabledFlag,
} from '../../../../selectors/featureFlags';
import { DEFAULT_PREDICT_FEED_CAROUSEL_FLAG } from '../../../../constants/flags';
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
  CUSTOM_FEED_CAROUSEL_LIMIT,
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

let upDownEnabled = false;
let feedCarouselConfig = DEFAULT_PREDICT_FEED_CAROUSEL_FLAG;

const syncSelectors = () => {
  mockUseSelector.mockImplementation((selector) =>
    selector === selectPredictUpDownEnabledFlag
      ? upDownEnabled
      : selector === selectPredictFeedCarouselConfig
        ? feedCarouselConfig
        : false,
  );
};

const setUpDownEnabled = (enabled: boolean) => {
  upDownEnabled = enabled;
  syncSelectors();
};

const setCustomConfig = (
  queryParams = '',
  excludedMarketIds: string[] = [],
  composition: 'query-results' | 'live-now' = 'query-results',
) => {
  feedCarouselConfig = {
    enabled: true,
    minimumVersion: '1.0.0',
    mode: 'custom',
    title: 'Wimbledon',
    contentSource: {
      composition,
      queryParams,
      excludedMarketIds,
    },
  };
  syncSelectors();
};

const ids = (markets: PredictMarket[]) => markets.map((market) => market.id);

describe('usePredictLiveNowSection', () => {
  beforeEach(() => {
    feedCarouselConfig = DEFAULT_PREDICT_FEED_CAROUSEL_FLAG;
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

  it('requests top open markets when custom mode has no query override', () => {
    setCustomConfig();

    renderHook(() => usePredictLiveNowSection());

    expect(mockUsePredictMarketList).toHaveBeenCalledWith({
      order: 'volume24hr',
      status: 'open',
      limit: LIVE_NOW_FETCH_LIMIT,
    } as PredictMarketListParams);
  });

  it('passes the configured Polymarket query in custom mode', () => {
    setCustomConfig('tag_slug=tennis&title_search=Wimbledon');

    renderHook(() => usePredictLiveNowSection());

    expect(mockUsePredictMarketList).toHaveBeenCalledWith({
      order: 'volume24hr',
      status: 'open',
      limit: LIVE_NOW_FETCH_LIMIT,
      customQueryParams: 'tag_slug=tennis&title_search=Wimbledon',
    } as PredictMarketListParams);
  });

  it('updates the active query when remote configuration changes', () => {
    const { rerender, result } = renderHook(() => usePredictLiveNowSection());
    expect(mockUsePredictMarketList).toHaveBeenLastCalledWith(
      expect.objectContaining({ live: true }),
    );

    setCustomConfig('tag_slug=tennis');
    rerender({});

    expect(mockUsePredictMarketList).toHaveBeenLastCalledWith(
      expect.objectContaining({ customQueryParams: 'tag_slug=tennis' }),
    );
    expect(result.current.config.title).toBe('Wimbledon');

    feedCarouselConfig = {
      ...feedCarouselConfig,
      title: 'NFL Playoffs',
      contentSource: {
        composition: 'query-results',
        queryParams: 'tag_slug=football',
        excludedMarketIds: ['market-2'],
      },
    };
    syncSelectors();
    rerender({});

    expect(mockUsePredictMarketList).toHaveBeenLastCalledWith(
      expect.objectContaining({ customQueryParams: 'tag_slug=football' }),
    );
    expect(result.current.config.title).toBe('NFL Playoffs');
    expect(result.current.config.contentSource.excludedMarketIds).toEqual([
      'market-2',
    ]);
  });

  it('keeps sports game markets and drops regular markets without game data', () => {
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createRegularMarket('R1')],
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(ids(result.current.items)).toEqual(['L1']);
  });

  it('caps sports game markets at the display limit', () => {
    const live = Array.from({ length: LIVE_NOW_LIVE_LIMIT + 4 }, (_, i) =>
      createLiveMarket(`L${i}`),
    );
    setLiveMarketList({ markets: live });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(result.current.items).toHaveLength(LIVE_NOW_LIVE_LIMIT);
  });

  it('keeps query-result markets and caps cards in custom mode', () => {
    setCustomConfig('tag_slug=tennis');
    setUpDownEnabled(true);
    const markets = Array.from(
      { length: CUSTOM_FEED_CAROUSEL_LIMIT + 2 },
      (_, index) => createRegularMarket(`R${index}`),
    );
    setLiveMarketList({ markets });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('BTC5M'),
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(result.current.items).toEqual(
      markets.slice(0, CUSTOM_FEED_CAROUSEL_LIMIT),
    );
    expect(mockUseCurrentPredictMarketFromSeries).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('removes excluded markets before applying the custom card limit', () => {
    setCustomConfig('live=true&order=volume24hr', ['R0', 'R1']);
    const markets = Array.from(
      { length: CUSTOM_FEED_CAROUSEL_LIMIT + 2 },
      (_, index) => createRegularMarket(`R${index}`),
    );
    setLiveMarketList({ markets });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(ids(result.current.items)).toEqual(
      Array.from(
        { length: CUSTOM_FEED_CAROUSEL_LIMIT },
        (_, index) => `R${index + 2}`,
      ),
    );
  });

  it('reuses Live Now sports-card and crypto composition after exclusions', () => {
    setCustomConfig('live=true&order=volume24hr', ['L1', 'BTC5M'], 'live-now');
    setUpDownEnabled(true);
    setLiveMarketList({
      markets: [
        createLiveMarket('L1'),
        createRegularMarket('R1'),
        createLiveMarket('L2'),
        createLiveMarket('L3'),
      ],
    });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('BTC5M'),
      [ETH_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('ETH5M'),
    });

    const { result } = renderHook(() => usePredictLiveNowSection());

    expect(ids(result.current.items)).toEqual(['L2', 'L3', 'ETH5M']);
    expect(mockUseCurrentPredictMarketFromSeries).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
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
