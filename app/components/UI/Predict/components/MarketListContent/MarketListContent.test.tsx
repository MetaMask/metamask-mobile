import React from 'react';
import MarketListContent from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictEvent, Market } from '../../types';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';

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

const mockPredictEvent: PredictEvent = {
  id: 'test-event-1',
  title: 'Bitcoin Prediction Event',
  markets: [mockMarket],
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('MarketListContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render error state when there is an error', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: null,
      isLoading: false,
      error: 'Failed to fetch markets',
      refetch: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <MarketListContent category="trending" />,
      { state: initialState },
    );

    expect(getByText('Error: Failed to fetch markets')).toBeOnTheScreen();
  });

  it('should render empty state when no markets are available', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <MarketListContent category="sports" />,
      { state: initialState },
    );

    expect(getByText('No sports markets available')).toBeOnTheScreen();
  });

  it('should render markets when data is available', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [mockPredictEvent],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(
      <MarketListContent category="trending" />,
      { state: initialState },
    );

    expect(getByTestId('predict-market')).toBeOnTheScreen();
  });

  it('should render multiple markets when event has multiple markets', () => {
    const mockEventWithMultipleMarkets: PredictEvent = {
      id: 'test-event-2',
      title: 'Multiple Markets Event',
      markets: [mockMarket, { ...mockMarket, id: 'test-market-2' }],
    };

    mockUsePredictMarketData.mockReturnValue({
      marketData: [mockEventWithMultipleMarkets],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(
      <MarketListContent category="crypto" />,
      { state: initialState },
    );

    expect(getByTestId('predict-market-multiple')).toBeOnTheScreen();
  });

  it('should call usePredictMarketData with correct category', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProvider(<MarketListContent category="new" />, {
      state: initialState,
    });

    expect(mockUsePredictMarketData).toHaveBeenCalledWith({ category: 'new' });
  });
});
