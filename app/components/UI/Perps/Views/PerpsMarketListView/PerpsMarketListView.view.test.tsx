/**
 * Component view tests for PerpsMarketListView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Covers bug regression 7.64: market list renders with default state and shows all categories when data includes them.
 * Run with: yarn jest -c jest.config.view.js PerpsMarketListView.view.test
 */
import '../../../../../util/test/component-view/mocks';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketListView from './PerpsMarketListView';
import { renderPerpsView } from '../../../../../util/test/component-view/renderers/perps';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { PerpsMarketListViewSelectorsIDs } from '../../Perps.testIds';
import { PerpsMarketData } from '../../controllers/types';

/** Crypto market (no HIP-3): counted in marketCounts.crypto */
const cryptoMarket: PerpsMarketData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '50x',
  price: '$50,000',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$1M',
};

/** Commodity market (HIP-3): counted in marketCounts.commodity so "Commodities" badge appears */
const commodityMarket: PerpsMarketData = {
  symbol: 'XAU',
  name: 'Gold',
  maxLeverage: '25x',
  price: '$2,000',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$500K',
  marketType: 'commodity',
  isHip3: true,
};

const marketDataWithCategories = [cryptoMarket, commodityMarket];

function renderView(
  options: {
    overrides?: DeepPartial<RootState>;
    streamOverrides?: { marketData?: PerpsMarketData[] };
  } = {},
) {
  const { overrides, streamOverrides } = options;
  return renderPerpsView(
    PerpsMarketListView as unknown as React.ComponentType,
    'PerpsMarketListView',
    { overrides, streamOverrides },
  );
}

describe('PerpsMarketListView', () => {
  describe('Bug regression: #25571', () => {
    it('renders market list header and list with default state (no category filtering)', async () => {
      renderView();

      expect(await screen.findByText('Markets')).toBeOnTheScreen();
    });

    it('shows Crypto and Commodities category badges when market data includes both types', async () => {
      renderView({
        streamOverrides: { marketData: marketDataWithCategories },
      });

      expect(await screen.findByText('Markets')).toBeOnTheScreen();

      const sortFiltersId = PerpsMarketListViewSelectorsIDs.SORT_FILTERS;
      const cryptoBadge = screen.getByTestId(
        `${sortFiltersId}-categories-crypto`,
      );
      const commoditiesBadge = screen.getByTestId(
        `${sortFiltersId}-categories-commodities`,
      );
      expect(cryptoBadge).toBeOnTheScreen();
      expect(commoditiesBadge).toBeOnTheScreen();

      fireEvent.press(cryptoBadge);
      await waitFor(() => {
        expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
      });

      fireEvent.press(commoditiesBadge);
      await waitFor(() => {
        expect(screen.getByText('Gold')).toBeOnTheScreen();
      });
    });
  });
});
