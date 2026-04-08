import '../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderTrendingViewWithRoutes } from '../../../../tests/component-view/renderers/trending';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockTrendingTokensData,
  mockBnbChainToken,
} from '../../../../tests/component-view/api-mocking/trending';
import {
  fireEvent,
  waitFor,
  within,
  userEvent,
  type RenderAPI,
  act,
} from '@testing-library/react-native';
import { ReactTestInstance } from 'react-test-renderer';

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
    { timeout: 5000 },
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

  it('Explore screen shows safe area, header and title and user can open trending full view', async () => {
    const { getByTestId, getByText } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA),
      ).toBeOnTheScreen();
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT),
      ).toBeOnTheScreen();
      expect(getByText('Explore')).toBeOnTheScreen();
    });

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId(
      TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS,
    );
    await actButtonPress(viewAllButton);

    await waitFor(() => {
      const header = getByTestId(
        TrendingViewSelectorsIDs.TRENDING_TOKENS_HEADER,
      );
      expect(header).toHaveTextContent('Trending tokens');
    });
  });

  it('user sees trending tokens section with mocked data', async () => {
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
  });

  it('user navigates to trending tokens full view', async () => {
    const { getByTestId, queryByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId(
      TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS,
    );
    await actButtonPress(viewAllButton);

    await waitFor(() => {
      const header = getByTestId(
        TrendingViewSelectorsIDs.TRENDING_TOKENS_HEADER,
      );
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

  it('user can search for a trending token from the explore feed', async () => {
    const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const searchButton = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON,
    );
    await actButtonPress(searchButton);

    const searchInput = await findByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_INPUT,
    );
    expect(searchInput).toBeOnTheScreen();

    await userEvent.type(searchInput, 'ethereum');

    const searchResultsList = await findByTestId(
      TrendingViewSelectorsIDs.TRENDING_SEARCH_RESULTS_LIST,
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
  });
});

describeForPlatforms('TrendingTokensFullView - Component Tests', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  it('displays only BNB tokens when BNB Chain network filter is selected', async () => {
    setupTrendingApiFetchMock(mockTrendingTokensData, (uri) => {
      const url = new URL(uri, 'https://token.api.cx.metamask.io');
      const chainIdsParam = url.searchParams.get('chainIds') ?? '';
      const chainIds = chainIdsParam.split(',').map((s) => s.trim());
      if (chainIds.length === 1 && chainIds[0] === 'eip155:56') {
        return mockBnbChainToken;
      }
      return mockTrendingTokensData;
    });

    const { findByText, getByTestId, queryByTestId } =
      renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId(
      TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS,
    );
    await actButtonPress(viewAllButton);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_TOKENS_HEADER),
      ).toBeOnTheScreen();
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

    const networkButton = getByTestId(
      TrendingViewSelectorsIDs.ALL_NETWORKS_BUTTON,
    );
    await actButtonPress(networkButton);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();
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
  });

  it('user can search on trending tokens full view', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId(
      TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS,
    );
    await actButtonPress(viewAllButton);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_TOKENS_HEADER),
      ).toBeOnTheScreen();
    });

    await assertTrendingTokenRowsVisibility({
      queryByTestId,
      visible: [{ id: TRENDING_ETHEREUM_ID }],
    });

    const searchToggle = getByTestId(
      TrendingViewSelectorsIDs.TRENDING_TOKENS_HEADER_SEARCH_TOGGLE,
    );
    await actButtonPress(searchToggle);

    const searchInput = await findByTestId(
      TrendingViewSelectorsIDs.TRENDING_TOKENS_HEADER_SEARCH_BAR,
    );
    expect(searchInput).toBeOnTheScreen();

    await userEvent.type(searchInput, 'ethereum');

    await assertTrendingTokenRowsVisibility({
      queryByTestId,
      visible: [{ id: TRENDING_ETHEREUM_ID }],
      missing: [{ id: TRENDING_BITCOIN_ID }, { id: TRENDING_UNISWAP_ID }],
    });
  });
});
