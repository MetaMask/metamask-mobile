import React from 'react';
import { Text } from 'react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokenListPageLayout, {
  type TokenListPageLayoutProps,
} from './TokenListPageLayout';
import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../TrendingTokensBottomSheet';
import { useQuickBuySearchKeyboard } from '../../hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard';

jest.mock('../../hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard');

jest.mock('../TrendingListHeader', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TrendingListHeader: () => <View testID="mock-trending-list-header" />,
  };
});

jest.mock('../FilterBar/FilterBar', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="mock-filter-bar" />;
});

jest.mock('../../Views/TrendingTokensFullView/TrendingTokensFullView', () => ({
  TrendingTokensData: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="mock-trending-tokens-data" />;
  },
}));

jest.mock('../TrendingTokensBottomSheet', () => {
  const actual = jest.requireActual('../TrendingTokensBottomSheet');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    TrendingTokenNetworkBottomSheet: () => (
      <View testID="mock-network-bottom-sheet" />
    ),
    TrendingTokenPriceChangeBottomSheet: () => (
      <View testID="mock-price-change-bottom-sheet" />
    ),
  };
});

const mockUseQuickBuySearchKeyboard = jest.mocked(useQuickBuySearchKeyboard);

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockToken: TrendingAsset = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
};

const createFilters = (): TokenListPageLayoutProps['filters'] => ({
  handleBackPress: jest.fn(),
  isSearchVisible: false,
  searchQuery: '',
  handleSearchToggle: jest.fn(),
  handleSearchQueryChange: jest.fn(),
  selectedNetwork: null,
  selectedNetworkName: 'All networks',
  showNetworkBottomSheet: false,
  setShowNetworkBottomSheet: jest.fn(),
  handleNetworkSelect: jest.fn(),
  handleAllNetworksPress: jest.fn(),
  selectedPriceChangeOption: PriceChangeOption.PriceChange,
  priceChangeSortDirection: SortDirection.Descending,
  showPriceChangeBottomSheet: false,
  setShowPriceChangeBottomSheet: jest.fn(),
  handlePriceChangeSelect: jest.fn(),
  handlePriceChangePress: jest.fn(),
  priceChangeButtonText: 'Price change',
  priceChangeSortDirectionIcon: 'Arrow2Down',
  selectedTimeOption: TimeOption.TwentyFourHours,
  setSelectedTimeOption: jest.fn(),
  refreshing: false,
  setRefreshing: jest.fn(),
  filterContext: {
    timeFilter: TimeOption.TwentyFourHours,
    sortOption: PriceChangeOption.PriceChange,
    networkFilter: 'all',
    isSearchResult: false,
  },
});

const renderLayout = (overrides: Partial<TokenListPageLayoutProps> = {}) =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <TokenListPageLayout
        title="Trending"
        testID="trending-tokens-header"
        filters={createFilters()}
        tokens={[mockToken]}
        searchResults={[mockToken]}
        isLoading={false}
        onRefresh={jest.fn()}
        allowedNetworks={[]}
        {...overrides}
      />
    </SafeAreaProvider>,
  );

describe('TokenListPageLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('coordinates keyboard with Quick Buy when onCloseQuickBuy is provided', () => {
    const onCloseQuickBuy = jest.fn();

    renderLayout({
      quickTradeToken: mockToken,
      onCloseQuickBuy,
      quickBuyNode: <Text testID="mock-quick-buy">Quick Buy</Text>,
    });

    expect(mockUseQuickBuySearchKeyboard).toHaveBeenCalledWith(
      mockToken,
      onCloseQuickBuy,
    );
  });

  it('does not pass an active Quick Buy token when onCloseQuickBuy is absent', () => {
    renderLayout({
      quickTradeToken: mockToken,
    });

    expect(mockUseQuickBuySearchKeyboard).toHaveBeenCalledWith(
      null,
      expect.any(Function),
    );
  });
});
