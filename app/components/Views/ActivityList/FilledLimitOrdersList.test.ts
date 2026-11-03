import { buildFilledLimitOrderListItems } from './FilledLimitOrdersList';
import { MOCK_LIMIT_FILLED_ORDER } from '../../UI/Bridge/api/limitOrders/getLimitOrders/mock';
import type { LimitOrder } from '../../UI/Bridge/api/limitOrders/getLimitOrders/types';

const filledAt = (id: string, closedAt: string | undefined): LimitOrder => ({
  ...MOCK_LIMIT_FILLED_ORDER,
  id,
  timingData: { ...MOCK_LIMIT_FILLED_ORDER.timingData, closedAt },
});

describe('buildFilledLimitOrderListItems', () => {
  it('returns no rows for no orders', () => {
    expect(buildFilledLimitOrderListItems([])).toEqual([]);
  });

  it('groups orders by close day, newest first, each day led by a header', () => {
    const olderDay = filledAt('older', '2026-09-01T12:00:00.000Z');
    const newerDayEarly = filledAt('newer-early', '2026-09-04T10:00:00.000Z');
    const newerDayLate = filledAt('newer-late', '2026-09-04T12:00:00.000Z');

    const rows = buildFilledLimitOrderListItems([
      olderDay,
      newerDayEarly,
      newerDayLate,
    ]);

    expect(rows.map((row) => row.type)).toEqual([
      'date-header',
      'order',
      'order',
      'date-header',
      'order',
    ]);
    expect(
      rows.flatMap((row) => (row.type === 'order' ? [row.order.id] : [])),
    ).toEqual(['newer-late', 'newer-early', 'older']);
    expect(rows[0]).toMatchObject({
      type: 'date-header',
      timestamp: new Date('2026-09-04T12:00:00.000Z').getTime(),
    });
    expect(rows[3]).toMatchObject({
      type: 'date-header',
      timestamp: new Date('2026-09-01T12:00:00.000Z').getTime(),
    });
  });

  it('gives every row a unique key', () => {
    const rows = buildFilledLimitOrderListItems([
      filledAt('a', '2026-09-01T12:00:00.000Z'),
      filledAt('b', '2026-09-04T12:00:00.000Z'),
    ]);

    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it('lists undated orders last without a header', () => {
    const undated: LimitOrder = {
      ...MOCK_LIMIT_FILLED_ORDER,
      id: 'undated',
      timingData: { createdAt: MOCK_LIMIT_FILLED_ORDER.timingData.createdAt },
    } as LimitOrder;

    const rows = buildFilledLimitOrderListItems([
      undated,
      filledAt('dated', '2026-09-04T12:00:00.000Z'),
    ]);

    expect(rows.map((row) => row.type)).toEqual([
      'date-header',
      'order',
      'order',
    ]);
    expect(rows.at(-1)).toMatchObject({ type: 'order', key: 'undated' });
  });
});
