import React from 'react';
import MarketListContent from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictEvent, Market, MarketCategory } from '../../types';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';

// Mock animations to prevent act() warnings
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const actualAnimated = jest.requireActual(
    'react-native/Libraries/Animated/Animated',
  );
  return {
    ...actualAnimated,
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(),
    })),
  };
});

jest.mock('../../hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

const mockUsePredictMarketData = usePredictMarketData as jest.MockedFunction<
  typeof usePredictMarketData
>;

jest.mock('../PredictMarket', () => {
  const { View } = jest.requireActual('react-native');
  return jest.fn(() => <View testID="predict-market">PredictMarket</View>);
});

jest.mock('../PredictMarketMultiple', () => {
  const { View } = jest.requireActual('react-native');
  return jest.fn(() => (
    <View testID="predict-market-multiple">PredictMarketMultiple</View>
  ));
});

// Simple FlashList mock
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
  };
});

const mockMarket: Market = {
  id: 'test-market-1',
  question: 'Will Bitcoin reach $150,000 by end of year?',
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.65", "0.35"]',
  image: 'https://example.com/bitcoin.png',
  volume: '1000000',
  providerId: 'test-provider',
  status: 'open',
  conditionId: 'test-condition-id',
  clobTokenIds: '["1", "2"]',
  tokenIds: ['1', '2'],
};

const mockMarket2: Market = {
  id: 'test-market-2',
  question: 'Will Ethereum reach $10,000 by end of year?',
  outcomes: '["Yes", "No"]',
  outcomePrices: '["0.45", "0.55"]',
  image: 'https://example.com/ethereum.png',
  volume: '500000',
  providerId: 'test-provider',
  status: 'open',
};

const mockPredictEvent: PredictEvent = {
  id: 'test-event-1',
  title: 'Bitcoin Prediction Event',
  markets: [mockMarket],
  series: [
    {
      recurrence: 'weekly',
    },
  ],
};

const mockPredictEventMultiple: PredictEvent = {
  id: 'test-event-2',
  title: 'Crypto Predictions Event',
  markets: [mockMarket, mockMarket2],
  series: [
    {
      recurrence: 'monthly',
    },
  ],
};

const mockRefetch = jest.fn();
const mockFetchMore = jest.fn();

const defaultMockReturn = {
  marketData: [],
  isFetching: false,
  isFetchingMore: false,
  error: null,
  hasMore: false,
  refetch: mockRefetch,
  fetchMore: mockFetchMore,
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('MarketListContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue(defaultMockReturn);
  });

  describe('Loading States', () => {
    it('should render loading skeleton when isFetching is true', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        isFetching: true,
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      // Check for skeleton components in loading state
      expect(getByTestId('skeleton-loading-1')).toBeOnTheScreen();
      expect(getByTestId('skeleton-loading-2')).toBeOnTheScreen();
    });

    it('should render footer loading skeleton when isFetchingMore is true', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictEvent],
        isFetchingMore: true,
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      // The footer skeleton should be rendered when fetching more
      expect(getByTestId('skeleton-footer-1')).toBeOnTheScreen();
      expect(getByTestId('skeleton-footer-2')).toBeOnTheScreen();
    });
  });

  describe('Error States', () => {
    it('should render error state when there is an error', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to fetch markets',
      });

      const { getByText } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      expect(getByText('Error: Failed to fetch markets')).toBeOnTheScreen();
    });
  });

  describe('Empty States', () => {
    it('should render empty state when no markets are available', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [],
      });

      const { getByText } = renderWithProvider(
        <MarketListContent category="sports" />,
        { state: initialState },
      );

      expect(getByText('No sports markets available')).toBeOnTheScreen();
    });

    it('should render empty state when marketData is null', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: null as unknown as PredictEvent[],
      });

      const { getByText } = renderWithProvider(
        <MarketListContent category="crypto" />,
        { state: initialState },
      );

      expect(getByText('No crypto markets available')).toBeOnTheScreen();
    });
  });

  describe('Data Rendering', () => {
    it('should render single market when event has one market', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictEvent],
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      expect(getByTestId('predict-market')).toBeOnTheScreen();
    });

    it('should render multiple markets when event has multiple markets', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictEventMultiple],
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="crypto" />,
        { state: initialState },
      );

      expect(getByTestId('predict-market-multiple')).toBeOnTheScreen();
    });

    it('should render multiple events with mixed market types', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictEvent, mockPredictEventMultiple],
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      expect(getByTestId('predict-market')).toBeOnTheScreen();
      expect(getByTestId('predict-market-multiple')).toBeOnTheScreen();
    });
  });

  describe('Hook Integration', () => {
    it('should call usePredictMarketData with correct parameters', () => {
      const categories: MarketCategory[] = [
        'trending',
        'new',
        'sports',
        'crypto',
        'politics',
      ];

      categories.forEach((category) => {
        renderWithProvider(<MarketListContent category={category} />, {
          state: initialState,
        });

        expect(mockUsePredictMarketData).toHaveBeenCalledWith({
          category,
          pageSize: 20,
        });
      });
    });
  });
});
