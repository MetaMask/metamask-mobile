/**
 * Component view tests for the Explore Perps tab.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 * Run with: yarn jest -c jest.config.view.js PerpsTab.view.test
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { renderPerpsComponent } from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  getPerpsMarketRowItemSelector,
  PerpsWatchlistSelectorsIDs,
} from '../../../UI/Perps/Perps.testIds';
import PerpsTab from './PerpsTab';
import { PerpsTabSelectorsIDs } from './PerpsTab.testIds';

const enabledFlag = { enabled: true, minimumVersion: '0.0.0' };
const disabledFlag = { enabled: false, minimumVersion: '0.0.0' };

const renderPerpsTab = (extraFlags: Record<string, unknown> = {}) =>
  renderPerpsComponent(
    PerpsTab as unknown as React.ComponentType<Record<string, unknown>>,
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
    },
  );

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
