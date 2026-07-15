import '../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderTrendingViewWithRoutes } from '../../../../tests/component-view/renderers/trending';
import { strings } from '../../../../locales/i18n';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import { EXPLORE_TAB_INDEX } from './TrendingView';
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
const getExploreTabTestId = (tabIndex: number) =>
  `explore-tabs-bar-tab-${tabIndex}`;
const EXPLORE_TAB_TEST_IDS = {
  RWAS: getExploreTabTestId(EXPLORE_TAB_INDEX.RWAS),
  CRYPTO: getExploreTabTestId(EXPLORE_TAB_INDEX.CRYPTO),
  DAPPS: getExploreTabTestId(EXPLORE_TAB_INDEX.SITES),
} as const;

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

const navigateToExploreTab = async (
  tabTestID: string,
  getByTestId: RenderAPI['getByTestId'],
) => {
  await waitFor(() => {
    expect(getByTestId(tabTestID)).toBeOnTheScreen();
  });
  await actButtonPress(getByTestId(tabTestID));
};

/**
 * Navigates to the Crypto tab in the tabbed Explore layout.
 * Trending tokens (and their "View All" button) live in the Crypto tab.
 */
const navigateToCryptoTab = async (getByTestId: RenderAPI['getByTestId']) =>
  navigateToExploreTab(EXPLORE_TAB_TEST_IDS.CRYPTO, getByTestId);

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

    // Now tab is active by default and contains the scroll view
    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_NOW_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    // Trending tokens and their View All button are in the Crypto tab
    await navigateToCryptoTab(getByTestId);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS),
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
      expect(header).toHaveTextContent(strings('trending.trending_tokens'));
    });
  });

  it('user sees trending tokens section with mocked data', async () => {
    const { findByText, queryByTestId, getByTestId } =
      renderTrendingViewWithRoutes();

    // Trending tokens are in the Crypto tab
    await navigateToCryptoTab(getByTestId);

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

    // Trending tokens and their View All button are in the Crypto tab
    await navigateToCryptoTab(getByTestId);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS),
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
      expect(header).toHaveTextContent(strings('trending.trending_tokens'));
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

  it('user switches between Explore tabs and sees tab-specific sections', async () => {
    const { getByTestId, getByText, queryAllByTestId } =
      renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_NOW_SCROLL_VIEW),
      ).toBeOnTheScreen();
      expect(getByText(strings('trending.crypto_movers'))).toBeOnTheScreen();
    });

    await navigateToExploreTab(EXPLORE_TAB_TEST_IDS.CRYPTO, getByTestId);
    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_CRYPTO_SCROLL_VIEW),
      ).toBeOnTheScreen();
      expect(getByText(strings('trending.trending_tokens'))).toBeOnTheScreen();
      expect(getByTestId(TRENDING_ETHEREUM_ID)).toBeOnTheScreen();
    });

    await navigateToExploreTab(EXPLORE_TAB_TEST_IDS.RWAS, getByTestId);
    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_RWAS_SCROLL_VIEW),
      ).toBeOnTheScreen();
      expect(getByText(strings('trending.stocks'))).toBeOnTheScreen();
      expect(getByText('Ondo US Dollar Yield')).toBeOnTheScreen();
    });

    await navigateToExploreTab(EXPLORE_TAB_TEST_IDS.DAPPS, getByTestId);
    await waitFor(() => {
      expect(
        queryAllByTestId(TrendingViewSelectorsIDs.EXPLORE_DAPPS_SCROLL_VIEW),
      ).toHaveLength(1);
      expect(getByText(strings('trending.ecosystems'))).toBeOnTheScreen();
      expect(getByText(strings('trending.popular'))).toBeOnTheScreen();
      expect(queryAllByTestId('site-row-item-Uniswap')).toHaveLength(1);
    });
  });

  it('opens the requested Explore tab from route params', async () => {
    const { getByText, queryAllByTestId } = renderTrendingViewWithRoutes({
      initialParams: { initialTab: EXPLORE_TAB_INDEX.SITES },
    });

    await waitFor(() => {
      expect(
        queryAllByTestId(TrendingViewSelectorsIDs.EXPLORE_DAPPS_SCROLL_VIEW),
      ).toHaveLength(1);
      expect(getByText(strings('trending.ecosystems'))).toBeOnTheScreen();
    });
  });

  it('user can search for a trending token from the explore feed', async () => {
    const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
      ).toBeOnTheScreen();
    });

    const searchButton = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON,
    );
    await actButtonPress(searchButton);

    const searchInput = await findByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
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

  it('exits search mode when cancel is pressed and restores the search button', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
      ).toBeOnTheScreen();
    });

    await actButtonPress(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
    );

    const searchInput = await findByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, 'test');

    await findByTestId(TrendingViewSelectorsIDs.TRENDING_SEARCH_RESULTS_LIST);

    await actButtonPress(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_CANCEL_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT),
      ).not.toBeOnTheScreen();
    });
  });

  it('opens RWAs full view via View All and returns to the feed', async () => {
    const { getByTestId, findByTestId } = renderTrendingViewWithRoutes();

    await navigateToExploreTab(EXPLORE_TAB_TEST_IDS.RWAS, getByTestId);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_STOCKS),
      ).toBeOnTheScreen();
    });

    await actButtonPress(
      getByTestId(TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_STOCKS),
    );

    expect(
      await findByTestId(TrendingViewSelectorsIDs.RWA_TOKENS_HEADER),
    ).toBeOnTheScreen();

    await actButtonPress(
      await findByTestId(
        TrendingViewSelectorsIDs.RWA_TOKENS_HEADER_BACK_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_RWAS_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });
  });

  // E2E-only: trending-browser.spec.ts (Explore → Browser → TestDApp WebView)
  // and trending-feed Predictions/Perps sections (need predict/perps API mocks).
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

    // Trending tokens and their View All button are in the Crypto tab
    await navigateToCryptoTab(getByTestId);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS),
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
    const { findByPlaceholderText, getByTestId, queryByTestId } =
      renderTrendingViewWithRoutes();

    // Trending tokens and their View All button are in the Crypto tab
    await navigateToCryptoTab(getByTestId);

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.SECTION_HEADER_VIEW_ALL_TOKENS),
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

    const searchInput = await findByPlaceholderText(
      strings('trending.search_placeholder'),
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
