import React from 'react';
import { act } from '@testing-library/react-native';
import MarketListContent from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictCategory, PredictMarket, Recurrence } from '../../types';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import { strings } from '../../../../../../locales/i18n';
import { getPredictMarketListSelector } from '../../../../../../tests/selectors/Predict/Predict.selectors';

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

jest.mock('../PredictOffline', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return jest.fn(({ onRetry }) => (
    <View testID="predict-error-state">
      <Text>Unable to connect to predictions</Text>
      <Text>
        Prediction markets are temporarily offline. Please check you have a
        stable connection and try again.
      </Text>
      <TouchableOpacity testID="retry-button" onPress={onRetry}>
        <Text>Retry</Text>
      </TouchableOpacity>
    </View>
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
  category: 'crypto',
  tags: ['trending'],
  outcomes: [
    {
      id: 'outcome-1',
      marketId: 'test-market-1',
      providerId: 'test-provider',
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
  liquidity: 1000000,
  volume: 1000000,
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
  category: 'crypto',
  tags: ['trending'],
  outcomes: [
    {
      id: 'outcome-3',
      marketId: 'test-market-3',
      providerId: 'test-provider',
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
      providerId: 'test-provider',
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
  liquidity: 1000000,
  volume: 1000000,
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

// Helper function to set up test environment
function setupMarketListContentTest(
  marketDataOverrides = {},
  category: PredictCategory = 'trending',
  q?: string,
) {
  jest.clearAllMocks();
  mockUsePredictMarketData.mockReturnValue({
    ...defaultMockReturn,
    ...marketDataOverrides,
  });
  return renderWithProvider(<MarketListContent category={category} q={q} />, {
    state: initialState,
  });
}

describe('MarketListContent', () => {
  describe('Loading States', () => {
    it('renders loading skeleton when isFetching is true', () => {
      const { getByTestId } = setupMarketListContentTest({
        isFetching: true,
      });

      // Check for skeleton components in loading state
      expect(getByTestId('skeleton-loading-1')).toBeOnTheScreen();
      expect(getByTestId('skeleton-loading-2')).toBeOnTheScreen();
    });

    it('renders footer loading skeleton when isFetchingMore is true', () => {
      const { getByTestId } = setupMarketListContentTest({
        marketData: [mockPredictMarket],
        isFetchingMore: true,
      });

      // The footer skeleton should be rendered when fetching more
      expect(getByTestId('skeleton-footer-1')).toBeOnTheScreen();
      expect(getByTestId('skeleton-footer-2')).toBeOnTheScreen();
    });
  });

  describe('Error States', () => {
    it('renders error state when there is an error', () => {
      const { getByText, getByTestId } = setupMarketListContentTest({
        error: 'Failed to fetch markets',
      });

      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(getByText('Unable to connect to predictions')).toBeOnTheScreen();
      expect(
        getByText(
          'Prediction markets are temporarily offline. Please check you have a stable connection and try again.',
        ),
      ).toBeOnTheScreen();
    });

    it('calls refetch when retry button is pressed', async () => {
      const { getByTestId } = setupMarketListContentTest({
        error: 'Failed to fetch markets',
      });

      const retryButton = getByTestId('retry-button');

      await act(async () => {
        await retryButton.props.onPress();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty States', () => {
    it('renders empty state when no markets are available', () => {
      const { getByText } = setupMarketListContentTest(
        { marketData: [] },
        'sports',
      );

      expect(getByText('No sports markets available')).toBeOnTheScreen();
    });

    it('renders empty state when marketData is null', () => {
      const { getByText } = setupMarketListContentTest(
        { marketData: null as unknown as PredictMarket[] },
        'crypto',
      );

      expect(getByText('No crypto markets available')).toBeOnTheScreen();
    });

    it('renders search empty state when query has no matching markets', () => {
      const searchTerm = 'bitcoin';
      const expectedEmptySearchText = strings(
        'predict.search_no_markets_found',
        { q: searchTerm },
      );

      const { getByText, getByTestId } = setupMarketListContentTest(
        { marketData: [] },
        'crypto',
        searchTerm,
      );

      expect(
        getByTestId(getPredictMarketListSelector.emptyState()),
      ).toBeOnTheScreen();
      expect(getByTestId('icon')).toBeOnTheScreen();
      expect(getByText(expectedEmptySearchText)).toBeOnTheScreen();
    });
  });

  describe('Data Rendering', () => {
    it('renders PredictMarket component for single outcome market', () => {
      const { getByTestId } = setupMarketListContentTest({
        marketData: [mockPredictMarket],
      });

      expect(getByTestId('predict-market-test-market-1')).toBeOnTheScreen();
    });

    it('renders PredictMarket component for multiple outcome market', () => {
      const { getByTestId } = setupMarketListContentTest(
        { marketData: [mockPredictMarketMultiple] },
        'crypto',
      );

      expect(getByTestId('predict-market-test-market-3')).toBeOnTheScreen();
    });

    it('renders PredictMarket components for all markets regardless of outcome count', () => {
      const { getByTestId } = setupMarketListContentTest({
        marketData: [mockPredictMarket, mockPredictMarketMultiple],
      });

      expect(getByTestId('predict-market-test-market-1')).toBeOnTheScreen();
      expect(getByTestId('predict-market-test-market-3')).toBeOnTheScreen();
    });
  });

  describe('Hook Integration', () => {
    it('calls usePredictMarketData with correct parameters', () => {
      const categories: PredictCategory[] = [
        'trending',
        'new',
        'sports',
        'crypto',
        'politics',
      ];

      categories.forEach((category) => {
        setupMarketListContentTest({}, category);

        expect(mockUsePredictMarketData).toHaveBeenCalledWith({
          category,
          pageSize: 20,
        });
      });
    });
  });
});
