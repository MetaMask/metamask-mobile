import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import PredictionSection from './PredictionSection';
import { usePredictMarketData } from '../../../UI/Predict/hooks/usePredictMarketData';
import Routes from '../../../../constants/navigation/Routes';
import {
  PredictMarket as PredictMarketType,
  Recurrence,
} from '../../../UI/Predict/types';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock dependencies
jest.mock('../../../UI/Predict/hooks/usePredictMarketData');
jest.mock('../../../UI/Predict/components/PredictMarket', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ market, testID }) => (
    <View accessibilityRole="none" accessible={false} testID={testID}>
      <Text>PredictMarket: {market.title}</Text>
    </View>
  ));
});
jest.mock('../../../UI/Predict/components/PredictMarketSkeleton', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ testID }) => (
    <View accessibilityRole="none" accessible={false} testID={testID}>
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
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton loaders when fetching data', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByText, getAllByTestId } = renderWithProvider(
        <PredictionSection />,
        { state: initialState },
      );

      expect(getByText('Predictions')).toBeOnTheScreen();
      expect(getByText('View all')).toBeOnTheScreen();
      expect(
        getAllByTestId('prediction-carousel-skeleton').length,
      ).toBeGreaterThan(0);
    });

    it('renders header with view all button during loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByText } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(getByText('Predictions')).toBeOnTheScreen();
      expect(getByText('View all')).toBeOnTheScreen();
    });

    it('navigates to market list when view all is pressed during loading', () => {
      mockUsePredictMarketData.mockReturnValue({
        marketData: [],
        isFetching: true,
        isFetchingMore: false,
        error: null,
        hasMore: false,
        refetch: jest.fn(),
        fetchMore: jest.fn(),
      });

      const { getByText } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      fireEvent.press(getByText('View all'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
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

    it('renders section header with title and view all button', () => {
      const { getByText } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      expect(getByText('Predictions')).toBeOnTheScreen();
      expect(getByText('View all')).toBeOnTheScreen();
    });
  });

  describe('view all button', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks();
      mockNavigate.mockClear();
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

    it('navigates to market list when view all button is pressed', () => {
      const { getByText } = renderWithProvider(<PredictionSection />, {
        state: initialState,
      });

      fireEvent.press(getByText('View all'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
      });
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
