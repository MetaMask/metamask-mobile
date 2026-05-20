import type { OrderBookData, OrderBookLevel } from '@metamask/perps-controller';
import { calculateEstimatedSlippageBps } from './slippageCalculation';

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

  it('returns positive bps when a buy walks the book', () => {
    // Mid 100, asks at 100 (10 size) then 110 (10 size).
    // Buy $1500 fills 10 @ 100 = $1000, then 4.545 @ 110 = $500.
    // VWAP = (10*100 + 4.545*110) / (10 + 4.545) ≈ 103.125
    // Slippage = ((103.125 - 100) / 100) * 10000 ≈ 312.5 bps
    const book = buildBook(100, [level(100, 10), level(110, 10)], []);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 1500,
      isBuy: true,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(0);
    expect(result as number).toBeLessThan(500);
  });

  it('returns positive bps when a sell walks the book', () => {
    // Sell sweeps bids in descending price; lower fills are worse.
    const book = buildBook(100, [], [level(100, 10), level(90, 10)]);
    const result = calculateEstimatedSlippageBps({
      orderBook: book,
      sizeUsd: 1500,
      isBuy: false,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(0);
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
