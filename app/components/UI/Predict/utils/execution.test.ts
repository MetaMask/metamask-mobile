import { Side, type OrderPreview } from '../types';
import {
  calculatePredictExecutionDepth,
  getPredictExecutionBandFloorPrice,
  isPredictExecutionCheckedSell,
  isPredictExecutionPreviewStale,
  PREDICT_EXECUTION_PREVIEW_MAX_AGE_MS,
  resolvePredictExecutionDepth,
  withPredictSellBandFloorFromSharePrice,
  type PredictExecutionLevel,
} from './execution';

const SELL_SLIPPAGE = 0.05;

const createLevels = (
  entries: [price: number, size: number][],
): PredictExecutionLevel[] => entries.map(([price, size]) => ({ price, size }));

describe('getPredictExecutionBandFloorPrice', () => {
  it('rounds the sell floor up to the next valid tick', () => {
    // 0.65 × 0.95 = 0.6175 → 0.62, never 0.61
    expect(
      getPredictExecutionBandFloorPrice({
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
        approvedPrice: 0.65,
        slippage: SELL_SLIPPAGE,
        tickSize: 0.001,
      }),
    ).toBeCloseTo(0.618, 10);
  });

  it('falls back to the unrounded boundary when the tick size is unusable', () => {
    expect(
      getPredictExecutionBandFloorPrice({
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
      approvedPrice: 0.65,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 0,
      levels: createLevels([[0.64, 500]]),
    });

    expect(depth.executableSize).toBe(0);
    expect(depth.isFullyExecutable).toBe(false);
  });
});

describe('resolvePredictExecutionDepth', () => {
  it('keeps the approved band when it fills the full size', () => {
    const depth = resolvePredictExecutionDepth({
      approvedPrice: 0.6,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      levels: createLevels([[0.58, 10]]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.bandFloorPrice).toBeCloseTo(0.57, 10);
    expect(depth.isOutsideApprovedBand).toBe(false);
  });

  it('measures the band from the refreshed price when a low sell price moved one tick', () => {
    // 0.19 × 0.95 = 0.1805 → 0.19: the approved band is zero ticks wide, so
    // a one-tick move to 0.18 only fills inside the refreshed band.
    const depth = resolvePredictExecutionDepth({
      approvedPrice: 0.19,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      levels: createLevels([[0.18, 10]]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.refreshedPrice).toBe(0.18);
    // 0.18 × 0.95 = 0.171 → 0.18.
    expect(depth.bandFloorPrice).toBeCloseTo(0.18, 10);
    expect(depth.worstExecutablePrice).toBe(0.18);
    expect(depth.isOutsideApprovedBand).toBe(true);
  });

  it('measures the band from the refreshed price when a sell below 40 cents moved two ticks', () => {
    // 0.30 × 0.95 = 0.285 → 0.29: a move to 0.28 is outside the approved band.
    const depth = resolvePredictExecutionDepth({
      approvedPrice: 0.3,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      levels: createLevels([[0.28, 10]]),
    });

    expect(depth.isFullyExecutable).toBe(true);
    expect(depth.refreshedPrice).toBe(0.28);
  });

  it('keeps the approved partial depth when the refreshed band cannot fill either', () => {
    const depth = resolvePredictExecutionDepth({
      approvedPrice: 0.3,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      levels: createLevels([
        [0.29, 4],
        [0.28, 2],
      ]),
    });

    expect(depth.isFullyExecutable).toBe(false);
    expect(depth.executableSize).toBe(4);
    expect(depth.bandFloorPrice).toBeCloseTo(0.29, 10);
    expect(depth.isOutsideApprovedBand).toBe(false);
  });

  it('never widens the band when the price moved in the user favor', () => {
    const depth = resolvePredictExecutionDepth({
      approvedPrice: 0.3,
      slippage: SELL_SLIPPAGE,
      tickSize: 0.01,
      requestedSize: 10,
      levels: createLevels([[0.31, 4]]),
    });

    expect(depth.isFullyExecutable).toBe(false);
    expect(depth.executableSize).toBe(4);
  });
});

describe('withPredictSellBandFloorFromSharePrice', () => {
  const preview: OrderPreview = {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    timestamp: 1,
    side: Side.SELL,
    sharePrice: 0.58,
    maxAmountSpent: 10,
    minAmountReceived: 5.8,
    minAmountReceivedAfterSlippage: 5.7,
    slippage: SELL_SLIPPAGE,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
  };

  it('measures the worst case from the preview share price', () => {
    // 0.58 × 0.95 = 0.551 → 0.56, so 10 shares have a 5.60 floor.
    const result = withPredictSellBandFloorFromSharePrice(preview);

    expect(result.minAmountReceivedAfterSlippage).toBeCloseTo(5.6, 10);
    expect(result.sharePrice).toBe(0.58);
  });

  it('returns the preview unchanged when no valid floor exists', () => {
    const result = withPredictSellBandFloorFromSharePrice({
      ...preview,
      sharePrice: 0,
    });

    expect(result.minAmountReceivedAfterSlippage).toBe(5.7);
  });
});

describe('execution-checked sell freshness', () => {
  const sellPreview: OrderPreview = {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    timestamp: 1,
    side: Side.SELL,
    sharePrice: 0.5,
    maxAmountSpent: 10,
    minAmountReceived: 5,
    slippage: SELL_SLIPPAGE,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
  };

  it('matches only sell previews that carry fetchedAt', () => {
    expect(isPredictExecutionCheckedSell(sellPreview)).toBe(false);
    expect(
      isPredictExecutionCheckedSell({ ...sellPreview, fetchedAt: 1 }),
    ).toBe(true);
    expect(
      isPredictExecutionCheckedSell({
        ...sellPreview,
        side: Side.BUY,
        fetchedAt: 1,
      }),
    ).toBe(false);
  });

  it('reports staleness only after the freshness window', () => {
    const preview = { ...sellPreview, fetchedAt: 1_000 };

    expect(
      isPredictExecutionPreviewStale(
        preview,
        1_000 + PREDICT_EXECUTION_PREVIEW_MAX_AGE_MS,
      ),
    ).toBe(false);
    expect(
      isPredictExecutionPreviewStale(
        preview,
        1_001 + PREDICT_EXECUTION_PREVIEW_MAX_AGE_MS,
      ),
    ).toBe(true);
  });
});
