/**
 * Component view tests for PerpsMarketListView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug regression 7.64: market list renders with default state and shows all categories when data includes them.
 * Run with: yarn jest -c jest.config.view.js PerpsMarketListView.view.test
 */
import '../../../../../../tests/component-view/mocks';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderPerpsMarketListView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { strings } from '../../../../../../locales/i18n';
import {
  PerpsMarketListViewSelectorsIDs,
  getPerpsMarketRowItemSelector,
} from '../../Perps.testIds';
import { PERPS_SHOW_FULL_ASSET_NAMES_FLAG_KEY } from '../../selectors/featureFlags';
import { PerpsMarketData } from '@metamask/perps-controller';

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

    it('shows empty search state when query does not match any market', async () => {
      renderPerpsMarketListView({
        streamOverrides: { marketData: marketDataWithCategories },
      });

      const searchInput = await screen.findByTestId(
        PerpsMarketListViewSelectorsIDs.SEARCH_BAR,
      );
      fireEvent.changeText(searchInput, 'ZZZ-NOT-FOUND');

      await waitFor(() => {
        expect(
          screen.getByText(strings('perps.no_tokens_found')),
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
      expect(screen.queryByText('BTC')).not.toBeOnTheScreen();
      expect(screen.queryByText('XAU')).not.toBeOnTheScreen();
    });
  });
});
