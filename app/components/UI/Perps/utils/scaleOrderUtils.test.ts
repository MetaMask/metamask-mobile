import {
  buildScaleOrderLadder,
  coerceScaleSkew,
  SCALE_MAX_ORDERS,
  SCALE_MIN_ORDERS,
} from './scaleOrderUtils';

const buildLadder = (
  overrides: Partial<Parameters<typeof buildScaleOrderLadder>[0]> = {},
) =>
  buildScaleOrderLadder({
    startPrice: '100',
    endPrice: '200',
    totalUsdAmount: '600',
    totalOrders: 3,
    skew: '1.00',
    sizeDecimals: 4,
    ...overrides,
  });

describe('buildScaleOrderLadder', () => {
  it('allocates more asset size at the end for skew above one', () => {
    const result = buildLadder({ skew: '3.00' });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a scale ladder');
    }

    expect(Number(result.rungs.at(-1)?.usdAmount)).toBeGreaterThan(
      Number(result.rungs[0].usdAmount),
    );
  });

  it('allocates more notional at the start for skew below one', () => {
    const result = buildLadder({ skew: '0.50' });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a scale ladder');
    }

    expect(Number(result.rungs[0].usdAmount)).toBeGreaterThan(
      Number(result.rungs.at(-1)?.usdAmount),
    );
  });

  it('distributes equal notional for a skew of one', () => {
    const result = buildLadder({ skew: '1.00' });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a scale ladder');
    }

    expect(result.rungs.map((rung) => rung.usdAmount)).toEqual([
      '200.00',
      '200.00',
      '200.00',
    ]);
  });

  it.each([SCALE_MIN_ORDERS - 1, SCALE_MAX_ORDERS + 1])(
    'rejects an order count of %s',
    (totalOrders) => {
      const result = buildLadder({ totalOrders });

      expect(result).toEqual({
        success: false,
        code: 'invalid_order_count',
      });
    },
  );

  it.each([SCALE_MIN_ORDERS, SCALE_MAX_ORDERS])(
    'creates a ladder at the %s-order boundary',
    (totalOrders) => {
      const result = buildLadder({ totalOrders, totalUsdAmount: '4000' });

      expect(result.success).toBe(true);
      if (!result.success) {
        throw new Error('Expected a scale ladder');
      }

      expect(result.rungs).toHaveLength(totalOrders);
    },
  );

  it('rejects equal start and end prices', () => {
    const result = buildLadder({ startPrice: '100', endPrice: '100' });

    expect(result).toEqual({ success: false, code: 'invalid_range' });
  });

  it('rejects a ladder containing a zero-size rung', () => {
    const result = buildLadder({ totalUsdAmount: '1', sizeDecimals: 2 });

    expect(result).toEqual({ success: false, code: 'minimum_lot' });
  });
});

describe('coerceScaleSkew', () => {
  it('rounds a positive skew to two decimals', () => {
    const result = coerceScaleSkew('2.345');

    expect(result).toBe('2.35');
  });

  it.each(['0', '-1', 'not-a-number'])(
    'uses the default skew for %s',
    (value) => {
      const result = coerceScaleSkew(value);

      expect(result).toBe('1.00');
    },
  );
});
