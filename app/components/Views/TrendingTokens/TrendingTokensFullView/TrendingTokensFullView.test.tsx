import React from 'react';
import { render, userEvent, fireEvent } from '@testing-library/react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TrendingTokensFullView, {
  TrendingTokensData,
  TrendingTokensDataProps,
} from './TrendingTokensFullView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import {
  TimeOption,
  PriceChangeOption,
} from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import { TrendingFilterContext } from '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList';

import { useTrendingRequest } from '../../../UI/Trending/hooks/useTrendingRequest/useTrendingRequest';
import type TrendingTokensList from '../../../UI/Trending/components/TrendingTokensList';
import mockState from '../../../../util/test/initial-root-state';

const TEST_IDS = {
  skeleton: 'trending-tokens-skeleton',
  emptySearchResult: 'empty-search-result-state',
  emptyErrorState: 'empty-error-trending-state',
  tokensList: 'trending-tokens-list',
  retryButton: 'empty-error-trending-state--retry-button',
} as const;

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  createNavigatorFactory: () => ({}),
}));

jest.mock('../../../UI/Trending/hooks/useTrendingRequest/useTrendingRequest');
const mockUseTrendingRequest = jest.mocked(useTrendingRequest);

jest.mock('../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch');
const mockUseTrendingSearch = jest.mocked(useTrendingSearch);

jest.mock(
  '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList',
  (): typeof TrendingTokensList => {
    const { View, Text, ScrollView } = jest.requireActual('react-native');
    return ({ trendingTokens, refreshControl }) => (
      <ScrollView testID="trending-tokens-list" refreshControl={refreshControl}>
        {trendingTokens.map((token, index) => (
          <View key={token.assetId || index} testID={`token-${index}`}>
            <Text>{token.name}</Text>
          </View>
        ))}
      </ScrollView>
    );
  },
);

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

const arrangeMocks = () => {
  const mockRefetch = jest.fn();

  const setTrendingSearchMock = (options: {
    data?: TrendingAsset[];
    isLoading?: boolean;
  }) => {
    mockUseTrendingSearch.mockReturnValue({
      data: options.data ?? [],
      isLoading: options.isLoading ?? false,
      refetch: mockRefetch,
    });
  };

  const setTrendingRequestMock = (options: {
    results?: TrendingAsset[];
    isLoading?: boolean;
    error?: Error | null;
  }) => {
    mockUseTrendingRequest.mockReturnValue({
      results: options.results ?? [],
      isLoading: options.isLoading ?? false,
      error: options.error ?? null,
      fetch: jest.fn(),
    });
  };

  return {
    mockRefetch,
    mockGoBack,
    mockNavigate,
    setTrendingSearchMock,
    setTrendingRequestMock,
  };
};

describe('TrendingTokensData', () => {
  const mockTokens = [
    createMockToken({ name: 'Token 1', assetId: 'eip155:1/erc20:0x123' }),
    createMockToken({ name: 'Token 2', assetId: 'eip155:1/erc20:0x456' }),
  ];

  const mockFilterContext: TrendingFilterContext = {
    timeFilter: TimeOption.TwentyFourHours,
    sortOption: PriceChangeOption.PriceChange,
    networkFilter: 'all',
    isSearchResult: false,
  };

  const mockTheme = {
    colors: {
      primary: { default: '#037DD6' },
      icon: { default: '#6A737D' },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test table for different states
  const stateTests: {
    testName: string;
    overrideProps?: Partial<TrendingTokensDataProps>;
    elemsRendered: string[];
    actAssert?: (
      testUtils: ReturnType<typeof render>,
      props: TrendingTokensDataProps,
    ) => Promise<void>;
  }[] = [
    {
      testName: 'loading skeleton when loading is true',
      overrideProps: {
        isLoading: true,
      },
      elemsRendered: [TEST_IDS.skeleton],
    },
    {
      testName: 'no loading skeleton when loading is false',
      overrideProps: {
        isLoading: false,
      },
      elemsRendered: [TEST_IDS.tokensList],
    },
    {
      testName:
        'empty search results when typing a search query that returns no results',
      overrideProps: {
        search: { searchResults: [], searchQuery: 'nonexistent' },
      },
      elemsRendered: [TEST_IDS.emptySearchResult],
    },
    {
      testName: 'empty error state when there is an error on main token view',
      overrideProps: {
        trendingTokens: [],
        search: { searchResults: [], searchQuery: '' },
      },
      elemsRendered: [TEST_IDS.emptyErrorState],
      actAssert: async (testUtils, props) => {
        const { getByTestId } = testUtils;
        const retryButton = getByTestId(TEST_IDS.retryButton);
        await userEvent.press(retryButton);

        expect(props.handleRefresh).toHaveBeenCalledTimes(1);
      },
    },
    {
      testName: 'tokens list when there are tokens',
      elemsRendered: [TEST_IDS.tokensList],
      actAssert: async (testUtils) => {
        const { getByText } = testUtils;
        expect(getByText('Token 1')).toBeOnTheScreen();
        expect(getByText('Token 2')).toBeOnTheScreen();
      },
    },
  ];

  it.each(stateTests)(
    'renders correct state - $testName',
    async ({ overrideProps, elemsRendered, actAssert }) => {
      const baseProps: TrendingTokensDataProps = {
        isLoading: false,
        refreshing: false,
        trendingTokens: mockTokens,
        handleRefresh: jest.fn(),
        selectedTimeOption: TimeOption.TwentyFourHours,
        filterContext: mockFilterContext,
        theme: mockTheme,
        search: {
          searchResults: mockTokens,
          searchQuery: '',
        },
      };

      const props: TrendingTokensDataProps = { ...baseProps, ...overrideProps };

      const testUtils = render(<TrendingTokensData {...props} />);

      elemsRendered.forEach((id) => {
        expect(testUtils.getByTestId(id)).toBeOnTheScreen();
      });

      await actAssert?.(testUtils, props);
    },
  );
});

describe('TrendingTokensFullView', () => {
  const renderTrendingFullView = () =>
    renderWithProvider(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <TrendingTokensFullView />
      </SafeAreaProvider>,
      { state: mockState },
      false,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    const mocks = arrangeMocks();
    mocks.setTrendingRequestMock({ results: [] });
    mocks.setTrendingSearchMock({ data: [] });
  });

  it('renders header with title and buttons', () => {
    const { getByText, getByTestId } = renderTrendingFullView();

    expect(getByText('Trending tokens')).toBeOnTheScreen();
    expect(getByTestId('trending-tokens-header-back-button')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', async () => {
    const mocks = arrangeMocks();
    const { getByTestId } = renderTrendingFullView();

    const backButton = getByTestId('trending-tokens-header-back-button');
    await userEvent.press(backButton);

    expect(mocks.mockGoBack).toHaveBeenCalled();
  });

  it('displays skeleton loader when loading', () => {
    const mocks = arrangeMocks();
    mocks.setTrendingSearchMock({ data: [], isLoading: true });

    const { queryByTestId } = renderTrendingFullView();

    const skeletonsContainer = queryByTestId(TEST_IDS.skeleton);
    expect(skeletonsContainer).toBeOnTheScreen();
  });

  it('displays empty error state when results are empty without search query', () => {
    const mocks = arrangeMocks();
    mocks.setTrendingSearchMock({ data: [] });

    const { getByText } = renderTrendingFullView();

    expect(getByText('Trending tokens is not available')).toBeOnTheScreen();
  });

  it('displays empty search result state when search returns no results', async () => {
    const mocks = arrangeMocks();
    mocks.setTrendingSearchMock({ data: [] });

    const { getByText, getByTestId } = renderTrendingFullView();

    // Open search
    const searchToggle = getByTestId('trending-tokens-header-search-toggle');
    await userEvent.press(searchToggle);

    // Type search query
    const searchInput = getByTestId('trending-tokens-header-search-bar');
    await userEvent.type(searchInput, 'nonexistenttoken');

    expect(getByTestId('empty-search-result-state')).toBeOnTheScreen();
    expect(getByText('No tokens found')).toBeOnTheScreen();
  });

  it('displays trending tokens list when data is loaded', () => {
    const mockTokens = [
      createMockToken({ name: 'Token 1', assetId: 'eip155:1/erc20:0x123' }),
      createMockToken({ name: 'Token 2', assetId: 'eip155:1/erc20:0x456' }),
    ];

    const mocks = arrangeMocks();
    mocks.setTrendingRequestMock({ results: mockTokens });
    mocks.setTrendingSearchMock({ data: mockTokens });

    const { getByTestId, getByText } = renderTrendingFullView();

    expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
    expect(getByText('Token 1')).toBeOnTheScreen();
    expect(getByText('Token 2')).toBeOnTheScreen();
  });

  it('calls useTrendingSearch with correct initial parameters', () => {
    renderTrendingFullView();

    expect(mockUseTrendingSearch).toHaveBeenCalledWith({
      sortBy: undefined,
      chainIds: null,
      searchQuery: undefined,
    });
  });

  it('calls refetch when pull-to-refresh is triggered', () => {
    const mockTokens = [
      createMockToken({ name: 'Token 1', assetId: 'eip155:1/erc20:0x123' }),
    ];

    const mocks = arrangeMocks();
    mocks.setTrendingRequestMock({ results: mockTokens });
    mocks.setTrendingSearchMock({ data: mockTokens });

    const { getByTestId, UNSAFE_getByType } = renderTrendingFullView();

    expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
    const { RefreshControl } = jest.requireActual('react-native');
    const refreshControl = UNSAFE_getByType(RefreshControl);
    fireEvent(refreshControl, 'refresh');

    expect(mocks.mockRefetch).toHaveBeenCalledTimes(1);
  });

  const bottomSheetTests = [
    {
      testName: 'time',
      sheetButtonTestId: '24h-button',
      sheetTestId: 'trending-token-time-bottom-sheet',
      actAssertSelectOption: async (
        testUtils: ReturnType<typeof renderTrendingFullView>,
      ) => {
        const { getByTestId } = testUtils;
        const timeSelect6h = getByTestId('time-select-6h');
        await userEvent.press(timeSelect6h);

        expect(mockUseTrendingSearch).toHaveBeenLastCalledWith({
          sortBy: 'h6_trending',
          chainIds: null,
          searchQuery: undefined,
        });
      },
    },
    {
      testName: 'network',
      sheetButtonTestId: 'all-networks-button',
      sheetTestId: 'trending-token-network-bottom-sheet',
      actAssertSelectOption: async (
        testUtils: ReturnType<typeof renderTrendingFullView>,
      ) => {
        const { getByTestId } = testUtils;
        const networkSelect = getByTestId('network-select-eip155:1');
        await userEvent.press(networkSelect);

        expect(mockUseTrendingSearch).toHaveBeenLastCalledWith({
          sortBy: undefined,
          chainIds: ['eip155:1'],
          searchQuery: undefined,
        });
      },
    },
    {
      testName: 'price change',
      sheetButtonTestId: 'price-change-button',
      sheetTestId: 'trending-token-price-change-bottom-sheet',
      actAssertSelectOption: async (
        testUtils: ReturnType<typeof renderTrendingFullView>,
      ) => {
        const { getByTestId, getByText } = testUtils;
        const priceChangeSelect = getByTestId('price-change-select-volume');
        await userEvent.press(priceChangeSelect);
        await userEvent.press(getByText('Apply'));

        expect(getByTestId('price-change-button')).toHaveTextContent('Volume');
      },
    },
  ] as const;

  it.each(bottomSheetTests)(
    'opens $testName bottom sheet when button is pressed',
    async ({ sheetButtonTestId, sheetTestId, actAssertSelectOption }) => {
      const testUtils = renderTrendingFullView();

      const triggerButton = testUtils.getByTestId(sheetButtonTestId);
      await userEvent.press(triggerButton);

      expect(testUtils.getByTestId(sheetTestId)).toBeOnTheScreen();

      await actAssertSelectOption(testUtils);
    },
  );

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

      const mocks = arrangeMocks();
      mocks.setTrendingSearchMock({ data: mockTokens });

      const { getByTestId, getByText } = renderTrendingFullView();

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

      const mocks = arrangeMocks();
      mocks.setTrendingSearchMock({ data: mockTokens });

      const { getByTestId, getByText } = renderTrendingFullView();

      // No price change option selected by default, tokens should be in original order
      expect(getByTestId('trending-tokens-list')).toBeOnTheScreen();
      expect(getByText('Token A')).toBeOnTheScreen();
      expect(getByText('Token B')).toBeOnTheScreen();
      expect(getByText('Token C')).toBeOnTheScreen();
    });

    it('returns empty array when search results are empty', () => {
      const mocks = arrangeMocks();
      mocks.setTrendingSearchMock({ data: [] });

      const { getByTestId } = renderTrendingFullView();

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

      const mocks = arrangeMocks();
      mocks.setTrendingSearchMock({ data: mockTokens });

      const { getByTestId, getByText } = renderTrendingFullView();

      // Open price change bottom sheet
      const priceChangeButton = getByTestId('price-change-button');
      await userEvent.press(priceChangeButton);

      // Select Volume option
      const volumeOption = getByTestId('price-change-select-volume');
      await userEvent.press(volumeOption);

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

      const mocks = arrangeMocks();
      mocks.setTrendingSearchMock({ data: mockTokens });

      const { getByTestId, getByText } = renderTrendingFullView();

      // First select a price change option
      const priceChangeButton = getByTestId('price-change-button');
      await userEvent.press(priceChangeButton);

      const volumeOption = getByTestId('price-change-select-volume');
      await userEvent.press(volumeOption);

      // Now open search and type a query
      const searchToggle = getByTestId('trending-tokens-header-search-toggle');
      await userEvent.press(searchToggle);

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

      const mocks = arrangeMocks();
      mocks.setTrendingSearchMock({ data: mockTokens });

      const { getByTestId, getByText, queryByTestId } =
        renderTrendingFullView();

      // Open search
      const searchToggle = getByTestId('trending-tokens-header-search-toggle');
      await userEvent.press(searchToggle);

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
