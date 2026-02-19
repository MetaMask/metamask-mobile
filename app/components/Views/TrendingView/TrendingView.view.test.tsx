import '../../../util/test/component-view/mocks';
import {
  describeForPlatforms,
  itForPlatforms,
} from '../../../util/test/platform';
import { renderTrendingViewWithRoutes } from '../../../util/test/component-view/renderers/trending';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockTrendingTokensData,
  mockBnbChainToken,
  getTrendingTokensMock,
} from '../../../util/test/component-view/mocks/trendingApiMocks';
import {
  fireEvent,
  waitFor,
  within,
  userEvent,
} from '@testing-library/react-native';

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

describeForPlatforms('ExploreFeed - Component Tests', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  itForPlatforms(
    'user sees trending tokens section with mocked data',
    async () => {
      const { findByText, findByTestId } = renderTrendingViewWithRoutes();

      await waitFor(async () => {
        expect(await findByText('Ethereum')).toBeOnTheScreen();
      });

      const ethereumRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
      );
      const ethereumRowScope = within(ethereumRow);
      expect(ethereumRowScope.getByText('Ethereum')).toBeOnTheScreen();
      expect(ethereumRowScope.getByText(/\+5\.2/)).toBeOnTheScreen();

      const bitcoinRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
      );
      const bitcoinRowScope = within(bitcoinRow);
      expect(bitcoinRowScope.getByText('Bitcoin')).toBeOnTheScreen();
      expect(bitcoinRowScope.getByText(/-2\.5/)).toBeOnTheScreen();

      const uniswapRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      );
      const uniswapRowScope = within(uniswapRow);
      expect(uniswapRowScope.getByText('Uniswap')).toBeOnTheScreen();
      expect(uniswapRowScope.getByText(/\+12\.8/)).toBeOnTheScreen();
    },
  );

  itForPlatforms('user navigates to trending tokens full view', async () => {
    const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const viewAllButton = getByTestId('section-header-view-all-tokens');
    await userEvent.press(viewAllButton);

    await waitFor(() => {
      const header = getByTestId('trending-tokens-header');
      expect(header).toBeOnTheScreen();
      expect(within(header).getByText('Trending tokens')).toBeOnTheScreen();
    });

    const ethereumRow = await findByTestId(
      'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
    );
    const ethereumRowScope = within(ethereumRow);
    expect(ethereumRowScope.getByText('Ethereum')).toBeOnTheScreen();
    expect(ethereumRowScope.getByText(/\$2,000/)).toBeOnTheScreen();
    expect(ethereumRowScope.getByText(/\+5\.2/)).toBeOnTheScreen();

    const bitcoinRow = await findByTestId(
      'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
    );
    const bitcoinRowScope = within(bitcoinRow);
    expect(bitcoinRowScope.getByText('Bitcoin')).toBeOnTheScreen();
    expect(bitcoinRowScope.getByText(/\$45,000/)).toBeOnTheScreen();
    expect(bitcoinRowScope.getByText(/-2\.5/)).toBeOnTheScreen();

    const uniswapRow = await findByTestId(
      'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    );
    const uniswapRowScope = within(uniswapRow);
    expect(uniswapRowScope.getByText('Uniswap')).toBeOnTheScreen();
    expect(uniswapRowScope.getByText(/\$8\.50/)).toBeOnTheScreen();
    expect(uniswapRowScope.getByText(/\+12\.8/)).toBeOnTheScreen();
  });

  // TODO: Skipped — ExploreSearchScreen unconditionally wraps content in
  // PerpsConnectionProvider, which blocks rendering until a WebSocket connection
  // is established. Without mocking the Perps connection singleton, the search
  // results list never mounts.
  // https://github.com/MetaMask/metamask-mobile/issues/26269
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('user can search for a trending token from the explore feed', async () => {
    const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeOnTheScreen();
    });

    const searchButton = getByTestId('explore-view-search-button');
    await userEvent.press(searchButton);

    const searchInput = await findByTestId('explore-view-search-input');
    expect(searchInput).toBeOnTheScreen();

    await userEvent.type(searchInput, 'ethereum');

    await waitFor(
      async () => {
        const searchResultsList = await findByTestId(
          'trending-search-results-list',
        );
        const withinResults = within(searchResultsList);

        const ethereumRow = withinResults.getByTestId(
          'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
        );
        const ethereumRowScope = within(ethereumRow);

        expect(ethereumRowScope.getByText('Ethereum')).toBeOnTheScreen();
        expect(ethereumRowScope.getByText(/\$2,000/)).toBeOnTheScreen();
        expect(ethereumRowScope.getByText(/\+5\.2/)).toBeOnTheScreen();
      },
      { timeout: 3000 },
    );
  });
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

      const { findByTestId, findByText, getByTestId, queryByTestId } =
        renderTrendingViewWithRoutes();

      await waitFor(() => {
        expect(
          getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
        ).toBeOnTheScreen();
      });

      const viewAllButton = getByTestId('section-header-view-all-tokens');
      await userEvent.press(viewAllButton);

      await waitFor(() => {
        expect(getByTestId('trending-tokens-header')).toBeOnTheScreen();
      });

      const ethereumRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
      );
      expect(ethereumRow).toBeOnTheScreen();

      const networkButton = getByTestId('all-networks-button');
      await userEvent.press(networkButton);

      await waitFor(() => {
        expect(getByTestId('close-button')).toBeOnTheScreen();
      });

      const bnbNetworkOption = await findByText('BNB Chain');
      expect(bnbNetworkOption).toBeOnTheScreen();

      await userEvent.press(bnbNetworkOption);

      const bnbTokenRow = await findByTestId(
        'trending-token-row-item-eip155:56/erc20:0xBTC0000000000000000000000000000000000000',
      );
      expect(bnbTokenRow).toBeOnTheScreen();
      const bnbTokenRowScope = within(bnbTokenRow);
      expect(bnbTokenRowScope.getByText('Bitcoin BNB')).toBeOnTheScreen();
      expect(bnbTokenRowScope.getByText(/\$44,500/)).toBeOnTheScreen();
      expect(bnbTokenRowScope.getByText(/-1\.8/)).toBeOnTheScreen();

      expect(
        queryByTestId(
          'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
        ),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(
          'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
        ),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(
          'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        ),
      ).not.toBeOnTheScreen();
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
    await userEvent.press(viewAllButton);

    await waitFor(() => {
      expect(getByTestId('trending-tokens-header')).toBeOnTheScreen();
    });

    const searchToggle = getByTestId('trending-tokens-header-search-toggle');
    fireEvent.press(searchToggle);

    const searchInput = await findByTestId('trending-tokens-header-search-bar');
    expect(searchInput).toBeOnTheScreen();

    await userEvent.type(searchInput, 'ethereum');

    await waitFor(
      async () => {
        const tokenRow = await findByTestId(
          'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
        );
        expect(tokenRow).toBeOnTheScreen();
        expect(
          queryByTestId(
            'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
          ),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId(
            'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          ),
        ).not.toBeOnTheScreen();
      },
      { timeout: 2000 },
    );
  });
});
