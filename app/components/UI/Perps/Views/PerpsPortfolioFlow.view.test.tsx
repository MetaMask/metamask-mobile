/**
 * Portfolio & Account Flow — E2E-like view test.
 *
 * Simulates a trader browsing their portfolio, reviewing positions
 * (empty and populated), encountering geo-restrictions, seeing the
 * first-time empty state, and selecting margin adjustment actions.
 *
 * Components covered: PerpsHomeView, PerpsPositionsView,
 * PerpsEmptyState, PerpsSelectAdjustMarginActionView
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, act, fireEvent, screen } from '@testing-library/react-native';
import { PerpsHomeSectionTestIds } from '../components/PerpsHomeSection/PerpsHomeSection.testIds';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsHomeView,
  renderPerpsPositionsView,
  renderPerpsSelectAdjustMarginActionView,
  renderPerpsView,
  defaultPositionForViews,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsPositionsViewSelectorsIDs } from '../Perps.testIds';
import { PerpsEmptyState } from './PerpsEmptyState/PerpsEmptyState';

const TIMEOUT_MS = 3000;

describe('Portfolio & Account Flow', () => {
  let POSITIONS: string;
  let ACCOUNT_SUMMARY_TITLE: string;
  let EMPTY_TITLE: string;
  let FIRST_TIME_DESCRIPTION: string;
  let ADD_MARGIN: string;
  let REDUCE_MARGIN: string;

  beforeAll(() => {
    POSITIONS = strings('perps.home.positions');
    ACCOUNT_SUMMARY_TITLE = strings('perps.position.account.summary_title');
    EMPTY_TITLE = strings('perps.position.list.empty_title');
    FIRST_TIME_DESCRIPTION = strings(
      'perps.position.list.first_time_description',
    );
    ADD_MARGIN = strings('perps.adjust_margin.add_margin');
    REDUCE_MARGIN = strings('perps.adjust_margin.reduce_margin');
  });

  it('browses positions, handles geo-restrictions, and adjusts margin', async () => {
    // ── PHASE 1: Home view — header, positions, and geo-restriction ──────
    // Trader navigates to home: header and back button present
    renderPerpsHomeView();
    expect(await screen.findByTestId('perps-home')).toBeOnTheScreen();
    expect(
      await screen.findByTestId('perps-home-back-button'),
    ).toBeOnTheScreen();

    // Home with positions: positions section title visible
    await act(async () => {
      cleanup();
    });
    renderPerpsHomeView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(await screen.findByText(POSITIONS)).toBeOnTheScreen();

    // Geo-restricted user: pressing positions shows geo block tooltip
    await act(async () => {
      cleanup();
    });
    renderPerpsHomeView({
      overrides: {
        engine: {
          backgroundState: { PerpsController: { isEligible: false } },
        },
      },
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    await screen.findByText(POSITIONS);
    fireEvent.press(
      await screen.findByTestId(PerpsHomeSectionTestIds.ACTION_BUTTON),
    );
    expect(
      await screen.findByTestId('perps-home-close-all-geo-block-tooltip'),
    ).toBeOnTheScreen();

    // Eligible user: header and positions section both visible
    await act(async () => {
      cleanup();
    });
    renderPerpsHomeView({
      overrides: {
        engine: {
          backgroundState: { PerpsController: { isEligible: true } },
        },
      },
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(await screen.findByTestId('perps-home')).toBeOnTheScreen();
    expect(await screen.findByText(POSITIONS)).toBeOnTheScreen();

    // ── PHASE 2: Positions view — empty vs populated ─────────────────────
    // No positions: back button, account summary, empty state message
    await act(async () => {
      cleanup();
    });
    renderPerpsPositionsView({ streamOverrides: { positions: [] } });
    await screen.findByTestId(
      PerpsPositionsViewSelectorsIDs.BACK_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );
    expect(screen.getByText(ACCOUNT_SUMMARY_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(EMPTY_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.list.empty_description')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION),
    ).not.toBeOnTheScreen();

    // With positions: positions section appears, empty state hidden
    await act(async () => {
      cleanup();
    });
    renderPerpsPositionsView({
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    await screen.findByTestId(
      PerpsPositionsViewSelectorsIDs.BACK_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );
    expect(screen.getByText(ACCOUNT_SUMMARY_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.list.open_positions')),
    ).toBeOnTheScreen();
    expect(screen.queryByText(EMPTY_TITLE)).not.toBeOnTheScreen();

    // ── PHASE 3: First-time empty state — start trading ──────────────────
    await act(async () => {
      cleanup();
    });
    const onAction = jest.fn();
    const EmptyScreen = () => <PerpsEmptyState onAction={onAction} />;
    renderPerpsView(
      EmptyScreen as unknown as React.ComponentType,
      'PerpsEmptyState',
    );
    expect(await screen.findByText(FIRST_TIME_DESCRIPTION)).toBeOnTheScreen();
    const startButton = screen.getByText(
      strings('perps.position.list.start_trading'),
    );
    fireEvent.press(startButton);
    expect(onAction).toHaveBeenCalledTimes(1);
    // UI remains stable after pressing start trading
    expect(screen.getByText(FIRST_TIME_DESCRIPTION)).toBeOnTheScreen();

    // ── PHASE 4: Adjust margin action selection ──────────────────────────
    await act(async () => {
      cleanup();
    });
    renderPerpsSelectAdjustMarginActionView();
    expect(
      await screen.findByText(strings('perps.adjust_margin.title')),
    ).toBeOnTheScreen();
    expect(screen.getByText(ADD_MARGIN)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.add_margin_description')),
    ).toBeOnTheScreen();
    expect(screen.getByText(REDUCE_MARGIN)).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.adjust_margin.reduce_margin_description'),
      ),
    ).toBeOnTheScreen();
    // Trader presses Add Margin and Remove Margin
    await act(async () => {
      fireEvent.press(screen.getByText(ADD_MARGIN));
    });
    await act(async () => {
      cleanup();
    });
    renderPerpsSelectAdjustMarginActionView();
    await act(async () => {
      fireEvent.press(await screen.findByText(REDUCE_MARGIN));
    });
  });
});
