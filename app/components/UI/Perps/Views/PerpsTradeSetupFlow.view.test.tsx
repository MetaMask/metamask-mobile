/**
 * Trade Setup Flow — use-case-driven view tests.
 *
 * User journey: a trader configures trade parameters before placing an order —
 * leverage selection, limit price presets, and cross-margin warning.
 *
 * Components covered: PerpsLeverageBottomSheet, PerpsLimitPriceBottomSheet,
 * PerpsCrossMarginWarningBottomSheet
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsView,
  renderPerpsCrossMarginWarningView,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsLeverageBottomSheet from '../components/PerpsLeverageBottomSheet/PerpsLeverageBottomSheet';
import PerpsLimitPriceBottomSheet from '../components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet';

const LeverageVisibleWrapper: React.FC = () => (
  <PerpsLeverageBottomSheet
    isVisible
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    leverage={5}
    minLeverage={1}
    maxLeverage={50}
    currentPrice={2000}
    direction="long"
    asset="ETH"
  />
);

const LeverageHiddenWrapper: React.FC = () => (
  <PerpsLeverageBottomSheet
    isVisible={false}
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    leverage={5}
    minLeverage={1}
    maxLeverage={50}
    currentPrice={2000}
    direction="long"
    asset="ETH"
  />
);

const LongLimitPriceWrapper: React.FC = () => (
  <PerpsLimitPriceBottomSheet
    isVisible
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    asset="ETH"
    currentPrice={2000}
    direction="long"
  />
);

const ShortLimitPriceWrapper: React.FC = () => (
  <PerpsLimitPriceBottomSheet
    isVisible
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    asset="ETH"
    currentPrice={2000}
    direction="short"
  />
);

const LimitPriceHiddenWrapper: React.FC = () => (
  <PerpsLimitPriceBottomSheet
    isVisible={false}
    onClose={jest.fn()}
    onConfirm={jest.fn()}
    asset="ETH"
    currentPrice={2000}
    direction="long"
  />
);

describe('Trade Setup Flow', () => {
  it('trader configures leverage and limit price with direction-specific presets, and verifies sheets hide when dismissed', async () => {
    // Step 1: Open leverage sheet — see title, current 5x leverage, Set button, and quick-select presets
    renderPerpsView(LeverageVisibleWrapper, 'LeverageTest');
    expect(
      await screen.findByText(strings('perps.order.leverage_modal.title')),
    ).toBeOnTheScreen();
    const fiveXElements = screen.getAllByText('5x');
    expect(fiveXElements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        strings('perps.order.leverage_modal.set_leverage', { leverage: 5 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('2x')).toBeOnTheScreen();
    expect(screen.getByText('10x')).toBeOnTheScreen();

    // Step 2: Dismiss leverage sheet — title no longer visible
    cleanup();
    renderPerpsView(LeverageHiddenWrapper, 'LeverageTest');
    expect(
      screen.queryByText(strings('perps.order.leverage_modal.title')),
    ).not.toBeOnTheScreen();

    // Step 3: Set limit price for a LONG order — see title, Set button, Mid + Bid presets (no Ask)
    cleanup();
    renderPerpsView(LongLimitPriceWrapper, 'LimitPriceTest');
    expect(
      await screen.findByText(strings('perps.order.limit_price_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.set')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.mid_price')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.bid_price')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.ask_price')),
    ).not.toBeOnTheScreen();

    // Step 4: Switch to SHORT order — presets flip: now Mid + Ask visible, Bid hidden
    cleanup();
    renderPerpsView(ShortLimitPriceWrapper, 'LimitPriceTest');
    await screen.findByText(strings('perps.order.limit_price_modal.title'));
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.mid_price')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.ask_price')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.bid_price')),
    ).not.toBeOnTheScreen();

    // Step 5: Dismiss limit price sheet — title no longer visible
    cleanup();
    renderPerpsView(LimitPriceHiddenWrapper, 'LimitPriceTest');
    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.title')),
    ).not.toBeOnTheScreen();
  });

  it('trader sees cross-margin warning with title, message, and dismisses it', async () => {
    renderPerpsCrossMarginWarningView();
    expect(
      await screen.findByText(strings('perps.crossMargin.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.crossMargin.message')),
    ).toBeOnTheScreen();
    const dismissButton = screen.getByText(
      strings('perps.crossMargin.dismiss'),
    );
    expect(dismissButton).toBeOnTheScreen();
    fireEvent.press(dismissButton);
  });
});
