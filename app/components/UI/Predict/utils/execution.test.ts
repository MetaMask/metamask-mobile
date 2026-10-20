import { Side } from '../types';
import {
  calculatePredictExecutionDepth,
  getPredictExecutionBandFloorPrice,
  type PredictExecutionLevel,
} from './execution';

const SELL_SLIPPAGE = 0.05;
const BUY_SLIPPAGE = 0.03;

const createLevels = (
  entries: [price: number, size: number][],
): PredictExecutionLevel[] => entries.map(([price, size]) => ({ price, size }));

describe('getPredictExecutionBandFloorPrice', () => {
  it('rounds the sell floor up to the next valid tick', () => {
    // 0.65 × 0.95 = 0.6175 → 0.62, never 0.61
    expect(
      getPredictExecutionBandFloorPrice({
        side: Side.SELL,
        approvedPrice: 0.65,
        slippage: SELL_SLIPPAGE,
        tickSize: 0.01,
      }),
    ).toBe(0.62);
  });

  it('keeps an exact tick-multiple sell floor unchanged', () => {
    // 0.60 × 0.95 = 0.57, already a valid tick (float representation noise only).
    expect(
      getPredictExecutionBandFloorPrice({
        side: Side.SELL,
        approvedPrice: 0.6,
        slippage: SELL_SLIPPAGE,
        tickSize: 0.01,
      }),
    ).toBeCloseTo(0.57, 10);
  });

  it('rounds the sell floor to a finer tick honestly', () => {
    // 0.65 × 0.95 = 0.6175 → 0.618 on a 0.001 tick book
    expect(
      getPredictExecutionBandFloorPrice({
        side: Side.SELL,
        approvedPrice: 0.65,
        slippage: SELL_SLIPPAGE,
        tickSize: 0.001,
      }),
    ).toBeCloseTo(0.618, 10);
  });

  it('rounds the buy ceiling down to the next valid tick', () => {
    // 0.65 × 1.03 = 0.6695 → 0.66, never 0.67
    expect(
      getPredictExecutionBandFloorPrice({
        side: Side.BUY,
        approvedPrice: 0.65,
        slippage: BUY_SLIPPAGE,
        tickSize: 0.01,
      }),
    ).toBe(0.66);
  });

  it('keeps an exact tick-multiple buy ceiling unchanged', () => {
    // 0.50 × 1.03 = 0.515, already a valid tick
    expect(
      getPredictExecutionBandFloorPrice({
        side: Side.BUY,
        approvedPrice: 0.5,
        slippage: BUY_SLIPPAGE,
        tickSize: 0.005,
      }),
    ).toBeCloseTo(0.515, 10);
  });

  it('falls back to the unrounded boundary when the tick size is unusable', () => {
    expect(
      getPredictExecutionBandFloorPrice({
        side: Side.SELL,
        approvedPrice: 0.65,
        slippage: SELL_SLIPPAGE,
        tickSize: 0,
      }),
    ).toBeCloseTo(0.6175, 10);
  });
});

describe('calculatePredictExecutionDepth', () => {
  it('reports zero executable depth for an empty sell book', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      levels: createLevels([]),
    });

    expect(depth.executableSize).toBe(0);
    expect(depth.isFullyExecutable).toBe(false);
    expect(depth.refreshedPrice).toBeNull();
    expect(depth.worstExecutablePrice).toBeNull();
  });

  it('reports partial executable depth without a full fill', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      levels: createLevels([[0.64, 40]]),
    });

    expect(depth.executableSize).toBe(40);
    expect(depth.isFullyExecutable).toBe(false);
    // Gross proceeds cover only the in-band shares that exist.
    expect(depth.grossAmount).toBeCloseTo(40 * 0.64, 10);
    expect(depth.worstExecutablePrice).toBe(0.64);
  });

  it('fills the requested size across multiple in-band bid levels', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      // Unsorted on purpose: the walk must consume the best bid first.
      levels: createLevels([
        [0.63, 50],
        [0.64, 60],
      ]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.executableSize).toBe(100);
    // 60 shares at 0.64, then the remaining 40 at 0.63.
    expect(depth.grossAmount).toBeCloseTo(60 * 0.64 + 40 * 0.63, 10);
    expect(depth.refreshedPrice).toBe(0.64);
    expect(depth.worstExecutablePrice).toBe(0.63);
  });

  it('fills the requested size from a single deep in-band bid level', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      levels: createLevels([[0.64, 500]]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.executableSize).toBe(100);
    expect(depth.grossAmount).toBeCloseTo(64, 10);
    expect(depth.worstExecutablePrice).toBe(0.64);
  });

  it('counts a bid exactly on the band floor', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      // 0.65 × 0.95 = 0.6175 → floor 0.62: a bid at 0.62 is in band.
      levels: createLevels([[0.62, 10]]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.executableSize).toBe(10);
    expect(depth.worstExecutablePrice).toBe(0.62);
  });

  it('excludes a bid below the band floor even when the best bid is in band', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      levels: createLevels([
        [0.64, 40],
        [0.61, 500],
      ]),
    });

    // Only the in-band level counts; the 0.61 bid is below the 0.62 floor.
    expect(depth.executableSize).toBe(40);
    expect(depth.isFullyExecutable).toBe(false);
    // The displayed price still reports the best bid regardless of band.
    expect(depth.refreshedPrice).toBe(0.64);
  });

  it('reports the best bid as the refreshed price even when the whole book is out of band', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      levels: createLevels([[0.6, 500]]),
    });

    expect(depth.executableSize).toBe(0);
    expect(depth.isFullyExecutable).toBe(false);
    expect(depth.refreshedPrice).toBe(0.6);
    expect(depth.worstExecutablePrice).toBeNull();
  });

  it('skips levels with unusable price or size entries', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      levels: [
        { price: Number.NaN, size: 10 },
        { price: 0.64, size: 0 },
        { price: 0.64, size: 10 },
      ],
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.executableSize).toBe(10);
  });

  it('treats a non-positive requested size as not executable', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.SELL,
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 0,
      levels: createLevels([[0.64, 500]]),
    });

    expect(depth.executableSize).toBe(0);
    expect(depth.isFullyExecutable).toBe(false);
  });

  it('fills a buy from in-band asks and reports shares received', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.BUY,
      approvedPrice: 0.65,
      slippage: BUY_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 63, // dollars to spend
      // 0.65 × 1.03 = 0.6695 → ceiling 0.66: the 0.67 ask is out of band.
      levels: createLevels([
        [0.66, 500],
        [0.67, 500],
      ]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.executableSize).toBe(63);
    // 63 dollars at 0.66 per share.
    expect(depth.grossAmount).toBeCloseTo(63 / 0.66, 10);
    expect(depth.refreshedPrice).toBe(0.66);
    expect(depth.worstExecutablePrice).toBe(0.66);
  });

  it('fills a buy across multiple in-band asks best-first', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.BUY,
      approvedPrice: 0.65,
      slippage: BUY_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100, // dollars to spend
      // Unsorted on purpose: the best (lowest) ask is consumed first.
      levels: createLevels([
        [0.66, 100],
        [0.65, 100],
      ]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.executableSize).toBe(100);
    // $65 of depth at the 0.65 ask, then $35 at 0.66.
    expect(depth.grossAmount).toBeCloseTo(100 + 35 / 0.66, 10);
    expect(depth.worstExecutablePrice).toBe(0.66);
  });

  it('reports partial depth when in-band asks cannot absorb the buy', () => {
    const depth = calculatePredictExecutionDepth({
      side: Side.BUY,
      approvedPrice: 0.65,
      slippage: BUY_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 100,
      // $33 of in-band depth; the out-of-band 0.67 ask must not count.
      levels: createLevels([
        [0.66, 50],
        [0.67, 500],
      ]),
    });

    expect(depth.executableSize).toBeCloseTo(50 * 0.66, 10);
    expect(depth.isFullyExecutable).toBe(false);
    // Every share of the in-band level is consumed.
    expect(depth.grossAmount).toBe(50);
  });
});
