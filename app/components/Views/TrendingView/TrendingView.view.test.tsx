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
  mockSearchResultsEth,
  mockBnbChainToken,
} from '../../../util/test/component-view/mocks/trendingApiMocks';
import { fireEvent, waitFor, act, within } from '@testing-library/react-native';
import React from 'react';
import { getTrendingTokens } from '@metamask/assets-controllers';

/* eslint-disable no-restricted-syntax */
jest.mock(
  '../../../components/UI/Perps/providers/PerpsConnectionProvider',
  () => ({
    PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  }),
);

jest.mock('../../../components/UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  usePerpsStream: () => ({
    prices: {
      subscribeToSymbols: jest.fn(() => jest.fn()),
      subscribe: jest.fn(() => jest.fn()),
    },
    positions: { subscribe: jest.fn(() => jest.fn()) },
    orders: { subscribe: jest.fn(() => jest.fn()) },
    fills: { subscribe: jest.fn(() => jest.fn()) },
    account: { subscribe: jest.fn(() => jest.fn()) },
    marketData: {
      subscribe: jest.fn(() => jest.fn()),
      getMarkets: jest.fn(() => []),
    },
    oiCaps: { subscribe: jest.fn(() => jest.fn()) },
  }),
}));
/* eslint-enable no-restricted-syntax */

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
        expect(await findByText('Ethereum')).toBeTruthy();
      });

      const ethereumRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
      );
      const ethereumRowScope = within(ethereumRow);
      expect(ethereumRowScope.getByText('Ethereum')).toBeTruthy();
      expect(ethereumRowScope.getByText(/\+5\.2/)).toBeTruthy();

      const bitcoinRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
      );
      const bitcoinRowScope = within(bitcoinRow);
      expect(bitcoinRowScope.getByText('Bitcoin')).toBeTruthy();
      expect(bitcoinRowScope.getByText(/-2\.5/)).toBeTruthy();

      const uniswapRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      );
      const uniswapRowScope = within(uniswapRow);
      expect(uniswapRowScope.getByText('Uniswap')).toBeTruthy();
      expect(uniswapRowScope.getByText(/\+12\.8/)).toBeTruthy();
    },
  );

  itForPlatforms('user navigates to trending tokens full view', async () => {
    const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeTruthy();
    });

    const viewAllButton = getByTestId('section-header-view-all-tokens');

    await act(async () => {
      fireEvent.press(viewAllButton);
    });

    await waitFor(() => {
      const header = getByTestId('trending-tokens-header');
      expect(header).toBeTruthy();
      expect(within(header).getByText('Trending tokens')).toBeTruthy();
    });

    const ethereumRow = await findByTestId(
      'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
    );
    const ethereumRowScope = within(ethereumRow);
    expect(ethereumRowScope.getByText('Ethereum')).toBeTruthy();
    expect(ethereumRowScope.getByText(/\$2,000/)).toBeTruthy();
    expect(ethereumRowScope.getByText(/\+5\.2/)).toBeTruthy();

    const bitcoinRow = await findByTestId(
      'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
    );
    const bitcoinRowScope = within(bitcoinRow);
    expect(bitcoinRowScope.getByText('Bitcoin')).toBeTruthy();
    expect(bitcoinRowScope.getByText(/\$45,000/)).toBeTruthy();
    expect(bitcoinRowScope.getByText(/-2\.5/)).toBeTruthy();

    const uniswapRow = await findByTestId(
      'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    );
    const uniswapRowScope = within(uniswapRow);
    expect(uniswapRowScope.getByText('Uniswap')).toBeTruthy();
    expect(uniswapRowScope.getByText(/\$8\.50/)).toBeTruthy();
    expect(uniswapRowScope.getByText(/\+12\.8/)).toBeTruthy();
  });

  itForPlatforms(
    'user can search for a trending token from the explore feed',
    async () => {
      const { findByTestId, getByTestId } = renderTrendingViewWithRoutes();

      await waitFor(() => {
        expect(
          getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
        ).toBeTruthy();
      });

      const searchButton = getByTestId('explore-view-search-button');

      await act(async () => {
        fireEvent.press(searchButton);
      });

      const searchInput = await findByTestId('explore-view-search-input');
      expect(searchInput).toBeTruthy();

      await act(async () => {
        fireEvent.changeText(searchInput, 'ethereum');
      });

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

          expect(ethereumRowScope.getByText('Ethereum')).toBeTruthy();
          expect(ethereumRowScope.getByText(/\$2,000/)).toBeTruthy();
          expect(ethereumRowScope.getByText(/\+5\.2/)).toBeTruthy();
        },
        { timeout: 3000 },
      );
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
      (getTrendingTokens as jest.Mock).mockImplementation(
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
        ).toBeTruthy();
      });

      const viewAllButton = getByTestId('section-header-view-all-tokens');

      await act(async () => {
        fireEvent.press(viewAllButton);
      });

      await waitFor(() => {
        expect(getByTestId('trending-tokens-header')).toBeTruthy();
      });

      const ethereumRow = await findByTestId(
        'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
      );
      expect(ethereumRow).toBeTruthy();

      const networkButton = getByTestId('all-networks-button');

      await act(async () => {
        fireEvent.press(networkButton);
      });

      await waitFor(() => {
        expect(getByTestId('close-button')).toBeTruthy();
      });

      const bnbNetworkOption = await findByText('BNB Chain');
      expect(bnbNetworkOption).toBeTruthy();

      await act(async () => {
        fireEvent.press(bnbNetworkOption);
      });

      const bnbTokenRow = await findByTestId(
        'trending-token-row-item-eip155:56/erc20:0xBTC0000000000000000000000000000000000000',
      );
      expect(bnbTokenRow).toBeTruthy();
      const bnbTokenRowScope = within(bnbTokenRow);
      expect(bnbTokenRowScope.getByText('Bitcoin BNB')).toBeTruthy();
      expect(bnbTokenRowScope.getByText(/\$44,500/)).toBeTruthy();
      expect(bnbTokenRowScope.getByText(/-1\.8/)).toBeTruthy();

      expect(
        queryByTestId(
          'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
        ),
      ).toBeNull();
      expect(
        queryByTestId(
          'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
        ),
      ).toBeNull();
      expect(
        queryByTestId(
          'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        ),
      ).toBeNull();
    },
  );

  itForPlatforms('user can search on trending tokens full view', async () => {
    setupTrendingApiFetchMock(mockSearchResultsEth);

    const { findByTestId, getByTestId, queryByTestId } =
      renderTrendingViewWithRoutes();

    await waitFor(() => {
      expect(
        getByTestId(TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW),
      ).toBeTruthy();
    });

    const viewAllButton = getByTestId('section-header-view-all-tokens');

    await act(async () => {
      fireEvent.press(viewAllButton);
    });

    await waitFor(() => {
      expect(getByTestId('trending-tokens-header')).toBeTruthy();
    });

    const searchToggle = getByTestId('trending-tokens-header-search-toggle');

    await act(async () => {
      fireEvent.press(searchToggle);
    });

    const searchInput = await findByTestId('trending-tokens-header-search-bar');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(searchInput, 'ethereum');
    });

    await waitFor(
      async () => {
        const tokenRow = await findByTestId(
          'trending-token-row-item-eip155:1/erc20:0x0000000000000000000000000000000000000000',
        );
        expect(tokenRow).toBeTruthy();
        expect(
          queryByTestId(
            'trending-token-row-item-eip155:1/erc20:0x1234567890123456789012345678901234567890',
          ),
        ).toBeNull();
        expect(
          queryByTestId(
            'trending-token-row-item-eip155:1/erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          ),
        ).toBeNull();
      },
      { timeout: 2000 },
    );
  });
});
