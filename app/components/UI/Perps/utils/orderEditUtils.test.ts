import type { Order } from '@metamask/perps-controller';
import {
  buildOrderEditParams,
  buildOrderOptimisticEdit,
  getOrderEditConfirmedSize,
  getOrderEditMarketPrice,
  getOrderEditPreviousValue,
  getOrderEditableLimitPrice,
  getOrderEditableSize,
  hasOrderEditValueChanged,
} from './orderEditUtils';

const baseOrder: Order = {
  orderId: 'order-1',
  symbol: 'ETH',
  side: 'sell',
  size: '2',
  originalSize: '2',
  remainingSize: '2',
  filledSize: '0',
  price: '3000',
  orderType: 'limit',
  status: 'open',
  timestamp: 1_711_756_800_000, // 2024-03-30T00:00:00.000Z — fixed for determinism
  reduceOnly: true,
  isTrigger: false,
};

describe('orderEditUtils', () => {
  it('reads editable limit price and size from the order', () => {
    expect(getOrderEditableLimitPrice(baseOrder)).toBe('3000');
    expect(getOrderEditableSize(baseOrder)).toBe('2');
  });

  it('detects unchanged price and size edits', () => {
    expect(hasOrderEditValueChanged(baseOrder, 'price', '3000')).toBe(false);
    expect(hasOrderEditValueChanged(baseOrder, 'size', '2')).toBe(false);
    expect(hasOrderEditValueChanged(baseOrder, 'price', '3100')).toBe(true);
    expect(hasOrderEditValueChanged(baseOrder, 'size', '1.5')).toBe(true);
  });

  it('builds optimistic patches and controller params per field', () => {
    expect(buildOrderOptimisticEdit('price', '3100')).toEqual({
      limitPrice: '3100',
    });
    expect(buildOrderOptimisticEdit('size', '1.5')).toEqual({ size: '1.5' });

    const trackingData = { totalFee: 0, marketPrice: 3100, source: 'test' };
    expect(
      buildOrderEditParams(baseOrder, 'price', '3100', trackingData),
    ).toEqual(
      expect.objectContaining({
        price: '3100',
        size: '2',
      }),
    );
    expect(
      buildOrderEditParams(baseOrder, 'size', '1.5', trackingData),
    ).toEqual(
      expect.objectContaining({
        price: '3000',
        size: '1.5',
      }),
    );
  });

  it('resolves market price, rollback value, and confirmed size', () => {
    expect(getOrderEditMarketPrice(baseOrder, 'price', '3100')).toBe(3100);
    expect(getOrderEditMarketPrice(baseOrder, 'size', '1.5')).toBe(3000);
    expect(getOrderEditPreviousValue(baseOrder, 'price')).toBe('3000');
    expect(getOrderEditPreviousValue(baseOrder, 'size')).toBe('2');
    expect(getOrderEditConfirmedSize(baseOrder, 'size', '1.5')).toBe('1.5');
    expect(getOrderEditConfirmedSize(baseOrder, 'price', '3100')).toBe('2');
  });
});
