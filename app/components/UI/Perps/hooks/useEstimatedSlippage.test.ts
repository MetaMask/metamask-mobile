import { type OrderBookData } from '@metamask/perps-controller';
import { computeSlippagePct } from './useEstimatedSlippage';

function makeOrderBook(
  midPrice: string,
  asks: { price: string; size: string }[],
  bids: { price: string; size: string }[],
): OrderBookData {
  return {
    midPrice,
    asks: asks.map((a) => ({
      ...a,
      numOrders: '1',
      total: '0',
      notional: '0',
      totalNotional: '0',
    })),
    bids: bids.map((b) => ({
      ...b,
      numOrders: '1',
      total: '0',
      notional: '0',
      totalNotional: '0',
    })),
    spread: '0',
    spreadPercentage: '0',
    lastUpdated: Date.now(),
    maxTotal: '0',
  } as OrderBookData;
}

describe('computeSlippagePct', () => {
  describe('long direction (walks asks)', () => {
    it('returns zero slippage when order fills at mid price', () => {
      const book = makeOrderBook(
        '100',
        [{ price: '100', size: '10' }],
        [{ price: '99', size: '10' }],
      );

      const result = computeSlippagePct(book, 100, 'long');

      expect(result.estimatedSlippagePct).toBe(0);
      expect(result.insufficientLiquidity).toBe(false);
    });

    it('computes positive slippage when fill price exceeds mid', () => {
      const book = makeOrderBook(
        '100',
        [
          { price: '101', size: '1' },
          { price: '102', size: '1' },
        ],
        [{ price: '99', size: '10' }],
      );

      const result = computeSlippagePct(book, 203, 'long');

      expect(result.estimatedSlippagePct).toBeGreaterThan(0);
      expect(result.insufficientLiquidity).toBe(false);
    });

    it('returns insufficientLiquidity when book cannot fill order', () => {
      const book = makeOrderBook(
        '100',
        [{ price: '101', size: '1' }],
        [{ price: '99', size: '10' }],
      );

      const result = computeSlippagePct(book, 500, 'long');

      expect(result.estimatedSlippagePct).toBeNull();
      expect(result.insufficientLiquidity).toBe(true);
    });
  });

  describe('short direction (walks bids)', () => {
    it('returns zero slippage when order fills at mid price', () => {
      const book = makeOrderBook(
        '100',
        [{ price: '101', size: '10' }],
        [{ price: '100', size: '10' }],
      );

      const result = computeSlippagePct(book, 100, 'short');

      expect(result.estimatedSlippagePct).toBe(0);
      expect(result.insufficientLiquidity).toBe(false);
    });

    it('computes positive slippage when fill price is below mid', () => {
      const book = makeOrderBook(
        '100',
        [{ price: '101', size: '10' }],
        [
          { price: '99', size: '1' },
          { price: '98', size: '1' },
        ],
      );

      const result = computeSlippagePct(book, 197, 'short');

      expect(result.estimatedSlippagePct).toBeGreaterThan(0);
      expect(result.insufficientLiquidity).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns empty result for empty asks', () => {
      const book = makeOrderBook('100', [], [{ price: '99', size: '10' }]);

      const result = computeSlippagePct(book, 100, 'long');

      expect(result.estimatedSlippagePct).toBeNull();
      expect(result.insufficientLiquidity).toBe(false);
    });

    it('returns empty result for invalid mid price', () => {
      const book = makeOrderBook(
        'NaN',
        [{ price: '101', size: '1' }],
        [{ price: '99', size: '1' }],
      );

      const result = computeSlippagePct(book, 100, 'long');

      expect(result.estimatedSlippagePct).toBeNull();
      expect(result.insufficientLiquidity).toBe(false);
    });

    it('returns empty result for zero mid price', () => {
      const book = makeOrderBook(
        '0',
        [{ price: '101', size: '1' }],
        [{ price: '99', size: '1' }],
      );

      const result = computeSlippagePct(book, 100, 'long');

      expect(result.estimatedSlippagePct).toBeNull();
      expect(result.insufficientLiquidity).toBe(false);
    });

    it('skips levels with invalid price or size', () => {
      const book = makeOrderBook(
        '100',
        [
          { price: 'bad', size: '1' },
          { price: '101', size: '0' },
          { price: '101', size: '10' },
        ],
        [],
      );

      const result = computeSlippagePct(book, 100, 'long');

      expect(result.estimatedSlippagePct).toBeGreaterThanOrEqual(0);
      expect(result.insufficientLiquidity).toBe(false);
    });
  });
});
