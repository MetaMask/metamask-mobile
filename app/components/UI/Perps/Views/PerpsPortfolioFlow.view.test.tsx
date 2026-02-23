/**
 * Portfolio & Account Flow — E2E-like view test.
 *
 * Simulates a trader exploring the Perps tab, browsing their portfolio,
 * reviewing positions (empty and populated), encountering geo-restrictions,
 * navigating to the market list, checking the watchlist, seeing the
 * first-time empty state, and selecting margin adjustment actions.
 *
 * Components covered: PerpsTabView, PerpsHomeView, PerpsPositionsView,
 * PerpsEmptyState, PerpsSelectAdjustMarginActionView
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  renderPerpsTabView,
  renderPerpsHomeView,
  renderPerpsPositionsView,
  renderPerpsSelectAdjustMarginActionView,
  renderPerpsView,
  defaultPositionForViews,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsTabViewSelectorsIDs,
  PerpsPositionsViewSelectorsIDs,
} from '../Perps.testIds';
import { PerpsEmptyState } from './PerpsEmptyState/PerpsEmptyState';

const MARKET_LIST_ROUTE = Routes.PERPS.MARKET_LIST;

const OPEN_POSITION = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.2',
  leverage: { value: 10, type: 'isolated' as const },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

describe('Portfolio & Account Flow', () => {
  it('trader explores perps tab, browses positions, handles geo-restrictions, and adjusts margin', async () => {
    // ── PHASE 1: Perps Tab — Explore section ─────────────────────────────
    // Trader opens the Perps tab for the first time — sees explore copy
    renderPerpsTabView();
    await expect(
      screen.findByText(strings('perps.home.explore_markets')),
    ).resolves.toBeOnTheScreen();
    await expect(
      screen.findByText(strings('perps.home.see_all_perps')),
    ).resolves.toBeOnTheScreen();

    // Verify control bar and scroll are present (connected state)
    expect(
      await screen.findByTestId(PerpsTabViewSelectorsIDs.BALANCE_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(PerpsTabViewSelectorsIDs.SCROLL_VIEW),
    ).toBeOnTheScreen();

    // ── PHASE 2: "See all perps" navigates to market list ────────────────
    cleanup();
    renderPerpsTabView({ extraRoutes: [{ name: MARKET_LIST_ROUTE }] });
    const seeAllPerps = await screen.findByText(
      strings('perps.home.see_all_perps'),
    );
    fireEvent.press(seeAllPerps);
    expect(screen.getByTestId(`route-${MARKET_LIST_ROUTE}`)).toBeOnTheScreen();

    // ── PHASE 3: Watchlist section with favourited markets ───────────────
    cleanup();
    renderPerpsTabView({
      overrides: {
        engine: {
          backgroundState: {
            PerpsController: {
              watchlistMarkets: { mainnet: ['ETH'], testnet: [] },
            },
          },
        },
      },
      streamOverrides: {
        marketData: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            maxLeverage: '50x',
            price: '$2,000',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
          },
          {
            symbol: 'BTC',
            name: 'Bitcoin',
            maxLeverage: '50x',
            price: '$50,000',
            change24h: '$0',
            change24hPercent: '0%',
            volume: '$1M',
          },
        ],
      },
    });
    expect(
      await screen.findByText(strings('perps.home.watchlist')),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('ETH').length).toBeGreaterThan(0);

    // ── PHASE 4: Geo-restricted user presses "Close all" on tab view ─────
    cleanup();
    renderPerpsTabView({
      overrides: {
        engine: {
          backgroundState: { PerpsController: { isEligible: false } },
        },
      },
      streamOverrides: { positions: [OPEN_POSITION] },
    });
    const closeAllButton = await screen.findByText(
      strings('perps.home.close_all'),
    );
    fireEvent.press(closeAllButton);
    expect(
      await screen.findByTestId(
        PerpsTabViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).toBeOnTheScreen();

    // ── PHASE 5: Home view — header, positions, and geo-restriction ──────
    // Trader navigates to home: header and back button present
    cleanup();
    renderPerpsHomeView();
    expect(await screen.findByTestId('perps-home')).toBeOnTheScreen();
    expect(
      await screen.findByTestId('perps-home-back-button'),
    ).toBeOnTheScreen();

    // Home with positions: positions section title visible
    cleanup();
    renderPerpsHomeView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(
      await screen.findByText(strings('perps.home.positions')),
    ).toBeOnTheScreen();

    // Geo-restricted user: pressing positions shows geo block tooltip
    cleanup();
    renderPerpsHomeView({
      overrides: {
        engine: {
          backgroundState: { PerpsController: { isEligible: false } },
        },
      },
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    const positionsTitle = await screen.findByText(
      strings('perps.home.positions'),
    );
    fireEvent.press(positionsTitle);
    expect(
      await screen.findByTestId('perps-home-close-all-geo-block-tooltip'),
    ).toBeOnTheScreen();

    // Eligible user: header and positions section both visible
    cleanup();
    renderPerpsHomeView({
      overrides: {
        engine: {
          backgroundState: { PerpsController: { isEligible: true } },
        },
      },
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(await screen.findByTestId('perps-home')).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.home.positions')),
    ).toBeOnTheScreen();

    // ── PHASE 6: Positions view — empty vs populated ─────────────────────
    // No positions: back button, account summary, empty state message
    cleanup();
    renderPerpsPositionsView({ streamOverrides: { positions: [] } });
    expect(
      await screen.findByTestId(PerpsPositionsViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.account.summary_title')),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.list.empty_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.list.empty_description')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION),
    ).not.toBeOnTheScreen();

    // With positions: positions section appears, empty state hidden
    cleanup();
    renderPerpsPositionsView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(
      await screen.findByTestId(PerpsPositionsViewSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText(strings('perps.position.account.summary_title')),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.list.open_positions')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.position.list.empty_title')),
    ).not.toBeOnTheScreen();

    // ── PHASE 7: First-time empty state — start trading ──────────────────
    cleanup();
    const onAction = jest.fn();
    const EmptyScreen = () => <PerpsEmptyState onAction={onAction} />;
    renderPerpsView(
      EmptyScreen as unknown as React.ComponentType,
      'PerpsEmptyState',
    );
    expect(
      await screen.findByText(
        strings('perps.position.list.first_time_description'),
      ),
    ).toBeOnTheScreen();
    const startButton = screen.getByText(
      strings('perps.position.list.start_trading'),
    );
    fireEvent.press(startButton);
    expect(onAction).toHaveBeenCalledTimes(1);
    // UI remains stable after pressing start trading
    expect(
      screen.getByText(strings('perps.position.list.first_time_description')),
    ).toBeOnTheScreen();

    // ── PHASE 8: Adjust margin action selection ──────────────────────────
    cleanup();
    renderPerpsSelectAdjustMarginActionView();
    expect(
      await screen.findByText(strings('perps.adjust_margin.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.add_margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.add_margin_description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.reduce_margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.adjust_margin.reduce_margin_description'),
      ),
    ).toBeOnTheScreen();
    // Trader presses Add Margin and Remove Margin
    fireEvent.press(
      screen.getByText(strings('perps.adjust_margin.add_margin')),
    );
    cleanup();
    renderPerpsSelectAdjustMarginActionView();
    fireEvent.press(
      await screen.findByText(strings('perps.adjust_margin.reduce_margin')),
    );
  });
});
