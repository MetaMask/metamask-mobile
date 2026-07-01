import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { usePredictEligibility } from '../../../UI/Predict/hooks/usePredictEligibility';
import { selectPredictEnabledFlag } from '../../../UI/Predict/selectors/featureFlags';
import { usePerpsPortfolioBalance } from '../../../UI/Perps/hooks/usePerpsPortfolioBalance';
import { useTokensSlice } from './slices/useTokensSlice';
import { usePerpsSlice } from './slices/usePerpsSlice';
import { usePredictSlice } from './slices/usePredictSlice';
import { useDefiSlice } from './slices/useDefiSlice';
import { useFiatNormalizer } from './useFiatNormalizer';
import { SLICE_ORDER } from '../constants';
import { computeAggregateHero24hDelta } from '../utils/aggregateHero24hDelta';
import { getBalanceBreakdownSliceColors } from '../utils/getBalanceBreakdownSliceColors';
import type {
  BreakdownData,
  BreakdownWarning,
  HeroData,
  SliceData,
  SliceKey,
} from '../types';

function computePercentages(
  slices: Record<SliceKey, SliceData>,
): Record<SliceKey, SliceData> {
  const eligible = SLICE_ORDER.filter(
    (k) => slices[k].status !== 'ineligible',
  );
  const total = eligible.reduce((s, k) => s + slices[k].valueFiat, 0);

  const updated = { ...slices };
  for (const key of SLICE_ORDER) {
    updated[key] = {
      ...slices[key],
      percentOfTotal: total > 0 ? slices[key].valueFiat / total : 0,
    };
  }
  return updated;
}

function aggregateStatus(
  slices: Record<SliceKey, SliceData>,
): HeroData['status'] {
  const eligibleSlices = SLICE_ORDER.filter(
    (k) => slices[k].status !== 'ineligible',
  );

  if (eligibleSlices.every((k) => slices[k].status === 'loading')) {
    return 'loading';
  }

  if (eligibleSlices.some((k) => slices[k].status === 'ready')) {
    return 'ready';
  }

  if (eligibleSlices.every((k) => slices[k].status === 'error')) {
    return 'error';
  }

  return 'loading';
}

export function useBalanceBreakdown(): BreakdownData {
  const { colors } = useTheme();
  const { userCurrency } = useFiatNormalizer();
  const predictFeatureEnabled = useSelector(selectPredictEnabledFlag);
  const { isEligible, country } = usePredictEligibility();
  const tokensSlice = useTokensSlice();
  const perpsSlice = usePerpsSlice();
  const predictSlice = usePredictSlice();
  const defiSlice = useDefiSlice();
  const {
    perpsBalance,
    perpsBalance1dAgo,
    hasPerpsData,
    unrealizedPnl: perpsUnrealizedPnl,
  } = usePerpsPortfolioBalance();

  const slicesRaw: Record<SliceKey, SliceData> = useMemo(
    () => ({
      tokens: tokensSlice,
      perps: perpsSlice,
      predict: predictSlice,
      defi: defiSlice,
    }),
    [tokensSlice, perpsSlice, predictSlice, defiSlice],
  );

  const sliceStrokeColors = useMemo(
    () => getBalanceBreakdownSliceColors(colors),
    [colors],
  );

  const slicesWithThemeColors: Record<SliceKey, SliceData> = useMemo(() => {
    const next = { ...slicesRaw };
    for (const key of SLICE_ORDER) {
      next[key] = { ...next[key], color: sliceStrokeColors[key] };
    }
    return next;
  }, [slicesRaw, sliceStrokeColors]);

  const slices = useMemo(
    () => computePercentages(slicesWithThemeColors),
    [slicesWithThemeColors],
  );

  const totalFiat = useMemo(
    () =>
      SLICE_ORDER.filter((k) => slices[k].status !== 'ineligible').reduce(
        (s, k) => s + slices[k].valueFiat,
        0,
      ),
    [slices],
  );

  const heroStatus = useMemo(() => aggregateStatus(slices), [slices]);

  const warnings = useMemo<BreakdownWarning[]>(() => {
    const w: BreakdownWarning[] = [];
    if (slices.perps.status === 'ineligible') w.push('perps_ineligible');
    // Geo / trading restriction: do not use slice status — Predict defaults eligible:false
    // until refresh completes (same reason usePredictSlice ignores eligibility for amounts).
    if (
      predictFeatureEnabled &&
      !isEligible &&
      country !== undefined &&
      country !== ''
    ) {
      w.push('predict_ineligible');
    }
    if (slices.defi.status === 'ready') w.push('defi_stale');
    return w;
  }, [slices, predictFeatureEnabled, isEligible, country]);

  const hero = useMemo<HeroData>(() => {
    /**
     * Without a populated `accountValue1dAgo`, `perpsBalance - 0` equals full NAV and blows up the hero.
     * When baseline is missing, use live unrealized PnL (Perps “profit”) so the total line still reflects perps.
     */
    const PERPS_24H_BASELINE_EPS = 1e-6;
    const hasTrustworthyPerps24hBaseline =
      perpsBalance <= PERPS_24H_BASELINE_EPS ||
      perpsBalance1dAgo > PERPS_24H_BASELINE_EPS;

    const includePerpsContribution =
      perpsSlice.status === 'ready' && hasPerpsData;

    const perpsFiatContribution = includePerpsContribution
      ? hasTrustworthyPerps24hBaseline
        ? perpsBalance - perpsBalance1dAgo
        : perpsUnrealizedPnl
      : 0;

    const hasToken24h = tokensSlice.delta !== undefined;
    const perpsUsesSessionPnl =
      includePerpsContribution && !hasTrustworthyPerps24hBaseline;

    const deltaLabel: '24h' | 'session' | null | undefined =
      hasToken24h &&
      perpsUsesSessionPnl &&
      Math.abs(perpsFiatContribution) > PERPS_24H_BASELINE_EPS
        ? null
        : !hasToken24h && perpsUsesSessionPnl
          ? 'session'
          : undefined;

    return {
      totalFiat,
      userCurrency,
      delta: computeAggregateHero24hDelta({
        totalFiat,
        tokensDelta: tokensSlice.delta,
        perpsFiatContribution,
        includePerpsContribution,
        deltaLabel,
      }),
      status: heroStatus,
    };
  }, [
    totalFiat,
    userCurrency,
    tokensSlice.delta,
    heroStatus,
    perpsSlice.status,
    hasPerpsData,
    perpsBalance,
    perpsBalance1dAgo,
    perpsUnrealizedPnl,
  ]);

  return { hero, slices, warnings };
}
