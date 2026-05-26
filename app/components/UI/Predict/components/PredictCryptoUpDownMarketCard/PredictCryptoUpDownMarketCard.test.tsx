import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictCryptoUpDownMarketCardSelectorsIDs } from '../../Predict.testIds';
import {
  PredictMarket,
  PredictOutcome,
  Recurrence,
  type PredictSeries,
} from '../../types';
import PredictCryptoUpDownMarketCard, {
  __resetCardClockForTest,
  getSparklineDisplayPoints,
  getSparklineRange,
} from './PredictCryptoUpDownMarketCard';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/usePredictSeries', () => ({
  usePredictSeries: jest.fn(),
}));

jest.mock('../../hooks/useCryptoUpDownChartData', () => ({
  useCryptoUpDownChartData: jest.fn(),
}));

jest.mock('../../hooks/useCryptoTargetPrice', () => ({
  useCryptoTargetPrice: jest.fn(),
}));

jest.mock('../../hooks/useLiveMarketPrices', () => ({
  useLiveMarketPrices: jest.fn(),
}));

const mockOpenBuySheet = jest.fn();
jest.mock('../../contexts', () => ({
  usePredictEntryPoint: () => undefined,
  usePredictPreviewSheet: () => ({
    openBuySheet: mockOpenBuySheet,
  }),
}));

jest.mock('../../hooks/usePredictActionGuard', () => ({
  usePredictActionGuard: () => ({
    executeGuardedAction: (action: () => void) => action(),
    isEligible: true,
  }),
}));

jest.mock('../../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      isFromTrending: false,
    }),
  },
}));

jest.mock('react-native-svg-charts', () => {
  const { View } = jest.requireActual('react-native');
  return {
    AreaChart: jest.fn(({ testID, children, ...props }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    )),
    LineChart: jest.fn(({ testID, ...props }) => (
      <View testID={testID} {...props} />
    )),
  };
});

const initialState = {
  engine: {
    backgroundState,
  },
};

const transactionActiveAbTests: TransactionActiveAbTestEntry[] = [
  {
    key: 'predict-empty-state',
    value: 'treatment',
    key_value_pair: 'predict-empty-state=treatment',
  },
];

const SERIES: PredictSeries = {
  id: 'btc-series',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down - 5 Minutes',
  recurrence: '5m',
};

const createOutcome = (overrides: Partial<PredictOutcome> = {}) => ({
  id: 'outcome-up-down',
  providerId: 'polymarket',
  marketId: 'market-live',
  title: 'BTC Up or Down',
  description: 'BTC Up or Down',
  image: 'https://example.com/btc.png',
  status: 'open' as const,
  tokens: [
    { id: 'up-token', title: 'Up', price: 0.35 },
    { id: 'down-token', title: 'Down', price: 0.65 },
  ],
  volume: 3500000,
  groupItemTitle: 'BTC',
  ...overrides,
});

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket & { series: PredictSeries } => ({
  id: 'market-live',
  providerId: 'polymarket',
  slug: 'btc-up-or-down-5m-live',
  title: 'BTC Up or Down - 5 Minutes',
  description: 'BTC Up or Down',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto', 'up-or-down', 'bitcoin'],
  outcomes: [createOutcome()],
  liquidity: 1000000,
  volume: 3500000,
  endDate: new Date(Date.now() + 60_000).toISOString(),
  series: SERIES,
  ...overrides,
});

const renderCard = (
  market = createMarket(),
  props: Partial<
    React.ComponentProps<typeof PredictCryptoUpDownMarketCard>
  > = {},
) =>
  renderWithProvider(
    <PredictCryptoUpDownMarketCard {...props} market={market} />,
    {
      state: initialState,
    },
  );

describe('getSparklineDisplayPoints', () => {
  it('keeps seeded history while dense live points cover only the right edge', () => {
    const historicalPoints = Array.from({ length: 4 }, (_, index) => ({
      time: 930 + index * 10,
      value: 69000 + index * 10,
    }));
    const livePoints = Array.from({ length: 30 }, (_, index) => ({
      time: 1000 + index * 0.05,
      value: 69100 + index,
    }));

    const displayPoints = getSparklineDisplayPoints([
      ...historicalPoints,
      ...livePoints,
    ]);

    expect(displayPoints[0].time).toBeCloseTo(971.45);
    expect(displayPoints.some((point) => point.time < 1000)).toBe(true);
    expect(displayPoints[historicalPoints.length - 1].time).toBeCloseTo(996);
    expect(displayPoints.at(-1)?.time).toBeCloseTo(1001.45);
  });

  it('drops seeded history after live points cover the visible window', () => {
    const historicalPoints = [
      { time: 900, value: 69000 },
      { time: 940, value: 69010 },
    ];
    const livePoints = Array.from({ length: 31 }, (_, index) => ({
      time: 970 + index,
      value: 69100 + index,
    }));

    const displayPoints = getSparklineDisplayPoints([
      ...historicalPoints,
      ...livePoints,
    ]);

    expect(displayPoints[0].time).toBe(970);
    expect(displayPoints.some((point) => point.time < 970)).toBe(false);
    expect(displayPoints.at(-1)?.time).toBe(1000);
  });

  it('uses the supplied recurrence window instead of the live 30-second window', () => {
    const points = [
      { time: 100, value: 69000 },
      { time: 400, value: 69010 },
      { time: 4000, value: 69020 },
    ];

    const displayPoints = getSparklineDisplayPoints(points, 3600);

    expect(displayPoints).toEqual([
      { time: 400, value: 69010 },
      { time: 4000, value: 69020 },
    ]);
  });

  it('can fit incomplete historical data across the full visual window', () => {
    const points = [
      { time: 1000, value: 69000 },
      { time: 2000, value: 69010 },
      { time: 4000, value: 69020 },
    ];

    const displayPoints = getSparklineDisplayPoints(points, 3600, true);

    expect(displayPoints[0].time).toBe(400);
    expect(displayPoints[1].time).toBe(1600);
    expect(displayPoints[2].time).toBe(4000);
  });

  it('spreads repeated-timestamp points across the full visual window', () => {
    const points = [
      { time: 4000, value: 69000 },
      { time: 4000, value: 69010 },
      { time: 4000, value: 69020 },
    ];

    const displayPoints = getSparklineDisplayPoints(points, 3600, true);

    expect(displayPoints).toEqual([
      { time: 400, value: 69000 },
      { time: 2200, value: 69010 },
      { time: 4000, value: 69020 },
    ]);
  });

  it('keeps a one-point historical payload as real data instead of inventing movement', () => {
    const points = [{ time: 4000, value: 69000 }];

    const displayPoints = getSparklineDisplayPoints(points, 3600, true);

    expect(displayPoints).toEqual(points);
  });

  it('keeps empty historical payloads empty instead of inventing movement', () => {
    const displayPoints = getSparklineDisplayPoints([], 3600, true);

    expect(displayPoints).toEqual([]);
  });

  it('uses a robust range so one old outlier does not flatten the chart', () => {
    const points = [
      { time: 970, value: 100000 },
      ...Array.from({ length: 12 }, (_, index) => ({
        time: 971 + index,
        value: 79000 + index * 10,
      })),
    ];

    const { yMin, yMax } = getSparklineRange(points, 79050);

    expect(yMax).toBeLessThan(100000);
    expect(yMin).toBeLessThan(79000);
    expect(yMax).toBeGreaterThan(79100);
  });
});

describe('PredictCryptoUpDownMarketCard', () => {
  const mockUsePredictSeries = usePredictSeries as jest.Mock;
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;
  const mockUseCryptoUpDownChartData = useCryptoUpDownChartData as jest.Mock;
  const mockUseCryptoTargetPrice = useCryptoTargetPrice as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetCardClockForTest();
    const liveMarket = createMarket();

    mockUsePredictSeries.mockReturnValue({
      data: [
        createMarket({
          id: 'market-ended',
          endDate: new Date(Date.now() - 60_000).toISOString(),
        }),
        liveMarket,
      ],
      isLoading: false,
    });
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: (tokenId: string) =>
        tokenId === 'up-token'
          ? { tokenId, price: 0.4, bestBid: 0.39, bestAsk: 0.4 }
          : { tokenId, price: 0.6, bestBid: 0.59, bestAsk: 0.6 },
    });
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [
        { time: 1, value: 69000 },
        { time: 2, value: 69198 },
      ],
      value: 69198,
      loading: false,
      isLive: true,
      window: 300,
    });
    mockUseCryptoTargetPrice.mockReturnValue({
      data: 69000,
      isFetching: false,
    });
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockOpenBuySheet.mockClear();
  });

  it('renders the live series card with buttons, reset copy, and sparkline', () => {
    renderCard();

    expect(screen.getByText('BTC Up or Down - 5 Minutes')).toBeOnTheScreen();
    expect(screen.getByText('Up · 40¢')).toBeOnTheScreen();
    expect(screen.getByText('Down · 60¢')).toBeOnTheScreen();
    expect(screen.getByText(/Resets every 5 min/)).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.SPARKLINE),
    ).toBeOnTheScreen();
    expect(mockUseCryptoUpDownChartData).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'market-live' }),
      69000,
      {
        liveUpdatesEnabled: false,
        historicalWindow: {
          startDate: expect.any(String),
        },
      },
    );
    const chartOptions = mockUseCryptoUpDownChartData.mock.calls[0][2];
    expect(chartOptions.historicalWindow.endDate).toBeUndefined();
    const requestAgeMs =
      Math.floor(Date.now() / (60 * 1000)) * 60 * 1000 -
      new Date(chartOptions.historicalWindow.startDate).getTime();
    expect(requestAgeMs).toBe(2 * 60 * 60 * 1000);
    expect(mockUsePredictSeries).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: SERIES.id }),
    );
  });

  it('uses a trailing 24-hour coin-history window for daily markets', () => {
    const dailySeries = {
      ...SERIES,
      title: 'BTC Up or Down - Daily',
      recurrence: 'daily',
    };
    const dailyMarket = createMarket({
      title: 'BTC Up or Down - Daily',
      series: dailySeries,
    });
    mockUsePredictSeries.mockReturnValue({
      data: [dailyMarket],
      isLoading: false,
    });

    renderCard(dailyMarket);

    const chartOptions = mockUseCryptoUpDownChartData.mock.calls[0][2];
    expect(chartOptions.historicalWindow.endDate).toBeUndefined();
    const dailyDisplayMs = 24 * 60 * 60 * 1000;
    const dailyBucketMs = Math.max(60_000, Math.floor(dailyDisplayMs / 12));
    const requestAgeMs =
      Math.floor(Date.now() / dailyBucketMs) * dailyBucketMs -
      new Date(chartOptions.historicalWindow.startDate).getTime();
    expect(requestAgeMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('formats longer recurrence countdown and reset copy with hours', () => {
    mockUsePredictSeries.mockReturnValue({
      data: [
        createMarket({
          endDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        }),
      ],
      isLoading: false,
    });

    renderCard(
      createMarket({
        series: {
          ...SERIES,
          title: 'BTC Up or Down 4h',
          recurrence: '4h',
        },
      }),
    );

    expect(
      screen.getByText(/LIVE · [34]:[0-5][0-9]:[0-5][0-9]/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Resets every 4 hours/)).toBeOnTheScreen();
  });

  it('navigates to the live market details when the card body is pressed', () => {
    renderCard();

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.CARD),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: 'market-live',
        series: SERIES,
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        title: 'BTC Up or Down - 5 Minutes',
        image: 'https://example.com/btc.png',
      },
    });
  });

  it('includes transactionActiveAbTests when navigating to the live market details', () => {
    renderCard(createMarket(), { transactionActiveAbTests });

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.CARD),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: expect.objectContaining({
        marketId: 'market-live',
        transactionActiveAbTests,
      }),
    });
  });

  it('opens the buy sheet for the live market Up and Down outcomes', () => {
    const liveMarket = createMarket();
    mockUsePredictSeries.mockReturnValue({
      data: [liveMarket],
      isLoading: false,
    });
    renderCard();

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON),
    );
    expect(mockOpenBuySheet).toHaveBeenCalledWith({
      market: liveMarket,
      outcome: liveMarket.outcomes[0],
      outcomeToken: liveMarket.outcomes[0].tokens[0],
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.DOWN_BUTTON),
    );
    expect(mockOpenBuySheet).toHaveBeenLastCalledWith({
      market: liveMarket,
      outcome: liveMarket.outcomes[0],
      outcomeToken: liveMarket.outcomes[0].tokens[1],
      entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
    });
  });

  it('includes transactionActiveAbTests when opening the buy sheet', () => {
    const liveMarket = createMarket();
    mockUsePredictSeries.mockReturnValue({
      data: [liveMarket],
      isLoading: false,
    });

    renderCard(createMarket(), { transactionActiveAbTests });

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON),
    );

    expect(mockOpenBuySheet).toHaveBeenCalledWith(
      expect.objectContaining({
        market: liveMarket,
        outcome: liveMarket.outcomes[0],
        outcomeToken: liveMarket.outcomes[0].tokens[0],
        transactionActiveAbTests,
      }),
    );
  });

  it('renders skeleton state while the series window is loading', () => {
    mockUsePredictSeries.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderCard();

    expect(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.SKELETON),
    ).toBeOnTheScreen();
  });

  it('renders missing outcome data without opening a buy sheet', () => {
    mockUsePredictSeries.mockReturnValue({
      data: [createMarket({ outcomes: [] })],
      isLoading: false,
    });
    mockUseLiveMarketPrices.mockReturnValue({
      getPrice: () => undefined,
    });

    renderCard(createMarket({ outcomes: [] }));

    expect(screen.getAllByText(/--/).length).toBeGreaterThan(0);

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON),
    );
    expect(mockOpenBuySheet).not.toHaveBeenCalled();
  });

  it('does not open the buy sheet when the selected market is closed', () => {
    const closedMarket = createMarket({ status: 'closed' });
    mockUsePredictSeries.mockReturnValue({
      data: [closedMarket],
      isLoading: false,
    });

    renderCard(closedMarket);

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.DOWN_BUTTON),
    );

    expect(mockOpenBuySheet).not.toHaveBeenCalled();
  });

  it('does not open the buy sheet when the selected market is resolved', () => {
    const resolvedMarket = createMarket({ status: 'resolved' });
    mockUsePredictSeries.mockReturnValue({
      data: [resolvedMarket],
      isLoading: false,
    });

    renderCard(resolvedMarket);

    fireEvent.press(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON),
    );
    expect(mockOpenBuySheet).not.toHaveBeenCalled();
  });

  it('disables Up and Down buttons when the selected market is not open', () => {
    const closedMarket = createMarket({ status: 'closed' });
    mockUsePredictSeries.mockReturnValue({
      data: [closedMarket],
      isLoading: false,
    });

    renderCard(closedMarket);

    const upButton = screen.getByTestId(
      PredictCryptoUpDownMarketCardSelectorsIDs.UP_BUTTON,
    );
    const downButton = screen.getByTestId(
      PredictCryptoUpDownMarketCardSelectorsIDs.DOWN_BUTTON,
    );

    expect(upButton.props.accessibilityState?.disabled).toBe(true);
    expect(downButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders a fallback sparkline when price history is missing', () => {
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [],
      value: 0,
      loading: true,
      isLive: true,
      window: 300,
    });

    renderCard();

    expect(
      screen.getByTestId(PredictCryptoUpDownMarketCardSelectorsIDs.SPARKLINE),
    ).toBeOnTheScreen();
  });

  it('keeps the resolved market reference stable across series refetches that yield the same live market id', () => {
    const market = createMarket({ id: 'market-live' });
    mockUsePredictSeries.mockReturnValue({
      data: [market],
      isLoading: false,
    });

    const { rerender } = renderCard(market);

    const firstResolved = mockUseCryptoUpDownChartData.mock.calls.at(-1)?.[0];
    expect(firstResolved?.id).toBe('market-live');

    mockUsePredictSeries.mockReturnValue({
      data: [{ ...market }],
      isLoading: false,
    });

    rerender(<PredictCryptoUpDownMarketCard market={market} />);

    const secondResolved = mockUseCryptoUpDownChartData.mock.calls.at(-1)?.[0];
    expect(secondResolved).toBe(firstResolved);
  });

  it('advances the resolved market when the series refetch yields a different live market id', () => {
    const market = createMarket({ id: 'market-live' });
    mockUsePredictSeries.mockReturnValue({
      data: [market],
      isLoading: false,
    });

    const { rerender } = renderCard(market);

    const firstResolved = mockUseCryptoUpDownChartData.mock.calls.at(-1)?.[0];
    expect(firstResolved?.id).toBe('market-live');

    const nextLiveMarket = createMarket({ id: 'market-next' });
    mockUsePredictSeries.mockReturnValue({
      data: [nextLiveMarket],
      isLoading: false,
    });

    rerender(<PredictCryptoUpDownMarketCard market={market} />);

    const secondResolved = mockUseCryptoUpDownChartData.mock.calls.at(-1)?.[0];
    expect(secondResolved).not.toBe(firstResolved);
    expect(secondResolved?.id).toBe('market-next');
  });
});
