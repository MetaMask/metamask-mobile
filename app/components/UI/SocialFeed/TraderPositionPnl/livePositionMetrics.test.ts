import { computeLivePositionMetrics } from './livePositionMetrics';

const NOW_MS = 1_700_000_000_000;

const openPosition = {
  livePriceUsd: 0.10349,
  tokensHeld: 1000,
  costBasisUsd: 88.3,
  earliestBuyTime: NOW_MS - 12 * 24 * 60 * 60 * 1000,
  isOpen: true,
};

describe('computeLivePositionMetrics', () => {
  it('computes position value, unrealized PnL, percentage, average cost, and hold time', () => {
    const result = computeLivePositionMetrics(openPosition, NOW_MS);

    expect(result.positionValueUsd).toBeCloseTo(103.49, 8);
    expect(result.unrealizedPnlUsd).toBeCloseTo(15.19, 8);
    expect(result.unrealizedPnlPercent).toBeCloseTo((15.19 / 88.3) * 100, 8);
    expect(result.averageCostUsd).toBeCloseTo(0.0883, 8);
    expect(result.holdTimeMs).toBe(12 * 24 * 60 * 60 * 1000);
  });

  it('returns null percentage when cost basis is zero', () => {
    const result = computeLivePositionMetrics(
      {
        ...openPosition,
        costBasisUsd: 0,
      },
      NOW_MS,
    );

    expect(result.positionValueUsd).toBeCloseTo(103.49, 8);
    expect(result.unrealizedPnlUsd).toBeCloseTo(103.49, 8);
    expect(result.unrealizedPnlPercent).toBeNull();
    expect(result.averageCostUsd).toBe(0);
  });

  it('does not calculate an average cost for a zero token balance', () => {
    const result = computeLivePositionMetrics(
      {
        ...openPosition,
        tokensHeld: 0,
      },
      NOW_MS,
    );

    expect(result.positionValueUsd).toBe(0);
    expect(result.unrealizedPnlUsd).toBe(-88.3);
    expect(result.averageCostUsd).toBeNull();
    expect(result.unrealizedPnlPercent).toBe(-100);
  });

  it('preserves negative unrealized PnL', () => {
    const result = computeLivePositionMetrics(
      {
        ...openPosition,
        livePriceUsd: 0.05,
      },
      NOW_MS,
    );

    expect(result.unrealizedPnlUsd).toBe(-38.3);
    expect(result.unrealizedPnlPercent).toBeCloseTo((-38.3 / 88.3) * 100, 8);
  });

  it('returns zero unrealized PnL for a closed position', () => {
    const result = computeLivePositionMetrics(
      {
        ...openPosition,
        isOpen: false,
      },
      NOW_MS,
    );

    expect(result).toEqual({
      positionValueUsd: 0,
      unrealizedPnlUsd: 0,
      unrealizedPnlPercent: null,
      averageCostUsd: null,
      holdTimeMs: 12 * 24 * 60 * 60 * 1000,
    });
  });

  it('normalizes second-based API timestamps before calculating hold time', () => {
    const earliestBuyTimeSeconds = (NOW_MS - 60_000) / 1000;

    const result = computeLivePositionMetrics(
      {
        ...openPosition,
        earliestBuyTime: earliestBuyTimeSeconds,
      },
      NOW_MS,
    );

    expect(result.holdTimeMs).toBe(60_000);
  });
});
