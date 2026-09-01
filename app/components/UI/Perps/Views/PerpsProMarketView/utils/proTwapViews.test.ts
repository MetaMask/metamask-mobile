import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import {
  selectActiveTwapOrders,
  selectHistoricalTwapOrders,
  selectTwapFillRows,
  selectTwapOrdersForView,
} from './proTwapViews';

const createFill = (overrides: Partial<TwapOrderFill> = {}): TwapOrderFill => ({
  fillId: 'fill-1',
  orderId: 'twap-1',
  side: 'buy',
  price: '100',
  size: '1',
  fee: '0.1',
  feeToken: 'USDC',
  timestamp: 1_000,
  transactionHash: '0xabc',
  ...overrides,
});

const createTwapOrder = (overrides: Partial<TwapOrder> = {}): TwapOrder => ({
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 60_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_000,
  lastUpdated: 2_000,
  fills: [],
  ...overrides,
});

describe('selectActiveTwapOrders', () => {
  it('returns only schedules with active status', () => {
    // Arrange
    const active = createTwapOrder({ orderId: 'a', status: 'active' });
    const completed = createTwapOrder({ orderId: 'b', status: 'completed' });
    const canceled = createTwapOrder({ orderId: 'c', status: 'canceled' });

    // Act
    const result = selectActiveTwapOrders([active, completed, canceled]);

    // Assert
    expect(result).toStrictEqual([active]);
  });
});

describe('selectHistoricalTwapOrders', () => {
  it('returns every terminal status', () => {
    // Arrange
    const active = createTwapOrder({ orderId: 'a', status: 'active' });
    const completed = createTwapOrder({ orderId: 'b', status: 'completed' });
    const underfilled = createTwapOrder({
      orderId: 'c',
      status: 'completed_underfilled',
    });
    const canceled = createTwapOrder({ orderId: 'd', status: 'canceled' });
    const failed = createTwapOrder({ orderId: 'e', status: 'failed' });

    // Act
    const result = selectHistoricalTwapOrders([
      active,
      completed,
      underfilled,
      canceled,
      failed,
    ]);

    // Assert
    expect(result).toStrictEqual([completed, underfilled, canceled, failed]);
  });

  it('partitions complementarily with the active selector', () => {
    // Arrange
    const orders = [
      createTwapOrder({ orderId: 'a', status: 'active' }),
      createTwapOrder({ orderId: 'b', status: 'completed' }),
    ];

    // Act
    const total =
      selectActiveTwapOrders(orders).length +
      selectHistoricalTwapOrders(orders).length;

    // Assert
    expect(total).toBe(orders.length);
  });
});

describe('selectTwapFillRows', () => {
  it('flattens fills across schedules newest first', () => {
    // Arrange
    const first = createTwapOrder({
      orderId: 'twap-1',
      fills: [createFill({ fillId: 'old', timestamp: 1_000 })],
    });
    const second = createTwapOrder({
      orderId: 'twap-2',
      fills: [createFill({ fillId: 'new', timestamp: 5_000 })],
    });

    // Act
    const result = selectTwapFillRows([first, second]);

    // Assert
    expect(result.map((row) => row.fill.fillId)).toStrictEqual(['new', 'old']);
  });

  it('keeps each fill paired with its parent schedule', () => {
    // Arrange
    const twapOrder = createTwapOrder({
      orderId: 'twap-9',
      symbol: 'ETH',
      fills: [createFill()],
    });

    // Act
    const [row] = selectTwapFillRows([twapOrder]);

    // Assert
    expect(row.twapOrder.symbol).toBe('ETH');
  });

  it('returns an empty list when no schedule has fills', () => {
    // Arrange
    const twapOrder = createTwapOrder({ fills: [] });

    // Act
    const result = selectTwapFillRows([twapOrder]);

    // Assert
    expect(result).toStrictEqual([]);
  });
});

describe('selectTwapOrdersForView', () => {
  it('returns active schedules for the active view', () => {
    // Arrange
    const active = createTwapOrder({ orderId: 'a', status: 'active' });
    const completed = createTwapOrder({ orderId: 'b', status: 'completed' });

    // Act
    const result = selectTwapOrdersForView([active, completed], 'active');

    // Assert
    expect(result).toStrictEqual([active]);
  });

  it('returns terminal schedules for the history view', () => {
    // Arrange
    const active = createTwapOrder({ orderId: 'a', status: 'active' });
    const completed = createTwapOrder({ orderId: 'b', status: 'completed' });

    // Act
    const result = selectTwapOrdersForView([active, completed], 'history');

    // Assert
    expect(result).toStrictEqual([completed]);
  });
});
