import { OrderType } from '../../types/advancedOrders';
import { getOrderTypeFromTrigger } from './getOrderTypeFromTrigger';

describe('getOrderTypeFromTrigger', () => {
  it.each([
    {
      kind: 'src_price' as const,
      threshold: 'above' as const,
      expected: OrderType.SELL_ABOVE,
    },
    {
      kind: 'src_price' as const,
      threshold: 'below' as const,
      expected: OrderType.SELL_BELOW,
    },
    {
      kind: 'dest_price' as const,
      threshold: 'above' as const,
      expected: OrderType.BUY_ABOVE,
    },
    {
      kind: 'dest_price' as const,
      threshold: 'below' as const,
      expected: OrderType.BUY_BELOW,
    },
    {
      kind: 'ratio' as const,
      threshold: 'above' as const,
      expected: OrderType.BUY_ABOVE,
    },
    {
      kind: 'ratio' as const,
      threshold: 'below' as const,
      expected: OrderType.BUY_BELOW,
    },
  ])(
    'returns $expected for a $kind $threshold trigger',
    ({ kind, threshold, expected }) => {
      const result = getOrderTypeFromTrigger({
        kind,
        threshold,
        price: '1',
      });

      expect(result).toBe(expected);
      expect(result).toEqual(
        expect.stringMatching(/^(buy|sell)_(above|below)$/),
      );
    },
  );
});
