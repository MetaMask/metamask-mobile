/**
 * Component view tests for PerpsCompactOrderRow.
 * Tests rendering of buy/sell orders with formatted price, size, and direction.
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsCompactOrderRow.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderPerpsComponent } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsCompactOrderRow from './PerpsCompactOrderRow';
import type { Order } from '@metamask/perps-controller';

const baseLimitOrder: Order = {
  orderId: 'compact_order_1',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  detailedOrderType: 'Limit',
  size: '2.5',
  originalSize: '2.5',
  price: '2500',
  reduceOnly: false,
  timeInForce: 'Gtc',
  status: 'open',
  timestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  fee: '0',
  filledSize: '0',
} as Order;

const shortMarketOrder: Order = {
  ...baseLimitOrder,
  orderId: 'compact_order_2',
  symbol: 'BTC',
  side: 'sell',
  detailedOrderType: 'Market',
  price: '45000',
  size: '0.1',
  originalSize: '0.1',
} as Order;

const renderRow = (order: Order, onPress?: () => void) =>
  renderPerpsComponent(
    PerpsCompactOrderRow as unknown as React.ComponentType<
      Record<string, unknown>
    >,
    { order, onPress },
  );

describe('PerpsCompactOrderRow', () => {
  it('renders buy limit order with "long" direction and "Limit price" label', async () => {
    renderRow(baseLimitOrder);

    expect(await screen.findByText(/long/i)).toBeOnTheScreen();
    expect(screen.getByText('Limit price')).toBeOnTheScreen();
  });

  it('renders sell market order with "short" direction and "Market price" label', async () => {
    renderRow(shortMarketOrder);

    expect(await screen.findByText(/short/i)).toBeOnTheScreen();
    expect(screen.getByText('Market price')).toBeOnTheScreen();
  });

  it('displays formatted size with symbol', async () => {
    renderRow(baseLimitOrder);

    expect(await screen.findByText(/2\.5/)).toBeOnTheScreen();
    expect(screen.getByText(/ETH/)).toBeOnTheScreen();
  });

  it('calls onPress when row is pressed', async () => {
    const onPress = jest.fn();
    renderRow(baseLimitOrder, onPress);

    const row = await screen.findByText(/long/i);
    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
