import '../../../../tests/component-view/mocks';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../util/test/platform';
import { renderTrendingViewWithRoutes } from '../../../../tests/component-view/renderers/trending';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockTrendingTokensData,
  mockBnbChainToken,
  getTrendingTokensMock,
} from '../../../../tests/component-view/mocks/trendingApiMocks';
import {
  fireEvent,
  waitFor,
  within,
  userEvent,
  type RenderAPI,
  act,
} from '@testing-library/react-native';
import { ReactTestInstance } from 'react-test-renderer';

// TODO: Anti-pattern — only Engine and native modules should be mocked here.
// getTrendingTokens is a standalone service function called directly from
// components, not through a controller on Engine.
// https://github.com/MetaMask/metamask-mobile/issues/26270
// eslint-disable-next-line no-restricted-syntax
jest.mock('@metamask/assets-controllers', () => {
  const actual = jest.requireActual('@metamask/assets-controllers');
  return {
    ...actual,
    getTrendingTokens: jest.fn().mockResolvedValue([]),
  };
});

const TRENDING_ETHEREUM_ID =
  'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000';
const TRENDING_BITCOIN_ID =
  'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890';
const TRENDING_UNISWAP_ID =
  'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const TRENDING_BNB_ID =
  'trending-token-row-item-eip155:56/erc20:0xBTC0000000000000000000000000000000000000';

const assertTrendingTokenRowsVisibility = async (opts: {
  visible: { id: string; name?: string; pricePercentageChange?: string }[];
  missing?: { id: string }[];
  queryByTestId: RenderAPI['queryByTestId'];
}) => {
  const { visible, missing, queryByTestId } = opts;
  await waitFor(
    async () => {
      visible.forEach((result) => {
        const item = queryByTestId(result.id);
        expect(item).toBeOnTheScreen();
        if (result.name) {
          expect(item).toHaveTextContent(result.name, {
            exact: false,
          });
        }
        if (result.pricePercentageChange) {
          expect(item).toHaveTextContent(result.pricePercentageChange, {
            exact: false,
          });
        }
      });
      missing?.forEach((result) => {
        expect(queryByTestId(result.id)).not.toBeOnTheScreen();
      });
    },
    { timeout: 2000 },
  );
};

/**
 * Prefer using userEvent.press over fireEvent.press (better event simulation),
 * but fallback if fails on device platforms
 * @param elem - element to press
 */
const actButtonPress = async (elem: ReactTestInstance) => {
  try {
    await userEvent.press(elem);
  } catch {
    act(() => fireEvent.press(elem));
  }
};

describeForPlatforms('ExploreFeed - Component Tests', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  itForPlatforms('renders Explore screen wrapped in SafeAreaView', async () => {
    const { getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA),
      ).toBeOnTheScreen();
    });
  });

  itForPlatforms('renders HeaderRoot on Explore screen', async () => {
    const { getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT),
      ).toBeOnTheScreen();
    });
  });

  itForPlatforms('renders Explore title on Explore screen', async () => {
    const { getByText } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(getByText('Explore')).toBeOnTheScreen();
    });
  });

  itForPlatforms(
    'user sees trending tokens section with mocked data',
    async () => {
      const { findByText, queryByTestId } = renderTrendingViewWithRoutes();

      await waitFor(async () => {
        expect(await findByText('Ethereum')).toBeOnTheScreen();
      });

      await assertTrendingTokenRowsVisibility({
        queryByTestId,
        visible: [
          {
            id: TRENDING_ETHEREUM_ID,
            name: 'Ethereum',
            pricePercentageChange: '+5.20%',
          },
          {
            id: TRENDING_BITCOIN_ID,
            name: 'Bitcoin',
            pricePercentageChange: '-2.50%',
          },
          {
            id: TRENDING_UNISWAP_ID,
            name: 'Uniswap',
            pricePercentageChange: '+12.80%',
          },
        ],
      });
    },
  );

  itForPlatforms('user navigates to trending tokens full view', async () => {
    const { getByTestId, queryByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId('section-header-view-all-tokens');
    await actButtonPress(viewAllButton);

    await waitFor(() => {
      const header = getByTestId('trending-tokens-header');
      expect(header).toHaveTextContent('Trending tokens');
    });

    await assertTrendingTokenRowsVisibility({
      queryByTestId,
      visible: [
        {
          id: TRENDING_ETHEREUM_ID,
          name: 'Ethereum',
          pricePercentageChange: '+5.20%',
        },
        {
          id: TRENDING_BITCOIN_ID,
          name: 'Bitcoin',
          pricePercentageChange: '-2.50%',
        },
        {
          id: TRENDING_UNISWAP_ID,
          name: 'Uniswap',
          pricePercentageChange: '+12.80%',
        },
      ],
    });
  });

  itForPlatforms(
    'user can search for a trending token from the explore feed',
    async () => {
      const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

      await waitFor(() => {
        expect(
          getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
        ).toBeOnTheScreen();
      });

      const searchButton = getByTestId('explore-view-search-button');
      await actButtonPress(searchButton);

      const searchInput = await findByTestId('explore-view-search-input');
      expect(searchInput).toBeOnTheScreen();

      await userEvent.type(searchInput, 'ethereum');

      const searchResultsList = await findByTestId(
        'trending-search-results-list',
      );

      await assertTrendingTokenRowsVisibility({
        queryByTestId: within(searchResultsList).queryByTestId,
        visible: [
          {
            id: TRENDING_ETHEREUM_ID,
            name: 'Ethereum',
            pricePercentageChange: '+5.20%',
          },
        ],
      });
    },
  );
});

describeForPlatforms('TrendingTokensFullView - Component Tests', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  itForPlatforms(
    'displays only BNB tokens when BNB Chain network filter is selected',
    async () => {
      getTrendingTokensMock.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (params: any) => {
          if (
            params?.chainIds &&
            params.chainIds.length === 1 &&
            params.chainIds[0] === 'eip155:56'
          ) {
            return mockBnbChainToken;
          }
          return mockTrendingTokensData;
        },
      );

      const { findByText, getByTestId, queryByTestId } =
        renderTrendingViewWithRoutes();

      await waitFor(() => {
        expect(
          getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
        ).toBeOnTheScreen();
      });

      const viewAllButton = getByTestId('section-header-view-all-tokens');
      await actButtonPress(viewAllButton);

      await waitFor(() => {
        expect(getByTestId('trending-tokens-header')).toBeOnTheScreen();
      });

      await assertTrendingTokenRowsVisibility({
        queryByTestId,
        visible: [
          { id: TRENDING_ETHEREUM_ID },
          { id: TRENDING_BITCOIN_ID },
          { id: TRENDING_UNISWAP_ID },
        ],
        missing: [{ id: TRENDING_BNB_ID }],
      });

      const networkButton = getByTestId('all-networks-button');
      await actButtonPress(networkButton);

      await waitFor(() => {
        expect(getByTestId('close-button')).toBeOnTheScreen();
      });

      const bnbNetworkOption = await findByText('BNB Chain');
      expect(bnbNetworkOption).toBeOnTheScreen();

      await actButtonPress(bnbNetworkOption);

      await assertTrendingTokenRowsVisibility({
        queryByTestId,
        visible: [{ id: TRENDING_BNB_ID }],
        missing: [
          { id: TRENDING_ETHEREUM_ID },
          { id: TRENDING_BITCOIN_ID },
          { id: TRENDING_UNISWAP_ID },
        ],
      });
    },
  );

  itForPlatforms('user can search on trending tokens full view', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId('section-header-view-all-tokens');
    await actButtonPress(viewAllButton);

    await waitFor(() => {
      expect(getByTestId('trending-tokens-header')).toBeOnTheScreen();
    });

    const searchToggle = getByTestId('trending-tokens-header-search-toggle');
    await actButtonPress(searchToggle);

    const searchInput = await findByTestId('trending-tokens-header-search-bar');
    expect(searchInput).toBeOnTheScreen();

    await userEvent.type(searchInput, 'ethereum');

    await assertTrendingTokenRowsVisibility({
      queryByTestId,
      visible: [{ id: TRENDING_ETHEREUM_ID }],
      missing: [{ id: TRENDING_BITCOIN_ID }, { id: TRENDING_UNISWAP_ID }],
    });
  });
});
