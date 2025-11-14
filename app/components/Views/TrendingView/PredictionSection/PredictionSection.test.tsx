import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import PredictionSection from './PredictionSection';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import {
  PredictMarket as PredictMarketType,
  Recurrence,
} from '../../../UI/Predict/types';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock dependencies
jest.mock('../../../UI/Predict/hooks/usePredictMarketData');
jest.mock('../../../UI/Predict/components/PredictMarket', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ market, testID }) => (
    <View testID={testID}>
      <Text>PredictMarket: {market.title}</Text>
    </View>
  ));
});
jest.mock('../../../UI/Predict/components/PredictMarketSkeleton', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ testID }) => (
    <View testID={testID}>
      <Text>Loading...</Text>
    </View>
  ));
});
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
  };
});

const mockUsePredictMarketData = usePredictMarketData as jest.MockedFunction<
  typeof usePredictMarketData
>;

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictionSection', () => {
  const createMockMarket = (id: string): PredictMarketType => ({
    id,
    providerId: 'test-provider',
    slug: `market-${id}`,
    title: `Market ${id}`,
    description: `Description for market ${id}`,
    image: `https://example.com/image-${id}.png`,
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: [],
    outcomes: [],
    liquidity: 10000,
    volume: 50000,
  });

  const mockMarketData: PredictMarketType[] = [
    createMockMarket('1'),
    createMockMarket('2'),
    createMockMarket('3'),
    createMockMarket('4'),
    createMockMarket('5'),
    createMockMarket('6'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loading state', () => {
    it('renders carousel with isLoading true when fetching data', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(getByTestId('prediction-carousel-flash-list')).toBeOnTheScreen();
    });

    it('renders pagination dots during loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(
        getByTestId('prediction-carousel-pagination-dot-0'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('prediction-carousel-pagination-dot-1'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('prediction-carousel-pagination-dot-2'),
      ).toBeOnTheScreen();
    });
  });

  describe('empty state', () => {
    it('renders nothing when not fetching and data is empty', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: false,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { toJSON } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(toJSON()).toBeNull();
    });
  });

  describe('carousel with data', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
      mockUsePredictMarketData.mockReturnValue({
        marketData: mockMarketData,
        isFetching: false,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });
    });

    it('renders carousel with market data', () => {
      const { getByTestId } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(getByTestId('prediction-carousel-flash-list')).toBeOnTheScreen();
    });

    it('renders pagination dots for market data', () => {
      const { getByTestId } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      // Should have pagination dots for all 6 markets
      expect(
        getByTestId('prediction-carousel-pagination-dot-0'),
      ).toBeOnTheScreen();
      expect(
        getByTestId('prediction-carousel-pagination-dot-5'),
      ).toBeOnTheScreen();
    });
  });

  describe('data fetching', () => {
    it('calls usePredictMarketData with correct parameters', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: mockMarketData,
        isFetching: false,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(mockUsePredictMarketData).toHaveBeenCalledWith({
        category: 'trending',
        pageSize: 6,
      });
    });
  });
});
