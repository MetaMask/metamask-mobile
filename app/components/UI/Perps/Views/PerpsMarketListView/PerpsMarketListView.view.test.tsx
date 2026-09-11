/**
 * Component view tests for PerpsMarketListView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug regression 7.64: market list renders with default state and shows all categories when data includes them.
 * Run with: yarn jest -c jest.config.view.js PerpsMarketListView.view.test
 */
import '../../../../../../tests/component-view/mocks';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderPerpsMarketListView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { strings } from '../../../../../../locales/i18n';
import {
  PerpsMarketListViewSelectorsIDs,
  getPerpsMarketRowItemSelector,
} from '../../Perps.testIds';
import { PERPS_SHOW_FULL_ASSET_NAMES_FLAG_KEY } from '../../selectors/featureFlags';
import { PerpsMarketData } from '@metamask/perps-controller';

const TIMEOUT_MS = 5000;

/** Crypto market (no HIP-3): counted in marketCounts.crypto */
const cryptoMarket: PerpsMarketData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '50x',
  price: '$50,000',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$1M',
  openInterest: '$500K',
};

/** Commodity market (HIP-3): counted in marketCounts.commodities so "Commodities" badge appears */
const commodityMarket: PerpsMarketData = {
  symbol: 'XAU',
  name: 'Gold',
  maxLeverage: '25x',
  price: '$2,000',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$500K',
  openInterest: '$250K',
  marketType: 'commodity',
  isHip3: true,
};

/** Stock market (HIP-3): counted in marketCounts.stocks so "Stocks" badge appears */
const stockMarket: PerpsMarketData = {
  symbol: 'AAPL',
  name: 'Apple',
  maxLeverage: '10x',
  price: '$180',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$200M',
  openInterest: '$50M',
  marketType: 'stock',
  isHip3: true,
};

/** Forex market (HIP-3): counted in marketCounts.forex so "Forex" badge appears */
const forexMarket: PerpsMarketData = {
  symbol: 'EUR',
  name: 'Euro',
  maxLeverage: '20x',
  price: '$1.09',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$5B',
  openInterest: '$1B',
  marketType: 'forex',
  isHip3: true,
};

const marketDataWithCategories = [cryptoMarket, commodityMarket];

describe('PerpsMarketListView', () => {
  describe('Bug regression: 25571', () => {
    it('renders market list header and list with default state (no category filtering)', async () => {
      renderPerpsMarketListView();

      expect(await screen.findByText('Markets')).toBeOnTheScreen();
    });

    it('shows Crypto and Commodities category badges when market data includes both types', async () => {
      renderPerpsMarketListView({
        streamOverrides: { marketData: marketDataWithCategories },
      });

      expect(await screen.findByText('Markets')).toBeOnTheScreen();

      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;
      const cryptoBadge = screen.getByTestId(
        `${sortFiltersId}-categories-crypto`,
      );
      const commoditiesBadge = screen.getByTestId(
        `${sortFiltersId}-categories-commodity`,
      );
      expect(cryptoBadge).toBeOnTheScreen();
      expect(commoditiesBadge).toBeOnTheScreen();

      fireEvent.press(cryptoBadge);
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).toHaveTextContent('BTC');
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).not.toBeOnTheScreen();
      });

      fireEvent.press(commoditiesBadge);
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).toHaveTextContent('XAU');
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
      });
    });

    it('shows the search empty state when search matches nothing and no category filter is active', async () => {
      renderPerpsMarketListView({
        streamOverrides: { marketData: marketDataWithCategories },
      });

      const searchInput = await screen.findByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_BAR,
      );
      fireEvent.changeText(searchInput, 'ZZZ-NOT-FOUND');

      await waitFor(() => {
        expect(
          screen.getByText(
            strings('perps.no_tokens_found_description', {
              searchQuery: 'ZZZ-NOT-FOUND',
            }),
          ),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).not.toBeOnTheScreen();
      });
    });

    it('shows the filter-aware empty state when search matches nothing and a category filter is active', async () => {
      renderPerpsMarketListView({
        streamOverrides: { marketData: marketDataWithCategories },
        initialParams: { defaultMarketTypeFilter: 'commodity' },
      });

      const searchInput = await screen.findByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_BAR,
      );
      fireEvent.changeText(searchInput, 'ZZZ-NOT-FOUND');

      await waitFor(() => {
        expect(
          screen.getByText(
            strings('perps.no_markets_search_description', {
              searchQuery: 'ZZZ-NOT-FOUND',
            }),
          ),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).not.toBeOnTheScreen();
      });
    });

    it('shows empty watchlist state when view starts in watchlist-only mode with no favorites', async () => {
      renderPerpsMarketListView({
        initialParams: { showWatchlistOnly: true },
        streamOverrides: { marketData: marketDataWithCategories },
      });

      expect(
        await screen.findByText(strings('perps.watchlist.empty_subtitle')),
      ).toBeOnTheScreen();
    });
  });

  describe('Full asset names feature flag', () => {
    it('shows ticker symbols on the asset label by default (flag off)', async () => {
      renderPerpsMarketListView({
        streamOverrides: { marketData: marketDataWithCategories },
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).toHaveTextContent('BTC');
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).toHaveTextContent('XAU');
      });
      expect(screen.queryByText('Bitcoin')).not.toBeOnTheScreen();
      expect(screen.queryByText('Gold')).not.toBeOnTheScreen();
    });

    it('shows full asset names on the asset label when perpsShowFullAssetNames is enabled', async () => {
      renderPerpsMarketListView({
        streamOverrides: { marketData: marketDataWithCategories },
        overrides: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  [PERPS_SHOW_FULL_ASSET_NAMES_FLAG_KEY]: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).toHaveTextContent('Bitcoin');
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).toHaveTextContent('Gold');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HIP3 market category filters
  // ─────────────────────────────────────────────────────────────────────────

  describe('HIP3 market category filters', () => {
    it('stock tab shows only stock markets and hides all other categories', async () => {
      // Arrange – seed crypto + stock
      renderPerpsMarketListView({
        streamOverrides: { marketData: [cryptoMarket, stockMarket] },
      });

      await screen.findByText('Markets');

      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;
      const stockBadge = screen.getByTestId(
        `${sortFiltersId}-categories-stock`,
      );
      expect(stockBadge).toBeOnTheScreen();

      // Act – select the stock category
      fireEvent.press(stockBadge);

      // Assert – only AAPL visible; BTC is hidden
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('AAPL')),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
      });
    });

    it('forex tab shows only forex markets and hides all other categories', async () => {
      // Arrange – seed crypto + commodity + forex
      renderPerpsMarketListView({
        streamOverrides: {
          marketData: [cryptoMarket, commodityMarket, forexMarket],
        },
      });

      await screen.findByText('Markets');

      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;
      const forexBadge = screen.getByTestId(
        `${sortFiltersId}-categories-forex`,
      );
      expect(forexBadge).toBeOnTheScreen();

      // Act – select the forex category
      fireEvent.press(forexBadge);

      // Assert – only EUR visible; BTC and XAU are hidden
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('EUR')),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('XAU')),
        ).not.toBeOnTheScreen();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Filter + search compound state
  // ─────────────────────────────────────────────────────────────────────────

  describe('Filter + search compound state', () => {
    it('search within an active stock filter scopes results to matching stocks; cross-category search shows filter-aware empty state', async () => {
      // Arrange – seed crypto + stock so the stock badge appears
      renderPerpsMarketListView({
        streamOverrides: { marketData: [cryptoMarket, stockMarket] },
      });

      await screen.findByText('Markets');
      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;

      // Apply the stock filter first
      fireEvent.press(screen.getByTestId(`${sortFiltersId}-categories-stock`));
      await waitFor(() => {
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
      });

      const searchInput = screen.getByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_BAR,
      );

      // Searching for the stock market name keeps AAPL visible
      fireEvent.changeText(searchInput, 'AAPL');
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('AAPL')),
        ).toBeOnTheScreen();
      });

      // Searching for a crypto symbol while stock filter is active: BTC is in the data
      // but the stock filter gates it — the filter-aware empty state must appear, not BTC
      fireEvent.changeText(searchInput, 'BTC');
      await waitFor(() => {
        expect(
          screen.getByText(
            strings('perps.no_markets_search_description', {
              searchQuery: 'BTC',
            }),
          ),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
      });
    });

    it('filter-only empty state appears when stream removes all markets for the active category; CTA resets filter', async () => {
      // Arrange – start with crypto + stock so the stock badge is visible
      const { stream } = renderPerpsMarketListView({
        streamOverrides: { marketData: [cryptoMarket, stockMarket] },
      });

      await screen.findByText('Markets');
      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;

      // Apply the stock filter and verify AAPL is shown
      fireEvent.press(screen.getByTestId(`${sortFiltersId}-categories-stock`));
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('AAPL')),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
      });

      // Act – stream removes the stock market; only crypto remains
      act(() => {
        stream.emitMarketData([cryptoMarket]);
      });

      // Assert – filter-only empty state container appears (no search term active)
      await waitFor(
        () => {
          expect(
            screen.getByTestId(
              PerpsMarketListViewSelectorsIDs.NO_RESULTS_FILTER,
            ),
          ).toBeOnTheScreen();
          expect(
            screen.queryByTestId(
              getPerpsMarketRowItemSelector.assetLabel('AAPL'),
            ),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );

      // Act – press the CTA to clear the active filter
      fireEvent.press(
        screen.getByTestId(PerpsMarketListViewSelectorsIDs.EMPTY_STATE_CTA),
      );

      // Assert – filter resets; the crypto market reappears and the empty state is gone
      await waitFor(
        () => {
          expect(
            screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
          ).toBeOnTheScreen();
          expect(
            screen.queryByTestId(
              PerpsMarketListViewSelectorsIDs.NO_RESULTS_FILTER,
            ),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );
    });

    it('markets added by stream while a category filter is active appear only if they match the active category', async () => {
      // Arrange – start with crypto + one stock market; apply the stock filter
      const { stream } = renderPerpsMarketListView({
        streamOverrides: { marketData: [cryptoMarket, stockMarket] },
      });

      await screen.findByText('Markets');
      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;

      fireEvent.press(
        await screen.findByTestId(`${sortFiltersId}-categories-stock`),
      );
      await waitFor(() => {
        expect(
          screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('AAPL')),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId(getPerpsMarketRowItemSelector.assetLabel('BTC')),
        ).not.toBeOnTheScreen();
      });

      // Prepare a second stock market and an extra crypto market
      const tslaMarket: PerpsMarketData = {
        symbol: 'TSLA',
        name: 'Tesla',
        maxLeverage: '10x',
        price: '$220',
        change24h: '$0',
        change24hPercent: '0%',
        volume: '$100M',
        openInterest: '$30M',
        marketType: 'stock',
        isHip3: true,
      };
      const ethMarket: PerpsMarketData = {
        symbol: 'ETH',
        name: 'Ethereum',
        maxLeverage: '50x',
        price: '$2,500',
        change24h: '$0',
        change24hPercent: '0%',
        volume: '$500M',
        openInterest: '$200M',
      };

      // Act – stream delivers additional markets from different categories
      act(() => {
        stream.emitMarketData([
          cryptoMarket,
          stockMarket,
          tslaMarket,
          ethMarket,
        ]);
      });

      // Assert – the new stock market appears; the extra crypto does not
      await waitFor(
        () => {
          expect(
            screen.getByTestId(
              getPerpsMarketRowItemSelector.assetLabel('TSLA'),
            ),
          ).toBeOnTheScreen();
          expect(
            screen.queryByTestId(
              getPerpsMarketRowItemSelector.assetLabel('ETH'),
            ),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );
      // Original stock market remains visible
      expect(
        screen.getByTestId(getPerpsMarketRowItemSelector.assetLabel('AAPL')),
      ).toBeOnTheScreen();
    });
  });
});
