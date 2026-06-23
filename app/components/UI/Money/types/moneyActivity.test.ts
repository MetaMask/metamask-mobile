import type { RampsOrder } from '@metamask/ramps-controller';
import { rampOrderItem } from './moneyActivity';

describe('rampOrderItem', () => {
  it('uses a numeric createdAt value as the item time', () => {
    const item = rampOrderItem({
      providerOrderId: 'order-1',
      createdAt: 123,
    } as RampsOrder);

    expect(item).toMatchObject({
      kind: 'rampOrder',
      id: 'order-1',
      time: 123,
    });
  });

  it('parses ISO createdAt values as epoch milliseconds', () => {
    const item = rampOrderItem({
      providerOrderId: 'order-1',
      createdAt: '2026-06-23T18:00:00.000Z',
    } as unknown as RampsOrder);

    expect(item.time).toBe(Date.parse('2026-06-23T18:00:00.000Z'));
  });

  it('falls back to zero for invalid createdAt values', () => {
    const item = rampOrderItem({
      providerOrderId: 'order-1',
      createdAt: 'invalid-date',
    } as unknown as RampsOrder);

    expect(item.time).toBe(0);
  });
});
