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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

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
        ],
      },
    ],
    endDate: '2024-12-31T23:59:59Z',
    game: {
      homeTeam: {
        name: 'Team A',
        abbreviation: 'TA',
      },
      awayTeam: {
        name: 'Team B',
        abbreviation: 'TB',
      },
      startTime: '2024-12-31T20:00:00Z',
      status: 'scheduled',
    },
    ...overrides,
  }) as PredictMarket;

describe('PredictGameDetailsContent', () => {
  const mockOnBack = jest.fn();
  const mockOnRefresh = jest.fn().mockResolvedValue(undefined);

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

  it('matches snapshot', () => {
    const market = createMockMarket();

    const tree = render(
      <PredictGameDetailsContent
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });
});
