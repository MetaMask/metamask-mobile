import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictMarketSportCardWrapper from './PredictMarketSportCardWrapper';
import { PredictEventValues } from '../../constants/eventNames';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { Recurrence, PredictMarket as PredictMarketType } from '../../types';

jest.mock('../../hooks/usePredictMarket');
const mockUsePredictMarket = jest.mocked(usePredictMarket);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      get isFromTrending() {
        return false;
      },
    }),
  },
}));

jest.mock('../PredictSportScoreboard/PredictSportScoreboard', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictSportScoreboard({
      testID,
    }: {
      testID?: string;
    }) {
      return (
        <View testID={testID ?? 'mock-scoreboard'}>
          <Text>Mock Scoreboard</Text>
        </View>
      );
    },
  };
});

jest.mock('../PredictSportCardFooter', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    PredictSportCardFooter: function MockPredictSportCardFooter({
      testID,
    }: {
      testID?: string;
    }) {
      return (
        <View testID={testID ?? 'mock-footer'}>
          <Text>Mock Footer</Text>
        </View>
      );
    },
  };
});

const mockMarket: PredictMarketType = {
  id: 'test-market-id',
  providerId: 'test-provider',
  slug: 'super-bowl-lix',
  title: 'Super Bowl LIX',
  description: 'Who will win Super Bowl LIX?',
  image: 'https://example.com/superbowl.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['NFL', 'Super Bowl'],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'test-provider',
      marketId: 'test-market-id',
      title: 'Team A',
      description: 'Team A wins',
      image: '',
      status: 'open',
      tokens: [{ id: 'token-1', title: 'Yes', price: 0.55 }],
      volume: 1000000,
      groupItemTitle: 'Team A',
    },
  ],
  liquidity: 5000000,
  volume: 10000000,
  game: {
    id: 'game-1',
    startTime: '2025-02-09T23:30:00Z',
    status: 'scheduled',
    league: 'nfl',
    elapsed: null,
    period: null,
    score: null,
    awayTeam: {
      id: 'team-a',
      name: 'Team A',
      logo: '',
      abbreviation: 'TA',
      color: '#FF0000',
      alias: 'Team A',
    },
    homeTeam: {
      id: 'team-b',
      name: 'Team B',
      logo: '',
      abbreviation: 'TB',
      color: '#0000FF',
      alias: 'Team B',
    },
  },
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketSportCardWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarket.mockReturnValue({
      market: null,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loading state', () => {
    it('returns null when fetching market data', () => {
      mockUsePredictMarket.mockReturnValue({
        market: null,
        isFetching: true,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictMarketSportCardWrapper marketId="test-market-id" />,
        { state: initialState },
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('error state', () => {
    it('returns null when error occurs', () => {
      mockUsePredictMarket.mockReturnValue({
        market: null,
        isFetching: false,
        error: 'Failed to fetch market',
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictMarketSportCardWrapper marketId="test-market-id" />,
        { state: initialState },
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('no market data', () => {
    it('returns null when market is null', () => {
      mockUsePredictMarket.mockReturnValue({
        market: null,
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictMarketSportCardWrapper marketId="test-market-id" />,
        { state: initialState },
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('successful render', () => {
    beforeEach(() => {
      mockUsePredictMarket.mockReturnValue({
        market: mockMarket,
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });
    });

    it('renders PredictMarketSportCard when market data is available', () => {
      const { getByText } = renderWithProvider(
        <PredictMarketSportCardWrapper marketId="test-market-id" />,
        { state: initialState },
      );

      expect(getByText('Super Bowl LIX')).toBeOnTheScreen();
    });

    it('calls usePredictMarket with correct marketId', () => {
      renderWithProvider(
        <PredictMarketSportCardWrapper marketId="custom-market-id" />,
        { state: initialState },
      );

      expect(mockUsePredictMarket).toHaveBeenCalledWith({
        id: 'custom-market-id',
        enabled: true,
      });
    });

    it('passes testID to PredictMarketSportCard', () => {
      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCardWrapper
          marketId="test-market-id"
          testID="wrapper-test-id"
        />,
        { state: initialState },
      );

      expect(getByTestId('wrapper-test-id')).toBeOnTheScreen();
    });

    it('passes entryPoint to PredictMarketSportCard', () => {
      const { getByTestId } = renderWithProvider(
        <PredictMarketSportCardWrapper
          marketId="test-market-id"
          testID="wrapper-test-id"
          entryPoint={PredictEventValues.ENTRY_POINT.CAROUSEL}
        />,
        { state: initialState },
      );

      expect(getByTestId('wrapper-test-id')).toBeOnTheScreen();
    });

    it('renders without Animated.View wrapper', () => {
      const { toJSON } = renderWithProvider(
        <PredictMarketSportCardWrapper marketId="test-market-id" />,
        { state: initialState },
      );

      const tree = toJSON();
      expect(tree).not.toBeNull();
    });
  });

  describe('hook enabled state', () => {
    it('disables hook when marketId is empty string', () => {
      renderWithProvider(<PredictMarketSportCardWrapper marketId="" />, {
        state: initialState,
      });

      expect(mockUsePredictMarket).toHaveBeenCalledWith({
        id: '',
        enabled: false,
      });
    });

    it('enables hook when marketId is provided', () => {
      renderWithProvider(
        <PredictMarketSportCardWrapper marketId="valid-market-id" />,
        { state: initialState },
      );

      expect(mockUsePredictMarket).toHaveBeenCalledWith({
        id: 'valid-market-id',
        enabled: true,
      });
    });
  });
});
