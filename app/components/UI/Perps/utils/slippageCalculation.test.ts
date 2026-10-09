import type { OrderBookData, OrderBookLevel } from '@metamask/perps-controller';
import {
  calculateEstimatedSlippageBps,
  calculateMarketOrderLiquidity,
} from './slippageCalculation';

const level = (price: number, size: number): OrderBookLevel => ({
  price: String(price),
  size: String(size),
  total: String(size),
  notional: String(price * size),
  totalNotional: String(price * size),
});

const buildBook = (
  midPrice: number,
  asks: OrderBookLevel[],
  bids: OrderBookLevel[],
): OrderBookData => ({
  midPrice: String(midPrice),
  asks,
  bids,
  spread: '0',
  spreadPercentage: '0',
  lastUpdated: 0,
  maxTotal: '0',
});

describe('calculateEstimatedSlippageBps', () => {
  it('returns null when the order book is null', () => {
    expect(
      calculateEstimatedSlippageBps({
        orderBook: null,
        sizeUsd: 1000,
        isBuy: true,
      }),
    ).toBeNull();
  });

  it('returns null when sizeUsd is non-positive', () => {
    const book = buildBook(100, [level(101, 10)], [level(99, 10)]);
    expect(
      calculateEstimatedSlippageBps({
        orderBook: book,
        sizeUsd: 0,
        isBuy: true,
      }),
    ).toBeNull();
    expect(
      calculateEstimatedSlippageBps({
        orderBook: book,
        sizeUsd: -50,
        isBuy: false,
      }),
    ).toBeNull();
  });

  it('returns null when midPrice is not finite', () => {
    const book = buildBook(NaN, [level(101, 10)], [level(99, 10)]);
    expect(
      calculateEstimatedSlippageBps({
        orderBook: book,
        sizeUsd: 100,
        isBuy: true,
      }),
    ).toBeNull();
  });

  it('returns null when the targeted side has no levels', () => {
    const book = buildBook(100, [], [level(99, 10)]);
    expect(
      calculateEstimatedSlippageBps({
        orderBook: book,
        sizeUsd: 100,
        isBuy: true,
      }),
    ).toBeNull();
  });

  it('returns null when the book is too shallow to fill the request', () => {
    const book = buildBook(100, [level(101, 1)], [level(99, 1)]);
    expect(
      calculateEstimatedSlippageBps({
        orderBook: book,
        sizeUsd: 10_000,
        isBuy: true,
      }),
    ).toBeNull();
  });

  it('returns 0 bps for a buy that fills entirely at the first ask level above mid', () => {
    // Mid 100, ask 100 means the VWAP equals mid → no slippage.
    const book = buildBook(100, [level(100, 100)], [level(99, 100)]);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 1000,
      isBuy: true,
    });
    expect(result).toBeCloseTo(0, 5);
  });

  it('returns the exact bps for a buy that walks two ask levels', () => {
    // Mid 100, asks [100 x 10, 110 x 10].
    // Target base size = sizeUsd / midPrice = 1500 / 100 = 15.
    // Walk: 10 @ 100, then 5 @ 110.
    // VWAP = (10 * 100 + 5 * 110) / 15 = 1550 / 15 ≈ 103.3333.
    // Slippage bps = (103.3333 - 100) / 100 * 10000 ≈ 333.33.
    const book = buildBook(100, [level(100, 10), level(110, 10)], []);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 1500,
      isBuy: true,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeCloseTo(333.333, 2);
  });

  it('returns the exact bps for a sell that walks two bid levels', () => {
    // Mid 100, bids [100 x 10, 90 x 10] (descending price).
    // Target base size = 1500 / 100 = 15.
    // Walk: 10 @ 100, then 5 @ 90.
    // VWAP = (10 * 100 + 5 * 90) / 15 = 1450 / 15 ≈ 96.6667.
    // Slippage bps = (100 - 96.6667) / 100 * 10000 ≈ 333.33.
    const book = buildBook(100, [], [level(100, 10), level(90, 10)]);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 1500,
      isBuy: false,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeCloseTo(333.333, 2);
  });

  it('skips levels with zero or non-finite size', () => {
    // The bad first level should not stop the walk.
    const book = buildBook(100, [level(100, 0), level(101, 100)], []);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 1000,
      isBuy: true,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(0);
  });

  it('never returns a negative slippage', () => {
    // A "favourable" buy where the ask sits below mid still clamps to 0.
    const book = buildBook(100, [level(90, 100)], []);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 100,
      isBuy: true,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateMarketOrderLiquidity', () => {
  it.each([true, false])('rejects insufficient depth for buy=%s', (isBuy) => {
    const orderBook = buildBook(100, [level(100, 0.5)], [level(100, 0.5)]);

    const result = calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd: 100,
      isBuy,
      maxSlippageBps: 300,
    });

    expect(result.canFillWithinSlippage).toBe(false);
    expect(result.estimatedSlippageBps).toBeNull();
  });

  it.each([true, false])(
    'rejects the worst level even when VWAP is within the cap, buy=%s',
    (isBuy) => {
      const orderBook = buildBook(
        100,
        [level(100, 0.9), level(110, 1)],
        [level(100, 0.9), level(90, 1)],
      );

      const result = calculateMarketOrderLiquidity({
        orderBook,
        sizeUsd: 100,
        isBuy,
        maxSlippageBps: 300,
      });

      expect(result.estimatedSlippageBps).toBeCloseTo(100);
      expect(result.worstSlippageBps).toBeCloseTo(1000);
      expect(result.canFillWithinSlippage).toBe(false);
    },
  );

  it.each([true, false])(
    'accepts a fill exactly at the limit, buy=%s',
    (isBuy) => {
      const orderBook = buildBook(100, [level(103, 10)], [level(97, 10)]);

      const result = calculateMarketOrderLiquidity({
        orderBook,
        sizeUsd: 100,
        isBuy,
        maxSlippageBps: 300,
        szDecimals: 2,
      });

      expect(result.canFillWithinSlippage).toBe(true);
      expect(result.worstSlippageBps).toBe(300);
    },
  );

  it('uses the submission mid instead of the independent book mid', () => {
    const orderBook = buildBook(105, [level(104, 10)], []);

    const result = calculateMarketOrderLiquidity({
      orderBook,
      currentPrice: 100,
      sizeUsd: 100,
      isBuy: true,
      maxSlippageBps: 300,
    });

    expect(result.canFillWithinSlippage).toBe(false);
    expect(result.worstSlippageBps).toBe(400);
  });

  it('checks the rounded submitted quantity rather than unrounded USD size', () => {
    const orderBook = buildBook(100, [level(100, 1.001)], []);

    const result = calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd: 100.1,
      isBuy: true,
      maxSlippageBps: 300,
      szDecimals: 2,
    });

    expect(result.canFillWithinSlippage).toBe(false);
  });

  it('caps a reduce-only fill to the exact position size', () => {
    const orderBook = buildBook(100, [], [level(100, 0.5)]);

    const result = calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd: 100,
      isBuy: false,
      maxSlippageBps: 300,
      szDecimals: 2,
      reduceOnly: true,
      size: '0.5',
    });

    expect(result.canFillWithinSlippage).toBe(true);
  });

  it('skips nonpositive prices instead of allowing a zero-price sell level', () => {
    const orderBook = buildBook(
      100,
      [],
      [level(0, 10), level(-1, 10), level(100, 1)],
    );

    const result = calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd: 100,
      isBuy: false,
      maxSlippageBps: 300,
    });

    expect(result.canFillWithinSlippage).toBe(true);
    expect(result.worstSlippageBps).toBe(0);
  });

  it('stops after the required quantity and ignores deeper out-of-cap levels', () => {
    const orderBook = buildBook(100, [level(100, 1), level(200, 10)], []);

    const result = calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd: 100,
      isBuy: true,
      maxSlippageBps: 300,
    });

    expect(result.canFillWithinSlippage).toBe(true);
    expect(result.worstSlippageBps).toBe(0);
  });
  it('returns unavailable for a reduce-only quantity below the venue increment', () => {
    const orderBook = buildBook(100, [], [level(100, 1)]);

    const result = calculateMarketOrderLiquidity({
      orderBook,
      sizeUsd: 0.1,
      isBuy: false,
      maxSlippageBps: 300,
      szDecimals: 2,
      reduceOnly: true,
    });

    expect(result.canFillWithinSlippage).toBeNull();
    expect(result.estimatedSlippageBps).toBeNull();
  });
});
