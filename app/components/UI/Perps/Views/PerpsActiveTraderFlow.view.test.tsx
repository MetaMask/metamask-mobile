/**
 * Active Trader Flow — E2E-like view test.
 *
 * Simulates a complete trading session: browse positions, review orders,
 * modify positions, flip direction, configure leverage and limit price,
 * handle cross-margin warning, then close all positions, cancel all
 * orders, and adjust margin.
 *
 * Components covered: PerpsMarketTabs, PerpsCompactOrderRow,
 * PerpsSelectModifyActionView, PerpsFlipPositionConfirmSheet,
 * PerpsCloseAllPositionsView, PerpsCancelAllOrdersView,
 * PerpsAdjustMarginActionSheet, PerpsLeverageBottomSheet,
 * PerpsLimitPriceBottomSheet, PerpsCrossMarginWarningBottomSheet
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsView,
  renderPerpsCloseAllPositionsView,
  renderPerpsCancelAllOrdersView,
  renderPerpsSelectModifyActionView,
  defaultPositionForViews,
  defaultOrderForViews,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import { getModifyActionLabels } from '../../../../../tests/component-view/helpers/perpsViewTestHelpers';
import PerpsMarketTabs from '../components/PerpsMarketTabs/PerpsMarketTabs';
import PerpsFlipPositionConfirmSheet from '../components/PerpsFlipPositionConfirmSheet/PerpsFlipPositionConfirmSheet';
import PerpsAdjustMarginActionSheet from '../components/PerpsAdjustMarginActionSheet/PerpsAdjustMarginActionSheet';
import PerpsCompactOrderRow from '../components/PerpsCompactOrderRow/PerpsCompactOrderRow';
import PerpsLeverageBottomSheet from '../components/PerpsLeverageBottomSheet/PerpsLeverageBottomSheet';
import PerpsLimitPriceBottomSheet from '../components/PerpsLimitPriceBottomSheet/PerpsLimitPriceBottomSheet';
import PerpsCrossMarginWarningBottomSheet from '../components/PerpsCrossMarginWarningBottomSheet/PerpsCrossMarginWarningBottomSheet';
import { PerpsMarketTabsSelectorsIDs } from '../Perps.testIds';
import type { Order } from '@metamask/perps-controller';

const MarketTabsDefault: React.FC = () => <PerpsMarketTabs symbol="ETH" />;
const MarketTabsPosition: React.FC = () => (
  <PerpsMarketTabs symbol="ETH" initialTab="position" />
);
const MarketTabsOrders: React.FC = () => (
  <PerpsMarketTabs symbol="ETH" initialTab="orders" />
);
const MarketTabsStatistics: React.FC = () => (
  <PerpsMarketTabs symbol="ETH" initialTab="statistics" />
);

const FlipSheetWrapper: React.FC = () => (
  <PerpsFlipPositionConfirmSheet
    position={defaultPositionForViews}
    onClose={jest.fn()}
    onConfirm={jest.fn()}
  />
);

const mockOnSelectAction = jest.fn();
const AdjustMarginSheetWrapper: React.FC = () => (
  <PerpsAdjustMarginActionSheet
    onClose={jest.fn()}
    onSelectAction={mockOnSelectAction}
  />
);

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

const baseLimitOrder: Order = {
  orderId: 'compact_order_1',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  detailedOrderType: 'Limit',
  size: '2.5',
  originalSize: '2.5',
  filledSize: '0',
  remainingSize: '2.5',
  price: '2500',
  reduceOnly: false,
  status: 'open',
  timestamp: Date.now(),
};

const shortMarketOrder: Order = {
  ...baseLimitOrder,
  orderId: 'compact_order_2',
  symbol: 'BTC',
  side: 'sell',
  detailedOrderType: 'Market',
  price: '45000',
  size: '0.1',
  originalSize: '0.1',
  remainingSize: '0.1',
};

const renderRow = (order: Order, onPress?: () => void) =>
  renderPerpsView(
    () => (
      <PerpsCompactOrderRow
        order={order}
        onPress={onPress as (() => void) | undefined}
      />
    ),
    'CompactOrderRowTest',
  );

const multiplePositions = [
  defaultPositionForViews,
  {
    ...defaultPositionForViews,
    symbol: 'BTC',
    size: '0.5',
    entryPrice: '40000',
    liquidationPrice: '38000',
    unrealizedPnl: '-200',
    positionValue: '20000',
  },
];

const multipleOrders = [
  defaultOrderForViews,
  {
    ...defaultOrderForViews,
    orderId: 'order_view_2',
    symbol: 'BTC',
    side: 'sell' as const,
    price: '45000',
    size: '0.1',
    originalSize: '0.1',
  },
];

describe('Active Trader Flow', () => {
  let MARKET_ORDERS: string;
  let LEVERAGE_MODAL_TITLE: string;
  let LIMIT_PRICE_MODAL_TITLE: string;
  let LIMIT_PRICE_MID: string;
  let LIMIT_PRICE_BID: string;
  let CLOSE_ALL_TITLE: string;
  let CANCEL_ALL_TITLE: string;
  let ADJUST_MARGIN_TITLE: string;
  let ADD_MARGIN: string;
  let REDUCE_MARGIN: string;

  beforeAll(() => {
    MARKET_ORDERS = strings('perps.market.orders');
    LEVERAGE_MODAL_TITLE = strings('perps.order.leverage_modal.title');
    LIMIT_PRICE_MODAL_TITLE = strings('perps.order.limit_price_modal.title');
    LIMIT_PRICE_MID = strings('perps.order.limit_price_modal.mid_price');
    LIMIT_PRICE_BID = strings('perps.order.limit_price_modal.bid_price');
    CLOSE_ALL_TITLE = strings('perps.close_all_modal.title');
    CANCEL_ALL_TITLE = strings('perps.cancel_all_modal.title');
    ADJUST_MARGIN_TITLE = strings('perps.adjust_margin.title');
    ADD_MARGIN = strings('perps.adjust_margin.add_margin');
    REDUCE_MARGIN = strings('perps.adjust_margin.reduce_margin');
  });

  beforeEach(() => {
    mockOnSelectAction.mockClear();
  });

  it('complete trading session: browse positions, modify, flip, configure trade, then bulk-close and cancel', async () => {
    // ── PHASE 1: Browse market tabs ──────────────────────────────────────
    // Trader opens market with positions and orders — all 3 tabs available
    renderPerpsView(MarketTabsDefault, 'MarketTabsTest', {
      streamOverrides: {
        positions: [defaultPositionForViews],
        orders: [defaultOrderForViews],
      },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryAllByText(strings('perps.market.position')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryAllByText(MARKET_ORDERS).length).toBeGreaterThan(0);
    expect(
      screen.queryAllByText(strings('perps.market.statistics')).length,
    ).toBeGreaterThan(0);

    // Trader taps into position tab — position card visible
    cleanup();
    renderPerpsView(MarketTabsPosition, 'MarketTabsTest', {
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
    ).toBeOnTheScreen();

    // Trader taps into orders tab — orders content visible
    cleanup();
    renderPerpsView(MarketTabsOrders, 'MarketTabsTest', {
      streamOverrides: { positions: [], orders: [defaultOrderForViews] },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
    ).toBeOnTheScreen();

    // Trader taps into statistics tab
    cleanup();
    renderPerpsView(MarketTabsStatistics, 'MarketTabsTest', {
      streamOverrides: {
        positions: [defaultPositionForViews],
        orders: [defaultOrderForViews],
      },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT),
    ).toBeOnTheScreen();

    // Trader notices orders tab disappears after all orders fill
    cleanup();
    renderPerpsView(MarketTabsDefault, 'MarketTabsTest', {
      streamOverrides: { positions: [defaultPositionForViews], orders: [] },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.queryAllByText(MARKET_ORDERS)).toHaveLength(0);
    expect(
      screen.getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT),
    ).toBeOnTheScreen();

    // ── PHASE 2: Review individual order rows ────────────────────────────
    // Trader sees buy limit order row: long direction, limit price label
    cleanup();
    renderRow(baseLimitOrder);
    expect(await screen.findByText(/long/i)).toBeOnTheScreen();
    expect(screen.getByText('Limit price')).toBeOnTheScreen();

    // Trader sees sell market order row: short direction, market price label
    cleanup();
    renderRow(shortMarketOrder);
    expect(await screen.findByText(/short/i)).toBeOnTheScreen();
    expect(screen.getByText('Market price')).toBeOnTheScreen();

    // Trader taps an order row to see details
    cleanup();
    const onPress = jest.fn();
    renderRow(baseLimitOrder, onPress);
    fireEvent.press(await screen.findByText(/long/i));
    expect(onPress).toHaveBeenCalledTimes(1);

    // ── PHASE 3: Modify an existing position ─────────────────────────────
    // Trader opens the modify menu — all options visible
    cleanup();
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();
    expect(screen.getByText(labels.addPosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.reducePosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.flipPosition)).toBeOnTheScreen();

    // Trader selects "Add to Position" → navigates to order confirmation
    fireEvent.press(screen.getByText(labels.addPosition));
    expect(
      await screen.findByTestId('route-order-confirmation'),
    ).toBeOnTheScreen();

    // Trader goes back, selects "Flip Position" → also goes to confirmation
    cleanup();
    renderPerpsSelectModifyActionView();
    fireEvent.press(screen.getByText(labels.flipPosition));
    expect(
      await screen.findByTestId('route-order-confirmation'),
    ).toBeOnTheScreen();

    // Trader goes back, selects "Reduce Position" → stays in context
    cleanup();
    renderPerpsSelectModifyActionView();
    fireEvent.press(screen.getByText(labels.reducePosition));
    expect(await screen.findByText(labels.flipPosition)).toBeOnTheScreen();

    // ── PHASE 4: Review flip confirmation ────────────────────────────────
    // Trader sees full flip confirmation: title, direction, estimated size,
    // Cancel and Flip action buttons
    cleanup();
    renderPerpsView(FlipSheetWrapper, 'FlipSheetTest', {
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(
      await screen.findByText(strings('perps.flip_position.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.direction')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.est_size')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.flip')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.cancel')),
    ).toBeOnTheScreen();

    // ── PHASE 5: Configure leverage for next trade ───────────────────────
    // Trader opens leverage sheet: title, current 5x, presets (2x, 10x), Set
    cleanup();
    renderPerpsView(LeverageVisibleWrapper, 'LeverageTest');
    expect(await screen.findByText(LEVERAGE_MODAL_TITLE)).toBeOnTheScreen();
    const fiveXElements = screen.getAllByText('5x');
    expect(fiveXElements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        strings('perps.order.leverage_modal.set_leverage', { leverage: 5 }),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('2x')).toBeOnTheScreen();
    expect(screen.getByText('10x')).toBeOnTheScreen();

    // Trader dismisses leverage sheet — title disappears
    cleanup();
    renderPerpsView(LeverageHiddenWrapper, 'LeverageTest');
    expect(screen.queryByText(LEVERAGE_MODAL_TITLE)).not.toBeOnTheScreen();

    // ── PHASE 6: Set limit price ─────────────────────────────────────────
    // Trader sets limit for LONG: title, Set, Mid + Bid presets (no Ask)
    cleanup();
    renderPerpsView(LongLimitPriceWrapper, 'LimitPriceTest');
    expect(await screen.findByText(LIMIT_PRICE_MODAL_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.set')),
    ).toBeOnTheScreen();
    expect(screen.getByText(LIMIT_PRICE_MID)).toBeOnTheScreen();
    expect(screen.getByText(LIMIT_PRICE_BID)).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.order.limit_price_modal.ask_price')),
    ).not.toBeOnTheScreen();

    // Trader switches to SHORT: presets flip — Mid + Ask visible, Bid hidden
    cleanup();
    renderPerpsView(ShortLimitPriceWrapper, 'LimitPriceTest');
    await screen.findByText(LIMIT_PRICE_MODAL_TITLE);
    expect(screen.getByText(LIMIT_PRICE_MID)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.limit_price_modal.ask_price')),
    ).toBeOnTheScreen();
    expect(screen.queryByText(LIMIT_PRICE_BID)).not.toBeOnTheScreen();

    // Trader dismisses limit price sheet
    cleanup();
    renderPerpsView(LimitPriceHiddenWrapper, 'LimitPriceTest');
    expect(screen.queryByText(LIMIT_PRICE_MODAL_TITLE)).not.toBeOnTheScreen();

    // ── PHASE 7: Cross-margin warning ────────────────────────────────────
    // Trader encounters cross-margin warning: title, message, and dismisses
    cleanup();
    renderPerpsView(
      () => <PerpsCrossMarginWarningBottomSheet />,
      'CrossMarginTest',
    );
    expect(
      await screen.findByText(strings('perps.crossMargin.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.crossMargin.message')),
    ).toBeOnTheScreen();
    const dismissButton = screen.getByText(
      strings('perps.crossMargin.dismiss'),
    );
    fireEvent.press(dismissButton);

    // ── PHASE 8: Bulk close all positions ────────────────────────────────
    // Trader reviews close-all summary: title, description, margin, receive,
    // Keep Positions and Close All buttons
    cleanup();
    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: multiplePositions },
    });
    expect(await screen.findByText(CLOSE_ALL_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_all_modal.description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_position.margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_position.you_receive')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_all_modal.keep_positions')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.close_all_modal.close_all')),
    ).toBeOnTheScreen();

    // After closing — no positions → empty state
    cleanup();
    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: [] },
    });
    expect(await screen.findByText(CLOSE_ALL_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.no_positions')),
    ).toBeOnTheScreen();

    // ── PHASE 9: Bulk cancel all orders ──────────────────────────────────
    // Trader cancels all orders: title, description, Keep Orders and Confirm
    cleanup();
    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders: multipleOrders },
    });
    expect(await screen.findByText(CANCEL_ALL_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.keep_orders')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.confirm')),
    ).toBeOnTheScreen();

    // After cancelling — no orders → empty state
    cleanup();
    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders: [] },
    });
    expect(await screen.findByText(CANCEL_ALL_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.no_orders')),
    ).toBeOnTheScreen();

    // ── PHASE 10: Adjust margin ──────────────────────────────────────────
    // Trader selects margin adjustment: sees Add/Remove options, selects Add
    cleanup();
    renderPerpsView(AdjustMarginSheetWrapper, 'AdjustMarginSheetTest');
    expect(await screen.findByText(ADJUST_MARGIN_TITLE)).toBeOnTheScreen();
    expect(screen.getByText(ADD_MARGIN)).toBeOnTheScreen();
    expect(screen.getByText(REDUCE_MARGIN)).toBeOnTheScreen();
    fireEvent.press(screen.getByText(ADD_MARGIN));
    expect(mockOnSelectAction).toHaveBeenCalledWith('add_margin');
  });
});
