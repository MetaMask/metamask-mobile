import { renderHook } from '@testing-library/react-native';
import { AssetType } from '../../../Views/confirmations/types/token';
import { useProjectedEarnings } from './useProjectedEarnings';
import { PROJECTION_YEARS } from '../utils/projections';
import { MONEY_DEFAULT_FIAT_CURRENCY } from '../constants/fiat';

const makeToken = (
  fiat: number,
  symbol = 'USDC',
  currency?: string,
): AssetType =>
  ({
    symbol,
    fiat: { balance: fiat, currency },
  }) as unknown as AssetType;

describe('useProjectedEarnings', () => {
  it('returns zeros and empty list when tokens is undefined', () => {
    const { result } = renderHook(() => useProjectedEarnings(undefined, 0.04));

    expect(result.current.eligibleTokens).toEqual([]);
    expect(result.current.totalAssetsFiat).toBe(0);
    expect(result.current.projectedAmount).toBe(0);
  });

  it('drops tokens with non-positive fiat balances', () => {
    const positive = makeToken(100);
    const zero = makeToken(0);
    const negative = makeToken(-50);

    const { result } = renderHook(() =>
      useProjectedEarnings([positive, zero, negative], 0.04),
    );

    expect(result.current.eligibleTokens).toEqual([positive]);
    expect(result.current.totalAssetsFiat).toBe(100);
  });

  it('sums fiat balances across eligible tokens', () => {
    const { result } = renderHook(() =>
      useProjectedEarnings([makeToken(150), makeToken(75)], 0.04),
    );

    expect(result.current.totalAssetsFiat).toBe(225);
  });

  it('projects earnings using the supplied APY across PROJECTION_YEARS', () => {
    const apyDecimal = 0.04;
    const tokens = [makeToken(1000), makeToken(500)];

    const { result } = renderHook(() =>
      useProjectedEarnings(tokens, apyDecimal),
    );

    const expected =
      1000 * apyDecimal * PROJECTION_YEARS +
      500 * apyDecimal * PROJECTION_YEARS;

    expect(result.current.projectedAmount).toBeCloseTo(expected, 5);
  });

  it('treats an undefined APY as 0', () => {
    const { result } = renderHook(() =>
      useProjectedEarnings([makeToken(1000)], undefined),
    );

    expect(result.current.projectedAmount).toBe(0);
  });

  describe('currency', () => {
    it('reflects the first eligible token fiat currency', () => {
      const { result } = renderHook(() =>
        useProjectedEarnings(
          [makeToken(100, 'USDC', 'eur'), makeToken(50, 'DAI', 'eur')],
          0.04,
        ),
      );

      expect(result.current.currency).toBe('eur');
    });

    it('falls back to the Money default when there are no eligible tokens', () => {
      const { result } = renderHook(() => useProjectedEarnings([], 0.04));

      expect(result.current.currency).toBe(MONEY_DEFAULT_FIAT_CURRENCY);
    });

    it('falls back to the Money default when tokens is undefined', () => {
      const { result } = renderHook(() =>
        useProjectedEarnings(undefined, 0.04),
      );

      expect(result.current.currency).toBe(MONEY_DEFAULT_FIAT_CURRENCY);
    });

    it('ignores a dropped zero-balance token currency at index 0', () => {
      const droppedZeroBalance = makeToken(0, 'ZERO', 'gbp');
      const eligible = makeToken(100, 'USDC', 'eur');

      const { result } = renderHook(() =>
        useProjectedEarnings([droppedZeroBalance, eligible], 0.04),
      );

      expect(result.current.currency).toBe('eur');
    });
  });
});
