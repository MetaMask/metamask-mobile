import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import PerpsSection from './PerpsSection';
import { usePerpsMarkets } from '../../../UI/Perps/hooks';
import { PerpsMarketData } from '../../../UI/Perps/controllers/types';

// Mock external dependencies and leaf components with deep dependencies
jest.mock('../../../UI/Perps/hooks');
jest.mock('../../../UI/Perps/components/PerpsMarketRowItem', () =>
  jest.fn(() => null),
);
jest.mock(
  '../../../UI/Perps/Views/PerpsMarketListView/components/PerpsMarketRowSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return jest.fn(() => <View accessibilityRole="none" accessible={false} testID="perps-skeleton" />);
  },
);
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = jest.requireActual('react-native');
  return {
    FlashList: FlatList,
  };
});

// Mock navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUsePerpsMarkets = jest.mocked(usePerpsMarkets);

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsSection', () => {
  const createMockMarket = (
    symbol: string,
  ): PerpsMarketData & { volumeNumber: number } => ({
    symbol,
    name: `${symbol} Token`,
    maxLeverage: '40x',
    price: '$50,000.00',
    change24h: '+$1,250.00',
    change24hPercent: '+2.5%',
    volume: '$1.2B',
    volumeNumber: 1200000000,
    openInterest: '$500M',
    fundingRate: 0.0001,
    marketType: 'crypto',
  });

  const mockMarkets: (PerpsMarketData & { volumeNumber: number })[] = [
    createMockMarket('BTC'),
    createMockMarket('ETH'),
    createMockMarket('SOL'),
    createMockMarket('AVAX'),
    createMockMarket('MATIC'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton loaders when data is loading', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    const { getAllByTestId, queryByTestId } = renderWithProvider(
      <PerpsSection />,
      {
        state: initialState,
      },
    );

    const skeletons = getAllByTestId('perps-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(queryByTestId('perps-tokens-list')).toBeNull();
  });

  it('displays first 3 markets from hook data', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    const { getByTestId } = renderWithProvider(<PerpsSection />, {
      state: initialState,
    });

    const list = getByTestId('perps-tokens-list');

    expect(list.props.data).toHaveLength(3);
    expect(list.props.data[0].symbol).toBe('BTC');
    expect(list.props.data[1].symbol).toBe('ETH');
    expect(list.props.data[2].symbol).toBe('SOL');
  });

  it('navigates to market list when view all button is pressed', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    const { getByText } = renderWithProvider(<PerpsSection />, {
      state: initialState,
    });

    fireEvent.press(getByText('View all'));

    expect(mockNavigate).toHaveBeenCalledWith('Perps', {
      screen: 'PerpsTrendingView',
      params: {
        defaultMarketTypeFilter: 'all',
      },
    });
  });

  it('navigates to market details when market item is pressed', () => {
    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    const { getByTestId } = renderWithProvider(<PerpsSection />, {
      state: initialState,
    });

    const list = getByTestId('perps-tokens-list');
    const renderItem = list.props.renderItem;
    const renderedItem = renderItem({ item: mockMarkets[0], index: 0 });

    renderedItem.props.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('Perps', {
      screen: 'PerpsMarketDetails',
      params: {
        market: mockMarkets[0],
      },
    });
  });
});
