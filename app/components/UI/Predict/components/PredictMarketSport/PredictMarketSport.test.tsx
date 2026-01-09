import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Recurrence, PredictMarket as PredictMarketType } from '../../types';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarketSport from './';
import Routes from '../../../../../constants/navigation/Routes';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock TrendingFeedSessionManager
const mockIsFromTrending = jest.fn();
jest.mock('../../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      get isFromTrending() {
        return mockIsFromTrending();
      },
    }),
  },
}));

const mockMarket: PredictMarketType = {
  id: 'test-market-sport-1',
  providerId: 'test-provider',
  slug: 'super-bowl-lx-2026',
  title: 'Super Bowl LX (2026)',
  description: 'Super Bowl LX matchup between SEA and DEN',
  image: 'https://example.com/superbowl.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['NFL', 'Super Bowl'],
  outcomes: [],
  liquidity: 1000000,
  volume: 1000000,
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictMarketSport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFromTrending.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders market information correctly', () => {
    const { getByText, getAllByText } = renderWithProvider(
      <PredictMarketSport market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
    expect(getAllByText('SEA')[0]).toBeOnTheScreen();
    expect(getAllByText('DEN')[0]).toBeOnTheScreen();
    expect(getByText('Sun, Feb 8')).toBeOnTheScreen();
    expect(getByText('3:30 PM')).toBeOnTheScreen();
  });

  it('renders team buttons with prices', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSport market={mockMarket} />,
      { state: initialState },
    );

    expect(getByText('SEA 77¢')).toBeOnTheScreen();
    expect(getByText('DEN 23¢')).toBeOnTheScreen();
  });

  it('navigates to market details when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSport market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: {
        marketId: mockMarket.id,
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        title: mockMarket.title,
        image: mockMarket.image,
      },
    });
  });

  it('uses default entry point when not specified', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSport market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        }),
      }),
    );
  });

  it('uses trending entry point when from trending feed', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSport
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.TRENDING,
        }),
      }),
    );
  });

  it('uses custom entry point when specified and not from trending', () => {
    mockIsFromTrending.mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSport
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS}
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        }),
      }),
    );
  });

  it('overrides custom entry point when from trending feed', () => {
    mockIsFromTrending.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <PredictMarketSport
        market={mockMarket}
        testID="sport-market-card"
        entryPoint={PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS}
      />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: expect.objectContaining({
          entryPoint: PredictEventValues.ENTRY_POINT.TRENDING,
        }),
      }),
    );
  });

  it('passes market data to navigation params', () => {
    const customMarket: PredictMarketType = {
      ...mockMarket,
      id: 'custom-market-id',
      title: 'Custom Super Bowl',
      image: 'https://example.com/custom.png',
    };

    const { getByTestId } = renderWithProvider(
      <PredictMarketSport market={customMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    const card = getByTestId('sport-market-card');
    fireEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PREDICT.ROOT,
      expect.objectContaining({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'custom-market-id',
          entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_FEED,
          title: 'Custom Super Bowl',
          image: 'https://example.com/custom.png',
        },
      }),
    );
  });

  it('renders without testID prop', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSport market={mockMarket} />,
      { state: initialState },
    );

    // Component should render successfully without testID
    expect(getByText('Super Bowl LX (2026)')).toBeOnTheScreen();
  });

  it('displays game time and date information', () => {
    const { getByText } = renderWithProvider(
      <PredictMarketSport market={mockMarket} />,
      { state: initialState },
    );

    // Verify date and time are displayed
    expect(getByText('Sun, Feb 8')).toBeOnTheScreen();
    expect(getByText('3:30 PM')).toBeOnTheScreen();
  });

  it('renders gradient background', () => {
    const { getByTestId } = renderWithProvider(
      <PredictMarketSport market={mockMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    // Component should render with gradient (LinearGradient is used)
    const card = getByTestId('sport-market-card');
    expect(card).toBeOnTheScreen();
  });

  it('handles market with empty image gracefully', () => {
    const noImageMarket: PredictMarketType = {
      ...mockMarket,
      image: '',
    };

    const { getByTestId } = renderWithProvider(
      <PredictMarketSport market={noImageMarket} testID="sport-market-card" />,
      { state: initialState },
    );

    // Should render without crashing
    expect(getByTestId('sport-market-card')).toBeOnTheScreen();
  });
});
