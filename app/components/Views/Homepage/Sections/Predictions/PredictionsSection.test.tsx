import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictionsSection from './PredictionsSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
}));

// Mock the hooks
jest.mock('./hooks', () => ({
  usePredictMarketsForHomepage: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
  usePredictPositionsForHomepage: jest.fn(() => ({
    positions: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
}));

const mockUsePredictMarketsForHomepage =
  jest.requireMock('./hooks').usePredictMarketsForHomepage;
const mockUsePredictPositionsForHomepage =
  jest.requireMock('./hooks').usePredictPositionsForHomepage;

describe('PredictionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return value to default (true) to ensure test isolation
    jest
      .requireMock('../../../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(true);

    // Reset hooks to default state
    mockUsePredictMarketsForHomepage.mockReturnValue({
      markets: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUsePredictPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('renders section title when enabled', () => {
    renderWithProvider(<PredictionsSection />);

    expect(screen.getByText('Predictions')).toBeOnTheScreen();
  });

  it('navigates to predictions market list on title press', () => {
    renderWithProvider(<PredictionsSection />);

    fireEvent.press(screen.getByText('Predictions'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  });

  it('returns null when predict is disabled', () => {
    jest
      .requireMock('../../../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(<PredictionsSection />);

    expect(toJSON()).toBeNull();
  });

  describe('when user has positions', () => {
    const mockPositions = [
      {
        outcomeId: 'outcome-1',
        outcomeIndex: 0,
        marketId: 'market-1',
        title: 'Test Position 1',
        outcome: 'Yes',
        icon: 'https://example.com/icon1.png',
        initialValue: 10,
        currentValue: 12,
        size: 15,
        percentPnl: 20,
      },
      {
        outcomeId: 'outcome-2',
        outcomeIndex: 0,
        marketId: 'market-2',
        title: 'Test Position 2',
        outcome: 'No',
        icon: 'https://example.com/icon2.png',
        initialValue: 5,
        currentValue: 3,
        size: 8,
        percentPnl: -40,
      },
    ];

    it('renders positions when user has them', async () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: mockPositions,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PredictionsSection />);

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
        expect(screen.getByText('Test Position 2')).toBeOnTheScreen();
      });
    });

    it('shows position skeletons when loading positions', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PredictionsSection />);

      // When loading positions, should not show markets
      expect(screen.queryByText('Test Position 1')).not.toBeOnTheScreen();
    });
  });

  describe('when user has no positions', () => {
    const mockMarkets = [
      {
        id: 'market-1',
        title: 'Will ETH reach $5000?',
        endDate: '2026-03-01',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            image: 'https://example.com/yes.png',
            tokens: [{ title: 'Yes', price: 0.55 }],
          },
          {
            id: 'outcome-2',
            title: 'No',
            image: 'https://example.com/no.png',
            tokens: [{ title: 'No', price: 0.45 }],
          },
        ],
      },
    ];

    it('renders trending markets when user has no positions', async () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PredictionsSection />);

      await waitFor(() => {
        expect(screen.getByText('Will ETH reach $5000?')).toBeOnTheScreen();
      });
    });

    it('shows market skeletons when loading markets', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PredictionsSection />);

      // Should still show the title
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });
  });

  describe('refresh functionality', () => {
    it('refreshes only markets when user has no positions', async () => {
      const mockRefreshPositions = jest.fn();
      const mockRefreshMarkets = jest.fn();

      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(<PredictionsSection ref={ref} />);

      await ref.current?.refresh();

      expect(mockRefreshPositions).not.toHaveBeenCalled();
      expect(mockRefreshMarkets).toHaveBeenCalled();
    });

    it('refreshes both positions and markets when user has positions', async () => {
      const mockRefreshPositions = jest.fn();
      const mockRefreshMarkets = jest.fn();

      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [
          {
            outcomeId: 'outcome-1',
            outcomeIndex: 0,
            marketId: 'market-1',
            title: 'Test Position',
            outcome: 'Yes',
            icon: 'https://example.com/icon.png',
            initialValue: 10,
            currentValue: 12,
            size: 15,
            percentPnl: 20,
          },
        ],
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(<PredictionsSection ref={ref} />);

      await ref.current?.refresh();

      expect(mockRefreshPositions).toHaveBeenCalled();
      expect(mockRefreshMarkets).toHaveBeenCalled();
    });
  });
});
