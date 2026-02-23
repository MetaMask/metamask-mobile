/**
 * Position Management Flow — use-case-driven view tests.
 *
 * User journey: a trader views positions in market tabs, modifies them
 * (add / reduce / flip), performs bulk close-all and cancel-all actions,
 * and selects margin adjustment options.
 *
 * Components covered: PerpsMarketTabs, PerpsCompactOrderRow,
 * PerpsSelectModifyActionView, PerpsFlipPositionConfirmSheet,
 * PerpsCloseAllPositionsView, PerpsCancelAllOrdersView,
 * PerpsAdjustMarginActionSheet
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

describe('Position Management Flow', () => {
  beforeEach(() => {
    mockOnSelectAction.mockClear();
  });

  it('trader browses market tabs with positions and orders, sees content per tab, and verifies tabs adapt when orders are absent', async () => {
    // Step 1: Render with both positions and orders — all 3 tabs should be available
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
    expect(
      screen.queryAllByText(strings('perps.market.orders')).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText(strings('perps.market.statistics')).length,
    ).toBeGreaterThan(0);

    // Step 2: Switch to position tab — position content visible
    cleanup();
    renderPerpsView(MarketTabsPosition, 'MarketTabsTest', {
      streamOverrides: { positions: [defaultPositionForViews] },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
    ).toBeOnTheScreen();

    // Step 3: Switch to orders tab — orders content visible
    cleanup();
    renderPerpsView(MarketTabsOrders, 'MarketTabsTest', {
      streamOverrides: { positions: [], orders: [defaultOrderForViews] },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
    ).toBeOnTheScreen();

    // Step 4: Switch to statistics tab
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

    // Step 5: When trader has no orders, the orders tab disappears and statistics shows
    cleanup();
    renderPerpsView(MarketTabsDefault, 'MarketTabsTest', {
      streamOverrides: { positions: [defaultPositionForViews], orders: [] },
    });
    expect(
      await screen.findByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.queryAllByText(strings('perps.market.orders'))).toHaveLength(
      0,
    );
    expect(
      screen.getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT),
    ).toBeOnTheScreen();

    // Step 6: Verify compact order rows render correctly for buy and sell orders
    cleanup();
    renderRow(baseLimitOrder);
    expect(await screen.findByText(/long/i)).toBeOnTheScreen();
    expect(screen.getByText('Limit price')).toBeOnTheScreen();

    cleanup();
    renderRow(shortMarketOrder);
    expect(await screen.findByText(/short/i)).toBeOnTheScreen();
    expect(screen.getByText('Market price')).toBeOnTheScreen();

    // Step 7: Pressing an order row triggers the onPress callback
    cleanup();
    const onPress = jest.fn();
    renderRow(baseLimitOrder, onPress);
    fireEvent.press(await screen.findByText(/long/i));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('trader modifies position through add and flip actions, then reviews flip confirmation with full details', async () => {
    // Step 1: Render modify action menu — all three options visible
    renderPerpsSelectModifyActionView();
    const labels = getModifyActionLabels();
    expect(screen.getByText(labels.addPosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.reducePosition)).toBeOnTheScreen();
    expect(screen.getByText(labels.flipPosition)).toBeOnTheScreen();

    // Step 2: Select "Add to Position" → navigates to order confirmation
    fireEvent.press(screen.getByText(labels.addPosition));
    expect(
      await screen.findByTestId('route-order-confirmation'),
    ).toBeOnTheScreen();

    // Step 3: Re-open modify menu, select "Flip Position" → also navigates to order confirmation
    cleanup();
    renderPerpsSelectModifyActionView();
    fireEvent.press(screen.getByText(labels.flipPosition));
    expect(
      await screen.findByTestId('route-order-confirmation'),
    ).toBeOnTheScreen();

    // Step 4: Re-open modify menu, select "Reduce Position" → stays in context
    cleanup();
    renderPerpsSelectModifyActionView();
    fireEvent.press(screen.getByText(labels.reducePosition));
    expect(await screen.findByText(labels.flipPosition)).toBeOnTheScreen();

    // Step 5: Review the flip position confirmation sheet — title, direction, size, action buttons
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
  });

  it('trader performs bulk actions: reviews close-all summary, sees empty states, cancels orders, and selects margin adjustment', async () => {
    // Step 1: Close all positions — with multiple positions, trader sees summary
    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: multiplePositions },
    });
    expect(
      await screen.findByText(strings('perps.close_all_modal.title')),
    ).toBeOnTheScreen();
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

    // Step 2: Close all positions — empty state when no positions exist
    cleanup();
    renderPerpsCloseAllPositionsView({
      streamOverrides: { positions: [] },
    });
    expect(
      await screen.findByText(strings('perps.close_all_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.position.no_positions')),
    ).toBeOnTheScreen();

    // Step 3: Cancel all orders — with orders, trader sees confirmation
    cleanup();
    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders: multipleOrders },
    });
    expect(
      await screen.findByText(strings('perps.cancel_all_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.keep_orders')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.confirm')),
    ).toBeOnTheScreen();

    // Step 4: Cancel all orders — empty state when no orders exist
    cleanup();
    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders: [] },
    });
    expect(
      await screen.findByText(strings('perps.cancel_all_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.order.no_orders')),
    ).toBeOnTheScreen();

    // Step 5: Adjust margin action sheet — see options and select "Add margin"
    cleanup();
    renderPerpsView(AdjustMarginSheetWrapper, 'AdjustMarginSheetTest');
    expect(
      await screen.findByText(strings('perps.adjust_margin.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.add_margin')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.adjust_margin.reduce_margin')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.adjust_margin.add_margin')),
    );
    expect(mockOnSelectAction).toHaveBeenCalledWith('add_margin');
  });
});
