import { renderHook } from '@testing-library/react-native';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useProjectedEarnings } from './useProjectedEarnings';
import { PROJECTION_YEARS } from '../utils/projections';

const makeToken = (fiat: number, symbol = 'USDC'): AssetType =>
  ({
    symbol,
    fiat: { balance: fiat },
  }) as unknown as AssetType;

describe('useProjectedEarnings', () => {
  it('returns zeros and empty list when tokens is undefined', () => {
    const { result } = renderHook(() => useProjectedEarnings(undefined, 4));

    expect(result.current.eligibleTokens).toEqual([]);
    expect(result.current.totalAssetsFiat).toBe(0);
    expect(result.current.projectedAmount).toBe(0);
  });

  it('drops tokens with non-positive fiat balances', () => {
    const positive = makeToken(100);
    const zero = makeToken(0);
    const negative = makeToken(-50);

    const { result } = renderHook(() =>
      useProjectedEarnings([positive, zero, negative], 4),
    );

    expect(result.current.eligibleTokens).toEqual([positive]);
    expect(result.current.totalAssetsFiat).toBe(100);
  });

  it('sums fiat balances across eligible tokens', () => {
    const { result } = renderHook(() =>
      useProjectedEarnings([makeToken(150), makeToken(75)], 4),
    );

    expect(result.current.totalAssetsFiat).toBe(225);
  });

  it('projects earnings using the supplied APY across PROJECTION_YEARS', () => {
    const apyPercent = 4;
    const tokens = [makeToken(1000), makeToken(500)];

    const { result } = renderHook(() =>
      useProjectedEarnings(tokens, apyPercent),
    );

    const expected =
      1000 * (apyPercent / 100) * PROJECTION_YEARS +
      500 * (apyPercent / 100) * PROJECTION_YEARS;

    expect(result.current.projectedAmount).toBeCloseTo(expected, 5);
  });

  it('treats an undefined APY as 0', () => {
    const { result } = renderHook(() =>
      useProjectedEarnings([makeToken(1000)], undefined),
    );

    expect(result.current.projectedAmount).toBe(0);
  });
});
