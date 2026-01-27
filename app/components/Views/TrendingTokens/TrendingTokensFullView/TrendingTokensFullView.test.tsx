import React from 'react';
import { render, userEvent } from '@testing-library/react-native';
import { Metrics, SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TrendingTokensFullView, {
  TrendingTokensData,
  TrendingTokensDataProps,
} from './TrendingTokensFullView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { TimeOption } from '../../../UI/Trending/components/TrendingTokensBottomSheet';

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
  __esModule: true,
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
    const { View, Text } = jest.requireActual('react-native');
    return ({ trendingTokens }) => (
      <View testID="trending-tokens-list">
        {trendingTokens.map((token, index) => (
          <View key={token.assetId || index} testID={`token-${index}`}>
            <Text>{token.name}</Text>
          </View>
        ))}
      </View>
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
      testName: 'loading skeleton when there is no data',
      overrideProps: {
        isLoading: true,
        trendingTokens: [],
      },
      elemsRendered: [TEST_IDS.skeleton],
    },
    {
      testName:
        'no loading skeleton when there is data (e.g. loading/refetching)',
      overrideProps: {
        isLoading: true,
        trendingTokens: mockTokens,
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

        // Price change button label should update to "Volume"
        expect(getByText('Volume')).toBeOnTheScreen();
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
});
