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
import PredictCryptoUpDownMarketCard from './PredictCryptoUpDownMarketCard';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';

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

const renderCard = (market = createMarket()) =>
  renderWithProvider(<PredictCryptoUpDownMarketCard market={market} />, {
    state: initialState,
  });

describe('PredictCryptoUpDownMarketCard', () => {
  const mockUsePredictSeries = usePredictSeries as jest.Mock;
  const mockUseLiveMarketPrices = useLiveMarketPrices as jest.Mock;
  const mockUseCryptoUpDownChartData = useCryptoUpDownChartData as jest.Mock;
  const mockUseCryptoTargetPrice = useCryptoTargetPrice as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        title: 'BTC Up or Down - 5 Minutes',
        image: 'https://example.com/btc.png',
      },
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
});
