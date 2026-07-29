import { useMemo } from 'react';
import { useTheme } from '../../../../util/theme';
import { useTokensSlice } from './slices/useTokensSlice';
import { useMoneySlice } from './slices/useMoneySlice';
import { usePerpsSlice } from './slices/usePerpsSlice';
import { usePredictSlice } from './slices/usePredictSlice';
import { useDefiSlice } from './slices/useDefiSlice';
import { useFiatNormalizer } from './useFiatNormalizer';
import { SLICE_ORDER } from '../constants';
import { computeAggregateHero24hDelta } from '../utils/aggregateHero24hDelta';
import { getBalanceBreakdownSliceColors } from '../utils/getBalanceBreakdownSliceColors';
import type {
  BalanceSlice,
  BreakdownData,
  HeroData,
  SliceData,
  SliceKey,
} from '../types';

function computePercentages(
  slices: Record<SliceKey, SliceData>,
): Record<SliceKey, SliceData> {
  const ready = SLICE_ORDER.filter((k) => slices[k].status === 'ready');
  const total = ready.reduce((s, k) => s + slices[k].valueFiat, 0);

  const updated = { ...slices };
  for (const key of SLICE_ORDER) {
    updated[key] = {
      ...slices[key],
      percentOfTotal:
        total > 0 && slices[key].status === 'ready'
          ? slices[key].valueFiat / total
          : 0,
    };
  }
  return updated;
}

function aggregateStatus(
  slices: Record<SliceKey, SliceData>,
  totalFiat: number,
): HeroData['status'] {
  const eligibleSlices = SLICE_ORDER.filter(
    (k) => slices[k].status !== 'ineligible',
  );
  const hasReadySlice = eligibleSlices.some(
    (k) => slices[k].status === 'ready',
  );
  const hasLoadingSlice = eligibleSlices.some(
    (k) => slices[k].status === 'loading',
  );

  // A zero-valued ready slice is not enough to conclude the portfolio is empty
  // while another eligible balance is still loading.
  if (hasReadySlice && (totalFiat !== 0 || !hasLoadingSlice)) {
    return 'ready';
  }

  if (hasLoadingSlice) {
    return 'loading';
  }

  if (eligibleSlices.some((k) => slices[k].status === 'error')) {
    return 'error';
  }

  return 'ineligible';
}

export function useBalanceBreakdown(): BreakdownData {
  const { themeAppearance } = useTheme();
  const { toUserCurrency, userCurrency } = useFiatNormalizer();
  const tokensSlice = useTokensSlice();
  const moneySlice = useMoneySlice(toUserCurrency);
  const perpsSlice = usePerpsSlice(toUserCurrency);
  const predictSlice = usePredictSlice(toUserCurrency);
  const defiSlice = useDefiSlice(toUserCurrency);

  const slicesRaw: Record<SliceKey, BalanceSlice> = useMemo(
    () => ({
      tokens: tokensSlice,
      money: moneySlice,
      perps: perpsSlice,
      predict: predictSlice,
      defi: defiSlice,
    }),
    [tokensSlice, moneySlice, perpsSlice, predictSlice, defiSlice],
  );

  const sliceStrokeColors = useMemo(
    () => getBalanceBreakdownSliceColors(themeAppearance),
    [themeAppearance],
  );

  const slicesWithThemeColors: Record<SliceKey, SliceData> = useMemo(
    () =>
      Object.fromEntries(
        SLICE_ORDER.map((key) => [
          key,
          {
            ...slicesRaw[key],
            color: sliceStrokeColors[key],
            percentOfTotal: 0,
          },
        ]),
      ) as Record<SliceKey, SliceData>,
    [slicesRaw, sliceStrokeColors],
  );

  const slices = useMemo(
    () => computePercentages(slicesWithThemeColors),
    [slicesWithThemeColors],
  );

  const totalFiat = useMemo(
    () =>
      SLICE_ORDER.filter((k) => slices[k].status === 'ready').reduce(
        (s, k) => s + slices[k].valueFiat,
        0,
      ),
    [slices],
  );

  const heroStatus = useMemo(
    () => aggregateStatus(slices, totalFiat),
    [slices, totalFiat],
  );

  const hero = useMemo<HeroData>(() => {
    /** A missing Perps baseline must not turn session PnL into a “Today” value. */
    const PERPS_24H_BASELINE_EPS = 1e-6;
    const hasTrustworthyPerps24hBaseline =
      perpsSlice.valueFiat <= PERPS_24H_BASELINE_EPS ||
      (perpsSlice.value1dAgoFiat ?? 0) > PERPS_24H_BASELINE_EPS;

    const includePerpsContribution =
      perpsSlice.status === 'ready' &&
      perpsSlice.value1dAgoFiat !== undefined &&
      hasTrustworthyPerps24hBaseline;

    const perpsFiatContribution = includePerpsContribution
      ? perpsSlice.valueFiat - (perpsSlice.value1dAgoFiat ?? 0)
      : 0;

    return {
      totalFiat,
      userCurrency,
      delta: computeAggregateHero24hDelta({
        totalFiat,
        tokensDelta: tokensSlice.delta,
        perpsFiatContribution,
        includePerpsContribution,
      }),
      status: heroStatus,
    };
  }, [
    totalFiat,
    userCurrency,
    tokensSlice.delta,
    heroStatus,
    perpsSlice.status,
    perpsSlice.value1dAgoFiat,
    perpsSlice.valueFiat,
  ]);

  return { hero, slices };
}
