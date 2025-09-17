import React from 'react';
import MarketListContent from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictCategory, PredictMarket, Recurrence } from '../../types';
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
  return jest.fn(({ market }) => (
    <View testID={`predict-market-${market.id}`}>PredictMarket</View>
  ));
});

// Simple FlashList mock
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
  };
});

const mockPredictMarket: PredictMarket = {
  id: 'test-market-1',
  providerId: 'test-provider',
  slug: 'bitcoin-prediction',
  title: 'Will Bitcoin reach $150,000 by end of year?',
  description: 'Bitcoin price prediction market',
  image: 'https://example.com/bitcoin.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  categories: ['crypto', 'trending'],
  outcomes: [
    {
      id: 'outcome-1',
      marketId: 'test-market-1',
      title: 'Yes',
      description: 'Bitcoin will reach $150,000',
      image: 'https://example.com/bitcoin.png',
      status: 'open',
      tokens: [
        {
          id: '1',
          title: 'Yes Token',
          price: 0.65,
        },
      ],
      volume: 1000000,
      groupItemTitle: 'Bitcoin Prediction',
    },
  ],
};

const mockPredictMarketMultiple: PredictMarket = {
  id: 'test-market-3',
  providerId: 'test-provider',
  slug: 'crypto-predictions',
  title: 'Crypto Predictions Event',
  description: 'Multiple crypto prediction markets',
  image: 'https://example.com/crypto.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  categories: ['crypto', 'trending'],
  outcomes: [
    {
      id: 'outcome-3',
      marketId: 'test-market-3',
      title: 'Bitcoin Yes',
      description: 'Bitcoin will reach $150,000',
      image: 'https://example.com/bitcoin.png',
      status: 'open',
      tokens: [
        {
          id: '3',
          title: 'Bitcoin Yes Token',
          price: 0.65,
        },
      ],
      volume: 1000000,
      groupItemTitle: 'Bitcoin Prediction',
    },
    {
      id: 'outcome-4',
      marketId: 'test-market-3',
      title: 'Ethereum Yes',
      description: 'Ethereum will reach $10,000',
      image: 'https://example.com/ethereum.png',
      status: 'open',
      tokens: [
        {
          id: '4',
          title: 'Ethereum Yes Token',
          price: 0.45,
        },
      ],
      volume: 500000,
      groupItemTitle: 'Ethereum Prediction',
    },
  ],
};

const mockRefetch = jest.fn();
const mockFetchMore = jest.fn();

const defaultMockReturn = {
  marketData: [] as PredictMarket[],
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
        marketData: [mockPredictMarket],
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
        marketData: null as unknown as PredictMarket[],
      });

      const { getByText } = renderWithProvider(
        <MarketListContent category="crypto" />,
        { state: initialState },
      );

      expect(getByText('No crypto markets available')).toBeOnTheScreen();
    });
  });

  describe('Data Rendering', () => {
    it('should render PredictMarket component for single outcome market', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictMarket],
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      expect(getByTestId('predict-market-test-market-1')).toBeOnTheScreen();
    });

    it('should render PredictMarket component for multiple outcome market', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictMarketMultiple],
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="crypto" />,
        { state: initialState },
      );

      expect(getByTestId('predict-market-test-market-3')).toBeOnTheScreen();
    });

    it('should render PredictMarket components for all markets regardless of outcome count', () => {
      mockUsePredictMarketData.mockReturnValue({
        ...defaultMockReturn,
        marketData: [mockPredictMarket, mockPredictMarketMultiple],
      });

      const { getByTestId } = renderWithProvider(
        <MarketListContent category="trending" />,
        { state: initialState },
      );

      expect(getByTestId('predict-market-test-market-1')).toBeOnTheScreen();
      expect(getByTestId('predict-market-test-market-3')).toBeOnTheScreen();
    });
  });

  describe('Hook Integration', () => {
    it('should call usePredictMarketData with correct parameters', () => {
      const categories: PredictCategory[] = [
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
