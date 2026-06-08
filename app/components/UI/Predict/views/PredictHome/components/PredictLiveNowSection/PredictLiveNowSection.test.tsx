import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
import PredictLiveNowSection from './PredictLiveNowSection';
import { PREDICT_LIVE_NOW_SECTION_TEST_IDS } from './PredictLiveNowSection.testIds';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/usePredictMarketList');

jest.mock('../../../../hooks/useCurrentPredictMarketFromSeries');

jest.mock('../../../../components/PredictMarket', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      testID,
      market,
    }: {
      testID?: string;
      market: { id: string };
    }) => (
      <View testID={testID}>
        <Text>{market.id}</Text>
      </View>
    ),
  };
});

jest.mock('../../../../components/PredictMarketSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

const mockUseSelector = useSelector as jest.Mock;
const mockUsePredictMarketList = usePredictMarketList as jest.Mock;
const mockUseCurrentPredictMarketFromSeries =
  useCurrentPredictMarketFromSeries as jest.Mock;

// Scoreboard-capable live market (has `game`) — survives the rail's filter.
const createLiveMarket = (id: string): PredictMarket =>
  ({ id, game: { id: `game-${id}` } }) as unknown as PredictMarket;

// "Regular" live market (no `game`) — filtered out of the rail.
const createRegularMarket = (id: string): PredictMarket =>
  ({ id }) as unknown as PredictMarket;

const createCryptoMarket = (id: string): PredictMarket =>
  ({
    id,
    tags: [CRYPTO_TAG, UP_OR_DOWN_TAG],
    series: { id: '10684', slug: 'btc-up-or-down-5m', recurrence: '5m' },
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

// Default: no crypto market resolved for any series.
const setCryptoMarket = (
  overrides: Partial<{ market?: PredictMarket; isLoading: boolean }> = {},
) => {
  mockUseCurrentPredictMarketFromSeries.mockReturnValue({
    market: undefined,
    isLoading: false,
    ...overrides,
  });
};

// Resolve a distinct crypto market per series id (BTC 5m / ETH 5m / BTC 15m),
// since the hook now calls useCurrentPredictMarketFromSeries once per series.
const setCryptoMarketsBySeries = (
  bySeriesId: Record<string, PredictMarket | undefined>,
) => {
  mockUseCurrentPredictMarketFromSeries.mockImplementation(
    ({ series }: { series?: { id: string } }) => ({
      market: series ? bySeriesId[series.id] : undefined,
      isLoading: false,
    }),
  );
};

// Mock `useSelector` by selector identity so we only control the Up/Down
// feature flag and leave every other selector at a safe default of `false`.
const setUpDownEnabled = (enabled: boolean) => {
  mockUseSelector.mockImplementation((selector) =>
    selector === selectPredictUpDownEnabledFlag ? enabled : false,
  );
};

describe('PredictLiveNowSection', () => {
  beforeEach(() => {
    setUpDownEnabled(false);
    setLiveMarketList();
    setCryptoMarket();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests live markets with the live param and v1 query', () => {
    setLiveMarketList({ markets: [createLiveMarket('L1')] });

    render(<PredictLiveNowSection />);

    expect(mockUsePredictMarketList).toHaveBeenCalledWith({
      live: true,
      order: 'volume24hr',
      status: 'open',
      limit: 15,
    } as PredictMarketListParams);
  });

  it('filters out "regular" live markets without a game (scoreboard) object', () => {
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createRegularMarket('R1')],
    });

    const { getByTestId, queryByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-L1`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-R1`),
    ).not.toBeOnTheScreen();
  });

  it('renders skeleton cards while loading with no markets yet', () => {
    setLiveMarketList({ markets: [], isLoading: true });

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.SKELETON_PREFIX}-0`),
    ).toBeOnTheScreen();
  });

  it('keeps showing skeletons while live markets load even if crypto already resolved', () => {
    setUpDownEnabled(true);
    setLiveMarketList({ markets: [], isLoading: true });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('BTC5M'),
      [ETH_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('ETH5M'),
      [BTC_UP_OR_DOWN_15M_SERIES.id]: createCryptoMarket('BTC15M'),
    });

    const { getByTestId, queryByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.SKELETON_PREFIX}-0`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-BTC5M`),
    ).not.toBeOnTheScreen();
  });

  it('renders a market card for each live market on success', () => {
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createLiveMarket('L2')],
    });

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-L1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-L2`),
    ).toBeOnTheScreen();
  });

  it('interleaves the crypto card after two live cards when Up/Down is enabled', () => {
    setUpDownEnabled(true);
    setLiveMarketList({
      markets: [
        createLiveMarket('L1'),
        createLiveMarket('L2'),
        createLiveMarket('L3'),
      ],
    });
    setCryptoMarketsBySeries({
      [BTC_UP_OR_DOWN_5M_SERIES.id]: createCryptoMarket('CRYPTO'),
    });

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-CRYPTO`),
    ).toBeOnTheScreen();
  });

  it('sources all three crypto series (BTC 5m, ETH 5m, BTC 15m) when Up/Down is enabled', () => {
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

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-BTC5M`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-ETH5M`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-BTC15M`),
    ).toBeOnTheScreen();
  });

  it('hides the section when there are no markets after loading', () => {
    setLiveMarketList({ markets: [], isLoading: false });

    const { queryByTestId } = render(<PredictLiveNowSection />);

    expect(
      queryByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.SECTION),
    ).not.toBeOnTheScreen();
  });

  it('hides the section on error (empty markets, not loading)', () => {
    setLiveMarketList({
      markets: [],
      isLoading: false,
      error: new Error('failed'),
    });

    const { queryByTestId } = render(<PredictLiveNowSection />);

    expect(
      queryByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.SECTION),
    ).not.toBeOnTheScreen();
  });

  it('renders a See all action that is pressable without crashing', () => {
    setLiveMarketList({ markets: [createLiveMarket('L1')] });

    const { getByTestId } = render(<PredictLiveNowSection />);
    const seeAll = getByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.SEE_ALL);
    fireEvent.press(seeAll);

    expect(seeAll).toBeOnTheScreen();
  });

  it('renders pagination dots when there are 2+ markets after load', () => {
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createLiveMarket('L2')],
    });

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.PAGINATION_DOTS),
    ).toBeOnTheScreen();
  });

  it('does not render pagination dots when there is fewer than 2 markets', () => {
    setLiveMarketList({ markets: [createLiveMarket('L1')] });

    const { queryByTestId } = render(<PredictLiveNowSection />);

    expect(
      queryByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.PAGINATION_DOTS),
    ).not.toBeOnTheScreen();
  });

  it('handles scrolling the carousel without crashing', () => {
    setLiveMarketList({
      markets: [createLiveMarket('L1'), createLiveMarket('L2')],
    });

    const { getByTestId } = render(<PredictLiveNowSection />);
    const carousel = getByTestId(PREDICT_LIVE_NOW_SECTION_TEST_IDS.CAROUSEL);

    fireEvent.scroll(carousel, {
      nativeEvent: { contentOffset: { x: 320, y: 0 } },
    });

    expect(carousel).toBeOnTheScreen();
  });
});
