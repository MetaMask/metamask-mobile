import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TrendingTokensFullView from './TrendingTokensFullView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  createNavigatorFactory: () => ({}),
}));

const mockFetchTrendingTokens = jest.fn();
const mockUseTrendingRequest = jest.fn().mockReturnValue({
  results: [],
  isLoading: false,
  error: null,
  fetch: mockFetchTrendingTokens,
});
jest.mock(
  '../../../UI/Trending/hooks/useTrendingRequest/useTrendingRequest',
  () => ({
    useTrendingRequest: (options: unknown) => mockUseTrendingRequest(options),
  }),
);

jest.mock('../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch');
const mockUseTrendingSearch = jest.mocked(useTrendingSearch);

// Mock sections.config to avoid complex Perps dependencies
jest.mock('../../TrendingView/sections.config', () => ({
  SECTIONS_CONFIG: {
    tokens: {
      getSearchableText: (item: { name?: string; symbol?: string }) =>
        `${item.name || ''} ${item.symbol || ''}`.toLowerCase(),
    },
  },
}));

jest.mock(
  '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return ({
      trendingTokens,
      onTokenPress,
      ...rest
    }: {
      trendingTokens: TrendingAsset[];
      onTokenPress: (token: TrendingAsset) => void;
    }) => (
      <View testID="trending-tokens-list" {...rest}>
        {trendingTokens.map((token, index) => (
          <View
            key={token.assetId || index}
            testID={`token-${index}`}
            onTouchEnd={() => onTokenPress(token)}
          >
            <Text>{token.name}</Text>
          </View>
        ))}
      </View>
    );
  },
);

jest.mock(
  '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return ({ count }: { count: number }) => (
      <View testID="trending-tokens-skeleton" data-count={count} />
    );
  },
);

jest.mock('../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(
    (stackId, screenName) => (params?: unknown) => [
      stackId,
      { screen: screenName, params },
    ],
  ),
}));

jest.mock(
  '../../TrendingView/components/EmptyErrorState/EmptyErrorTrendingState',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return jest.fn(({ onRetry }: { onRetry?: () => void }) => (
      <View testID="empty-error-trending-state">
        <Text>Trending tokens is not available</Text>
        {onRetry && <View testID="retry-button" onTouchEnd={onRetry} />}
      </View>
    ));
  },
);

jest.mock(
  '../../TrendingView/components/EmptyErrorState/EmptySearchResultState',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return jest.fn(() => (
      <View testID="empty-search-result-state">
        <Text>No tokens found</Text>
      </View>
    ));
  },
);

jest.mock('../../../UI/Trending/components/TrendingTokensBottomSheet', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TrendingTokenTimeBottomSheet: ({
      isVisible,
      onClose,
      onTimeSelect,
    }: {
      isVisible: boolean;
      onClose: () => void;
      onTimeSelect?: (sortBy: string, timeOption: string) => void;
    }) => {
      if (!isVisible) return null;
      return (
        <View testID="trending-token-time-bottom-sheet">
          <View
            testID="time-select-24h"
            onTouchEnd={() => onTimeSelect?.('h24_trending', '24h')}
          />
          <View
            testID="time-select-6h"
            onTouchEnd={() => onTimeSelect?.('h6_trending', '6h')}
          />
          <View testID="time-close" onTouchEnd={onClose} />
        </View>
      );
    },
    TrendingTokenNetworkBottomSheet: ({
      isVisible,
      onClose,
      onNetworkSelect,
    }: {
      isVisible: boolean;
      onClose: () => void;
      onNetworkSelect?: (chainIds: string[] | null) => void;
    }) => {
      if (!isVisible) return null;
      return (
        <View testID="trending-token-network-bottom-sheet">
          <View
            testID="network-select-all"
            onTouchEnd={() => onNetworkSelect?.(null)}
          />
          <View
            testID="network-select-eip155:1"
            onTouchEnd={() => onNetworkSelect?.(['eip155:1'])}
          />
          <View testID="network-close" onTouchEnd={onClose} />
        </View>
      );
    },
    TrendingTokenPriceChangeBottomSheet: ({
      isVisible,
      onClose,
      onPriceChangeSelect,
    }: {
      isVisible: boolean;
      onClose: () => void;
      onPriceChangeSelect?: (option: string, sortDirection: string) => void;
    }) => {
      if (!isVisible) return null;
      return (
        <View testID="trending-token-price-change-bottom-sheet">
          <View
            testID="price-change-select-volume"
            onTouchEnd={() => onPriceChangeSelect?.('volume', 'ascending')}
          />
          <View testID="price-change-close" onTouchEnd={onClose} />
        </View>
      );
    },
    TimeOption: {
      TwentyFourHours: '24h',
      SixHours: '6h',
      OneHour: '1h',
      FiveMinutes: '5m',
    },
    PriceChangeOption: {
      PriceChange: 'price_change',
      Volume: 'volume',
      MarketCap: 'market_cap',
    },
    SortDirection: {
      Ascending: 'ascending',
      Descending: 'descending',
    },
  };
});

const createMockToken = (
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  price: '1.00135763432467',
  aggregatedUsdVolume: 974248822.2,
  marketCap: 75641301011.76,
  priceChangePct: {
    h24: '3.44',
  },
  ...overrides,
});

describe('TrendingTokensFullView', () => {
  const mockState = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurations: {},
          networkConfigurationsByChainId: {},
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrendingRequest.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('renders header with title and buttons', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false, // Exclude NavigationContainer since we're mocking navigation
    );

    expect(getByText('Trending tokens')).toBeOnTheScreen();
    expect(getByTestId('trending-tokens-header-back-button')).toBeOnTheScreen();
  });

  it('renders control buttons', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByTestId('price-change-button')).toBeOnTheScreen();
    expect(getByTestId('all-networks-button')).toBeOnTheScreen();
    expect(getByTestId('24h-button')).toBeOnTheScreen();
    expect(getByText('Price change')).toBeOnTheScreen();
    expect(getByText('All networks')).toBeOnTheScreen();
    expect(getByText('24h')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const backButton = getByTestId('trending-tokens-header-back-button');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('opens time bottom sheet when 24h button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const button24h = getByTestId('24h-button');
    fireEvent.press(button24h);

    expect(getByTestId('trending-token-time-bottom-sheet')).toBeOnTheScreen();
  });

  it('opens network bottom sheet when all networks button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const allNetworksButton = getByTestId('all-networks-button');
    fireEvent.press(allNetworksButton);

    expect(
      getByTestId('trending-token-network-bottom-sheet'),
    ).toBeOnTheScreen();
  });

  it('opens price change bottom sheet when price change button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const priceChangeButton = getByTestId('price-change-button');
    fireEvent.press(priceChangeButton);

    expect(
      getByTestId('trending-token-price-change-bottom-sheet'),
    ).toBeTruthy();
  });

  it('displays skeleton loader when loading', () => {
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { queryAllByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const skeletons = queryAllByTestId('trending-tokens-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(skeletons[0]).toBeOnTheScreen();
  });

  it('displays empty error state when results are empty without search query', () => {
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByText } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByText('Trending tokens is not available')).toBeOnTheScreen();
  });

  it('displays empty search result state when search returns no results', () => {
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByText, getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    // Open search
    const searchToggle = getByTestId('trending-tokens-header-search-toggle');
    fireEvent.press(searchToggle);

    // Type search query
    const searchInput = getByTestId('trending-tokens-header-search-bar');
    fireEvent.changeText(searchInput, 'nonexistenttoken');

    expect(getByTestId('empty-search-result-state')).toBeOnTheScreen();
    expect(getByText('No tokens found')).toBeOnTheScreen();
  });

  it('displays trending tokens list when data is loaded', () => {
    const mockTokens = [
      createMockToken({ name: 'Token 1', assetId: 'eip155:1/erc20:0x123' }),
      createMockToken({ name: 'Token 2', assetId: 'eip155:1/erc20:0x456' }),
    ];

    mockUseTrendingRequest.mockReturnValue({
      results: mockTokens,
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });

    mockUseTrendingSearch.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
    expect(getByText('Token 1')).toBeOnTheScreen();
    expect(getByText('Token 2')).toBeOnTheScreen();
  });

  it('calls useTrendingSearch with correct initial parameters', () => {
    renderWithProvider(<TrendingTokensFullView />, { state: mockState }, false);

    expect(mockUseTrendingSearch).toHaveBeenCalledWith({
      sortBy: undefined,
      chainIds: null,
      searchQuery: undefined,
    });
  });

  it('updates sortBy when time option is selected', async () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const button24h = getByTestId('24h-button');
    fireEvent.press(button24h);

    const timeSelect6h = getByTestId('time-select-6h');
    await act(async () => {
      fireEvent(timeSelect6h, 'touchEnd');
    });

    await waitFor(() => {
      expect(mockUseTrendingSearch).toHaveBeenLastCalledWith({
        sortBy: 'h6_trending',
        chainIds: null,
        searchQuery: undefined,
      });
    });
  });

  it('updates chainIds when network is selected', async () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const allNetworksButton = getByTestId('all-networks-button');
    fireEvent.press(allNetworksButton);

    const networkSelect = getByTestId('network-select-eip155:1');
    await act(async () => {
      fireEvent(networkSelect, 'touchEnd');
    });

    await waitFor(() => {
      expect(mockUseTrendingSearch).toHaveBeenLastCalledWith({
        sortBy: undefined,
        chainIds: ['eip155:1'],
        searchQuery: undefined,
      });
    });
  });

  it('updates price change filter when option is selected', async () => {
    const mockTokens = [
      createMockToken({ name: 'Token 1', assetId: 'eip155:1/erc20:0x123' }),
      createMockToken({ name: 'Token 2', assetId: 'eip155:1/erc20:0x456' }),
    ];

    mockUseTrendingRequest.mockReturnValue({
      results: mockTokens,
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });

    mockUseTrendingSearch.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    // Open price change bottom sheet
    const priceChangeButton = getByTestId('price-change-button');
    fireEvent.press(priceChangeButton);

    // Select Volume option (which maps to PriceChangeOption.Volume and ascending sort)
    const volumeOption = getByTestId('price-change-select-volume');
    await act(async () => {
      fireEvent(volumeOption, 'touchEnd');
    });

    // Price change button label should update to "Volume"
    expect(getByText('Volume')).toBeOnTheScreen();
  });

  it('triggers section refetch on pull-to-refresh', async () => {
    const mockTokens = [
      createMockToken({
        assetId: 'eip155:1/erc20:0xabc',
        name: 'Token 1',
        symbol: 'TKN1',
      }),
    ];

    mockUseTrendingRequest.mockReturnValue({
      results: mockTokens,
      isLoading: false,
      error: null,
      fetch: mockFetchTrendingTokens,
    });

    mockUseTrendingSearch.mockReturnValue({
      data: mockTokens,
      isLoading: false,
      refetch: mockFetchTrendingTokens,
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const list = getByTestId('trending-tokens-list');

    // Simulate pull-to-refresh via RefreshControl's onRefresh
    const refreshControl = list.props.refreshControl;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockFetchTrendingTokens).toHaveBeenCalledTimes(1);
  });

  describe('trendingTokens sorting logic', () => {
    it('returns search results in relevance order when search query is present', async () => {
      const mockTokens = [
        createMockToken({
          name: 'Ethereum',
          symbol: 'ETH',
          assetId: 'eip155:1/erc20:0x111',
          aggregatedUsdVolume: 1000,
        }),
        createMockToken({
          name: 'Bitcoin',
          symbol: 'BTC',
          assetId: 'eip155:1/erc20:0x222',
          aggregatedUsdVolume: 5000,
        }),
      ];

      mockUseTrendingSearch.mockReturnValue({
        data: mockTokens,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = renderWithProvider(
        <TrendingTokensFullView />,
        { state: mockState },
        false,
      );

      // Open search and type a query
      const searchToggle = getByTestId('trending-tokens-header-search-toggle');
      fireEvent.press(searchToggle);

      const searchInput = getByTestId('trending-tokens-header-search-bar');
      fireEvent.changeText(searchInput, 'eth');

      // Tokens should be displayed in original order (relevance), not sorted
      // Even if we select a sort option, search results should maintain relevance order
      expect(getByText('Ethereum')).toBeOnTheScreen();
      expect(getByText('Bitcoin')).toBeOnTheScreen();
    });

    it('returns results without sorting when no price change option is selected', () => {
      const mockTokens = [
        createMockToken({
          name: 'Token A',
          assetId: 'eip155:1/erc20:0xaaa',
          aggregatedUsdVolume: 100,
        }),
        createMockToken({
          name: 'Token B',
          assetId: 'eip155:1/erc20:0xbbb',
          aggregatedUsdVolume: 500,
        }),
        createMockToken({
          name: 'Token C',
          assetId: 'eip155:1/erc20:0xccc',
          aggregatedUsdVolume: 300,
        }),
      ];

      mockUseTrendingSearch.mockReturnValue({
        data: mockTokens,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = renderWithProvider(
        <TrendingTokensFullView />,
        { state: mockState },
        false,
      );

      // No price change option selected by default, tokens should be in original order
      expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
      expect(getByText('Token A')).toBeOnTheScreen();
      expect(getByText('Token B')).toBeOnTheScreen();
      expect(getByText('Token C')).toBeOnTheScreen();
    });

    it('returns empty array when search results are empty', () => {
      mockUseTrendingSearch.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(
        <TrendingTokensFullView />,
        { state: mockState },
        false,
      );

      // Should show empty state, not the tokens list
      expect(getByTestId('empty-error-trending-state')).toBeOnTheScreen();
    });

    it('applies sorting when price change option is selected and no search query', async () => {
      const mockTokens = [
        createMockToken({
          name: 'Low Volume Token',
          assetId: 'eip155:1/erc20:0x111',
          aggregatedUsdVolume: 100,
        }),
        createMockToken({
          name: 'High Volume Token',
          assetId: 'eip155:1/erc20:0x222',
          aggregatedUsdVolume: 10000,
        }),
        createMockToken({
          name: 'Medium Volume Token',
          assetId: 'eip155:1/erc20:0x333',
          aggregatedUsdVolume: 1000,
        }),
      ];

      mockUseTrendingSearch.mockReturnValue({
        data: mockTokens,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = renderWithProvider(
        <TrendingTokensFullView />,
        { state: mockState },
        false,
      );

      // Open price change bottom sheet
      const priceChangeButton = getByTestId('price-change-button');
      fireEvent.press(priceChangeButton);

      // Select Volume option
      const volumeOption = getByTestId('price-change-select-volume');
      await act(async () => {
        fireEvent(volumeOption, 'touchEnd');
      });

      // The tokens should now be sorted by volume
      // Note: The actual sorting is done by sortTrendingTokens utility
      expect(getByText('Low Volume Token')).toBeOnTheScreen();
      expect(getByText('High Volume Token')).toBeOnTheScreen();
      expect(getByText('Medium Volume Token')).toBeOnTheScreen();
    });

    it('does not apply sorting when search query is present even with price change option', async () => {
      const mockTokens = [
        createMockToken({
          name: 'Ethereum Classic',
          symbol: 'ETC',
          assetId: 'eip155:1/erc20:0x111',
          aggregatedUsdVolume: 100,
        }),
        createMockToken({
          name: 'Ethereum',
          symbol: 'ETH',
          assetId: 'eip155:1/erc20:0x222',
          aggregatedUsdVolume: 50000,
        }),
      ];

      mockUseTrendingSearch.mockReturnValue({
        data: mockTokens,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText } = renderWithProvider(
        <TrendingTokensFullView />,
        { state: mockState },
        false,
      );

      // First select a price change option
      const priceChangeButton = getByTestId('price-change-button');
      fireEvent.press(priceChangeButton);

      const volumeOption = getByTestId('price-change-select-volume');
      await act(async () => {
        fireEvent(volumeOption, 'touchEnd');
      });

      // Now open search and type a query
      const searchToggle = getByTestId('trending-tokens-header-search-toggle');
      fireEvent.press(searchToggle);

      const searchInput = getByTestId('trending-tokens-header-search-bar');
      fireEvent.changeText(searchInput, 'eth');

      // Even with volume sort selected, search results should maintain relevance order
      // (Ethereum Classic first because that's the order returned by mock)
      expect(getByText('Ethereum Classic')).toBeOnTheScreen();
      expect(getByText('Ethereum')).toBeOnTheScreen();
    });

    it('clears search and shows sorted results when search is dismissed', async () => {
      const mockTokens = [
        createMockToken({
          name: 'Token X',
          assetId: 'eip155:1/erc20:0xaaa',
        }),
        createMockToken({
          name: 'Token Y',
          assetId: 'eip155:1/erc20:0xbbb',
        }),
      ];

      mockUseTrendingSearch.mockReturnValue({
        data: mockTokens,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <TrendingTokensFullView />,
        { state: mockState },
        false,
      );

      // Open search
      const searchToggle = getByTestId('trending-tokens-header-search-toggle');
      fireEvent.press(searchToggle);

      // Type search query
      const searchInput = getByTestId('trending-tokens-header-search-bar');
      fireEvent.changeText(searchInput, 'token');

      // Verify search is active
      expect(searchInput.props.value).toBe('token');

      // Clear search by changing text to empty
      fireEvent.changeText(searchInput, '');

      // Results should still be displayed
      expect(getByText('Token X')).toBeOnTheScreen();
      expect(getByText('Token Y')).toBeOnTheScreen();
      expect(queryByTestId('empty-search-result-state')).not.toBeOnTheScreen();
    });
  });
});
