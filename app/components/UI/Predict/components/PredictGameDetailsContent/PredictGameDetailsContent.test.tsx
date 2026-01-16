import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictGameDetailsContent from './PredictGameDetailsContent';
import { PredictMarket, PredictMarketStatus } from '../../types';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) => {
    const { View } = jest.requireActual('react-native');
    return <View {...props}>{children}</View>;
  },
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

jest.mock('../PredictShareButton/PredictShareButton', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictShareButton({ marketId }: { marketId?: string }) {
    return (
      <View
        testID="predict-share-button"
        accessibilityHint={`marketId:${marketId ?? 'undefined'}`}
      />
    );
  };
});

jest.mock('../PredictGameDetailsFooter', () => ({
  PredictGameDetailsFooter: function MockPredictGameDetailsFooter({
    testID,
    onInfoPress,
  }: {
    testID?: string;
    onInfoPress?: () => void;
  }) {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return (
      <View testID={testID ?? 'predict-game-details-footer'}>
        <Pressable testID="mock-info-button" onPress={onInfoPress}>
          <Text>Info</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('../PredictGameDetailsFooter/PredictGameAboutSheet', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(() => (
      <View testID="predict-game-about-sheet">About Sheet</View>
    )),
  };
});

jest.mock('../PredictSportTeamGradient', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictSportTeamGradient({
    children,
    testID,
    awayColor,
    homeColor,
  }: {
    children: React.ReactNode;
    testID?: string;
    awayColor?: string;
    homeColor?: string;
  }) {
    return (
      <View
        testID={testID}
        accessibilityHint={`away:${awayColor ?? 'undefined'},home:${homeColor ?? 'undefined'}`}
      >
        {children}
      </View>
    );
  };
});

jest.mock('../PredictSportScoreboard', () => {
  const { View } = jest.requireActual('react-native');
  const actualModule = jest.requireActual(
    '../PredictSportScoreboard/PredictSportScoreboard.types',
  );
  return {
    __esModule: true,
    default: function MockPredictSportScoreboard({
      testID,
      gameState,
      awayTeam,
      homeTeam,
    }: {
      testID?: string;
      gameState?: string;
      awayTeam?: { abbreviation: string };
      homeTeam?: { abbreviation: string };
    }) {
      return (
        <View
          testID={testID}
          accessibilityHint={`state:${gameState ?? 'undefined'},away:${awayTeam?.abbreviation ?? 'undefined'},home:${homeTeam?.abbreviation ?? 'undefined'}`}
        />
      );
    },
    GameState: actualModule.GameState,
    Possession: actualModule.Possession,
    Winner: actualModule.Winner,
  };
});

jest.mock('../PredictGameChart', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictGameChart({
    testID,
    tokenIds,
  }: {
    testID?: string;
    tokenIds?: string[];
  }) {
    return (
      <View
        testID={testID}
        accessibilityHint={`tokens:${tokenIds?.join(',') ?? 'none'}`}
      />
    );
  };
});

jest.mock('../PredictPicks/PredictPicks', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictPicks({
    testID,
    market,
  }: {
    testID?: string;
    market?: { id: string };
  }) {
    return (
      <View
        testID={testID}
        accessibilityHint={`marketId:${market?.id ?? 'undefined'}`}
      />
    );
  };
});

const mockGetRefHandlers = jest.fn(() => ({
  onOpenBottomSheet: jest.fn(),
  onCloseBottomSheet: jest.fn(),
}));

jest.mock('../../hooks/usePredictBottomSheet', () => ({
  usePredictBottomSheet: () => ({
    sheetRef: { current: null },
    isVisible: false,
    handleSheetClosed: jest.fn(),
    getRefHandlers: mockGetRefHandlers,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockBaseGame = {
  id: 'game-123',
  homeTeam: {
    id: 'team-home',
    name: 'Team A',
    abbreviation: 'TA',
    color: '#FF0000',
    alias: 'Team A',
    logo: 'https://example.com/logo-a.png',
  },
  awayTeam: {
    id: 'team-away',
    name: 'Team B',
    abbreviation: 'TB',
    color: '#0000FF',
    alias: 'Team B',
    logo: 'https://example.com/logo-b.png',
  },
  startTime: '2024-12-31T20:00:00Z',
  status: 'scheduled' as const,
  league: 'nfl' as const,
  elapsed: null,
  period: null,
  score: null,
};

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id: 'test-market-id',
    title: 'Test Game Market',
    description: 'Test description',
    image: 'https://example.com/image.png',
    providerId: 'polymarket',
    status: PredictMarketStatus.OPEN,
    category: 'sports',
    tags: ['NFL'],
    outcomes: [
      {
        id: 'outcome-1',
        marketId: 'test-market-id',
        title: 'Team A',
        groupItemTitle: 'Team A',
        status: 'open',
        volume: 1000,
        tokens: [
          {
            id: 'token-1',
            title: 'Team A',
            price: 0.65,
          },
          {
            id: 'token-2',
            title: 'Team B',
            price: 0.35,
          },
        ],
      },
    ],
    endDate: '2024-12-31T23:59:59Z',
    game: mockBaseGame,
    ...overrides,
  }) as PredictMarket;

describe('PredictGameDetailsContent', () => {
  const mockOnBack = jest.fn();
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);
  const mockOnBetPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Header Rendering', () => {
    it('renders the back button', () => {
      const market = createMockMarket();

      const { getByRole } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(getByRole('button')).toBeOnTheScreen();
    });

    it('renders the market title', () => {
      const market = createMockMarket({ title: 'NFL Game: Team A vs Team B' });

      const { getByText } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(getByText('NFL Game: Team A vs Team B')).toBeOnTheScreen();
    });

    it('renders the share button with market id', () => {
      const market = createMockMarket({ id: 'game-market-123' });

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const shareButton = getByTestId('predict-share-button');

      expect(shareButton).toBeOnTheScreen();
      expect(shareButton.props.accessibilityHint).toBe(
        'marketId:game-market-123',
      );
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is pressed', () => {
      const market = createMockMarket();

      const { getByRole } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const backButton = getByRole('button');
      fireEvent.press(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh Control', () => {
    it('passes refreshing state to RefreshControl', () => {
      const market = createMockMarket();

      const { UNSAFE_getByType } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing
        />,
      );

      const { ScrollView } = jest.requireActual('react-native');
      const scrollView = UNSAFE_getByType(ScrollView);

      expect(scrollView.props.refreshControl.props.refreshing).toBe(true);
    });

    it('passes onRefresh callback to RefreshControl', () => {
      const market = createMockMarket();

      const { UNSAFE_getByType } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const { ScrollView } = jest.requireActual('react-native');
      const scrollView = UNSAFE_getByType(ScrollView);

      expect(scrollView.props.refreshControl.props.onRefresh).toBe(
        mockOnRefresh,
      );
    });
  });

  describe('Footer', () => {
    it('renders the footer component', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(getByTestId('predict-game-details-footer')).toBeOnTheScreen();
    });

    it('passes onInfoPress handler to footer', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const infoButton = getByTestId('mock-info-button');

      expect(infoButton).toBeOnTheScreen();
    });
  });

  describe('About Sheet', () => {
    it('does not render about sheet when isVisible is false', () => {
      const market = createMockMarket();

      const { queryByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(queryByTestId('predict-game-about-sheet')).toBeNull();
    });
  });

  describe('Guard Conditions', () => {
    it('returns null when market.game is undefined', () => {
      const market = createMockMarket({ game: undefined });

      const { toJSON } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('returns null when market has no outcomes', () => {
      const market = createMockMarket({ outcomes: [] });

      const { toJSON } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('Gradient Integration', () => {
    it('renders gradient with team colors', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const gradient = getByTestId('game-details-gradient');

      expect(gradient).toBeOnTheScreen();
      expect(gradient.props.accessibilityHint).toBe(
        'away:#0000FF,home:#FF0000',
      );
    });
  });

  describe('Scoreboard Integration', () => {
    it('renders scoreboard with team data', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const scoreboard = getByTestId('game-scoreboard');

      expect(scoreboard).toBeOnTheScreen();
      expect(scoreboard.props.accessibilityHint).toContain('away:TB');
      expect(scoreboard.props.accessibilityHint).toContain('home:TA');
    });

    it('renders scoreboard with PreGame state for scheduled games', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const scoreboard = getByTestId('game-scoreboard');

      expect(scoreboard.props.accessibilityHint).toContain('state:PreGame');
    });

    it('renders scoreboard with InProgress state for ongoing games', () => {
      const market = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'ongoing',
          period: 'Q2',
          elapsed: '5:30',
          score: { away: 7, home: 14, raw: '7-14' },
        },
      });

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const scoreboard = getByTestId('game-scoreboard');

      expect(scoreboard.props.accessibilityHint).toContain('state:InProgress');
    });

    it('renders scoreboard with Final state for ended games', () => {
      const market = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'ended',
          period: 'FT',
          score: { away: 21, home: 28, raw: '21-28' },
        },
      });

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const scoreboard = getByTestId('game-scoreboard');

      expect(scoreboard.props.accessibilityHint).toContain('state:Final');
    });

    it('renders scoreboard with Halftime state when period is HT', () => {
      const market = createMockMarket({
        game: {
          ...mockBaseGame,
          status: 'ongoing',
          period: 'HT',
          score: { away: 10, home: 7, raw: '10-7' },
        },
      });

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const scoreboard = getByTestId('game-scoreboard');

      expect(scoreboard.props.accessibilityHint).toContain('state:Halftime');
    });
  });

  describe('Chart Integration', () => {
    it('renders chart with token IDs when two tokens exist', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const chart = getByTestId('game-chart');

      expect(chart).toBeOnTheScreen();
      expect(chart.props.accessibilityHint).toBe('tokens:token-1,token-2');
    });

    it('does not render chart when fewer than two tokens exist', () => {
      const market = createMockMarket({
        outcomes: [
          {
            id: 'outcome-1',
            marketId: 'test-market-id',
            title: 'Team A',
            groupItemTitle: 'Team A',
            status: 'open',
            volume: 1000,
            providerId: 'polymarket',
            description: '',
            image: '',
            tokens: [{ id: 'token-1', title: 'Team A', price: 0.65 }],
          },
        ],
      });

      const { queryByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      expect(queryByTestId('game-chart')).toBeNull();
    });
  });

  describe('Picks Integration', () => {
    it('renders picks component with market', () => {
      const market = createMockMarket();

      const { getByTestId } = render(
        <PredictGameDetailsContent
          market={market}
          onBack={mockOnBack}
          onRefresh={mockOnRefresh}
          onBetPress={mockOnBetPress}
          refreshing={false}
        />,
      );

      const picks = getByTestId('game-picks');

      expect(picks).toBeOnTheScreen();
      expect(picks.props.accessibilityHint).toBe('marketId:test-market-id');
    });
  });

  it('matches snapshot', () => {
    const market = createMockMarket();

    const tree = render(
      <PredictGameDetailsContent
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        onBetPress={mockOnBetPress}
        refreshing={false}
      />,
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });
});
