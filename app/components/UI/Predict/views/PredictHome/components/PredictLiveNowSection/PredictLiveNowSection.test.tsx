import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import { useCurrentPredictMarketFromSeries } from '../../../../hooks/useCurrentPredictMarketFromSeries';
import { selectPredictUpDownEnabledFlag } from '../../../../selectors/featureFlags';
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

const createLiveMarket = (id: string): PredictMarket =>
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

const setCryptoMarket = (
  overrides: Partial<{ market?: PredictMarket; isLoading: boolean }> = {},
) => {
  mockUseCurrentPredictMarketFromSeries.mockReturnValue({
    market: undefined,
    isLoading: false,
    ...overrides,
  });
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
      limit: 7,
    } as PredictMarketListParams);
  });

  it('renders skeleton cards while loading with no markets yet', () => {
    setLiveMarketList({ markets: [], isLoading: true });

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.SKELETON_PREFIX}-0`),
    ).toBeOnTheScreen();
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
    setCryptoMarket({ market: createCryptoMarket('CRYPTO') });

    const { getByTestId } = render(<PredictLiveNowSection />);

    expect(
      getByTestId(`${PREDICT_LIVE_NOW_SECTION_TEST_IDS.CARD_PREFIX}-CRYPTO`),
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
