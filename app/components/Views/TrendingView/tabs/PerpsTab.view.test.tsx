/**
 * Component view tests for the Explore Perps tab.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Run with: yarn jest -c jest.config.view.js PerpsTab.view.test
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { FlashList } from '@shopify/flash-list';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { renderPerpsComponent } from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  getPerpsMarketRowItemSelector,
  PerpsTabSelectorsIDs,
  PerpsWatchlistSelectorsIDs,
} from '../../../UI/Perps/Perps.testIds';
import PerpsTab, { PerpsTabContent } from './PerpsTab';

const enabledFlag = { enabled: true, minimumVersion: '0.0.0' };
const disabledFlag = { enabled: false, minimumVersion: '0.0.0' };

const btcMarket = {
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '50x',
  price: '$50,000',
  change24h: '$500',
  change24hPercent: '+5%',
  volume: '$1M',
  openInterest: '$500K',
};

const aaplMarket = {
  symbol: 'AAPL',
  name: 'Apple',
  maxLeverage: '10x',
  price: '$180',
  change24h: '$1',
  change24hPercent: '+1%',
  volume: '$200M',
  openInterest: '$50M',
  marketType: 'stock',
  isHip3: true,
};

const renderPerpsTab = (
  extraFlags: Record<string, unknown> = {},
  marketData?: unknown[],
) =>
  renderPerpsComponent(
    // PerpsTab mounts its own stream provider (the E2E mock in view tests), so
    // custom market data must go through the inner content component.
    (marketData ? PerpsTabContent : PerpsTab) as unknown as React.ComponentType<
      Record<string, unknown>
    >,
    {
      refresh: { trigger: 0, silentRefresh: true },
      refreshing: false,
      onRefresh: jest.fn(),
    },
    {
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsPerpTradingEnabled: enabledFlag,
                ...extraFlags,
              },
            },
          },
        },
      },
      ...(marketData && { streamOverrides: { marketData } }),
    },
  );

// FlashList recycles cells in place, so read the order from the list data.
const listedSymbols = () =>
  (
    screen
      .UNSAFE_getAllByType(FlashList)
      .find((list) => list.props.testID === PerpsTabSelectorsIDs.MARKET_LIST)
      ?.props.data as {
      type: string;
      market?: { symbol: string };
    }[]
  )
    .filter((row) => row.type === 'market')
    .map((row) => row.market?.symbol);

// FlashList renders the sticky filter bar twice (in-flow + overlay); use the first.
const findFilter = async (suffix: string) =>
  (
    await screen.findAllByTestId(`${PerpsTabSelectorsIDs.FILTERS}-${suffix}`)
  )[0];

const rowLabel = (symbol: string) =>
  getPerpsMarketRowItemSelector.assetLabel(symbol);

describe('PerpsTab', () => {
  it('renders every mocked market with its symbol, price and change', async () => {
    renderPerpsTab();

    const btcRow = await screen.findByTestId(
      getPerpsMarketRowItemSelector.rowItem('BTC'),
    );
    const ethRow = await screen.findByTestId(
      getPerpsMarketRowItemSelector.rowItem('ETH'),
    );

    expect(within(btcRow).getByTestId(rowLabel('BTC'))).toHaveTextContent(
      'BTC',
    );
    expect(within(btcRow).getByText('$45,000.00')).toBeOnTheScreen();
    expect(within(btcRow).getByText('+2.5%')).toBeOnTheScreen();
    expect(within(ethRow).getByTestId(rowLabel('ETH'))).toHaveTextContent(
      'ETH',
    );
    expect(within(ethRow).getByText('$2,500.00')).toBeOnTheScreen();
    expect(within(ethRow).getByText('+1.8%')).toBeOnTheScreen();
  });

  it('selects a category pill without persisting it to settings', async () => {
    const { store } = renderPerpsTab();

    expect(await screen.findByTestId(rowLabel('BTC'))).toBeOnTheScreen();

    fireEvent.press(await findFilter('categories-crypto'));

    // The mock markets are all crypto, so the category keeps both rows but must
    // not switch the list to the watchlist view.
    await waitFor(() => {
      expect(screen.getByTestId(rowLabel('BTC'))).toBeOnTheScreen();
    });
    expect(
      screen.queryByTestId(PerpsWatchlistSelectorsIDs.SUGGESTED_SECTION),
    ).not.toBeOnTheScreen();
    expect(
      store.getState().settings.perpsMarketListPreferences?.marketTypeFilter,
    ).not.toBe('crypto');
  });

  it('hides rows outside the selected category', async () => {
    renderPerpsTab({}, [btcMarket, aaplMarket]);

    expect(await screen.findByTestId(rowLabel('BTC'))).toBeOnTheScreen();
    expect(screen.getByTestId(rowLabel('AAPL'))).toBeOnTheScreen();

    fireEvent.press(await findFilter('categories-stock'));

    await waitFor(() => {
      expect(screen.queryByTestId(rowLabel('BTC'))).not.toBeOnTheScreen();
    });
    expect(screen.getByTestId(rowLabel('AAPL'))).toBeOnTheScreen();
  });

  it('reorders rows when a different sort is applied', async () => {
    renderPerpsTab();
    await screen.findByTestId(rowLabel('SOL'));
    expect(listedSymbols()).toStrictEqual(['BTC', 'ETH', 'SOL']);

    fireEvent.press(await findFilter('sort-sort-field'));
    // Default is price change high-to-low; pressing it again flips to low-to-high.
    fireEvent.press(
      await screen.findByTestId(
        `${PerpsTabSelectorsIDs.SORT_SHEET}-option-priceChange`,
      ),
    );
    fireEvent.press(
      screen.getByTestId(`${PerpsTabSelectorsIDs.SORT_SHEET}-apply`),
    );

    await waitFor(() => {
      expect(listedSymbols()).toStrictEqual(['SOL', 'ETH', 'BTC']);
    });
  });

  it('opens the sort sheet from the sort control', async () => {
    renderPerpsTab();

    expect(
      screen.queryByTestId(PerpsTabSelectorsIDs.SORT_SHEET),
    ).not.toBeOnTheScreen();
    fireEvent.press(await findFilter('sort-sort-field'));

    expect(
      await screen.findByTestId(PerpsTabSelectorsIDs.SORT_SHEET),
    ).toBeOnTheScreen();
  });

  it('shows the watchlist pill only when the watchlist flag is enabled', async () => {
    renderPerpsTab({ perpsWatchlistV2Enabled: disabledFlag });
    await findFilter('categories-all');
    expect(
      screen.queryByTestId(
        `${PerpsTabSelectorsIDs.FILTERS}-categories-watchlist`,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the watchlist pill and suggested markets when the flag is enabled', async () => {
    renderPerpsTab({ perpsWatchlistV2Enabled: enabledFlag });

    expect(
      screen.queryByTestId(PerpsWatchlistSelectorsIDs.SUGGESTED_SECTION),
    ).not.toBeOnTheScreen();
    fireEvent.press(await findFilter('categories-watchlist'));

    expect(
      await screen.findByTestId(PerpsWatchlistSelectorsIDs.SUGGESTED_SECTION),
    ).toBeOnTheScreen();
    // The empty watchlist replaces the main list, so the market count drops.
    expect(await findFilter('market-count')).toHaveTextContent(/^0 /);
  });
});
