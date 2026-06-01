import { computePrizePoolProgress } from './prizePoolUtils';

describe('computePrizePoolProgress', () => {
  const ondoLike = [
    { deposit: 0, prize: 25_000 },
    { deposit: 1_500_000, prize: 50_000 },
    { deposit: 3_500_000, prize: 75_000 },
    { deposit: 6_000_000, prize: 100_000 },
  ] as const;

  it('returns first-tier defaults when amount is below first threshold above zero', () => {
    const result = computePrizePoolProgress(
      ondoLike,
      1_000_000,
      (m) => m.deposit,
    );
    expect(result.currentPrize).toBe(25_000);
    expect(result.nextPrize).toBe(50_000);
    expect(result.nextThreshold).toBe(1_500_000);
    expect(result.isMaxTier).toBe(false);
    expect(result.progress).toBeCloseTo(1_000_000 / 1_500_000);
  });

  it('returns max tier when amount meets final milestone', () => {
    const result = computePrizePoolProgress(
      ondoLike,
      6_000_000,
      (m) => m.deposit,
    );
    expect(result.progress).toBe(1);
    expect(result.currentPrize).toBe(100_000);
    expect(result.nextPrize).toBeNull();
    expect(result.nextThreshold).toBe(6_000_000);
    expect(result.isMaxTier).toBe(true);
  });

  it('interpolates progress within a tier (perps-style notionalVolume)', () => {
    const perpsLike = [
      { notionalVolume: 0, prize: 10_000 },
      { notionalVolume: 5_000_000, prize: 15_000 },
      { notionalVolume: 10_000_000, prize: 20_000 },
    ] as const;

    const mid = 7_500_000;
    const result = computePrizePoolProgress(
      perpsLike,
      mid,
      (m) => m.notionalVolume,
    );
    expect(result.currentPrize).toBe(15_000);
    expect(result.nextPrize).toBe(20_000);
    expect(result.nextThreshold).toBe(10_000_000);
    expect(result.progress).toBe(0.5);
  });

  it('returns zero progress at the start of the first tier', () => {
    const result = computePrizePoolProgress(ondoLike, 0, (m) => m.deposit);
    expect(result.progress).toBe(0);
    expect(result.currentPrize).toBe(25_000);
    expect(result.nextThreshold).toBe(1_500_000);
  });

  it('returns expected currentPrize at each Ondo-style tier boundary', () => {
    const cp = (amount: number) =>
      computePrizePoolProgress(ondoLike, amount, (m) => m.deposit).currentPrize;

    expect(cp(0)).toBe(25_000);
    expect(cp(500_000)).toBe(25_000);
    expect(cp(1_499_999)).toBe(25_000);
    expect(cp(1_500_000)).toBe(50_000);
    expect(cp(2_000_000)).toBe(50_000);
    expect(cp(3_499_999)).toBe(50_000);
    expect(cp(3_500_000)).toBe(75_000);
    expect(cp(4_500_000)).toBe(75_000);
    expect(cp(5_999_999)).toBe(75_000);
    expect(cp(6_000_000)).toBe(100_000);
    expect(cp(10_000_000)).toBe(100_000);
  });
});
