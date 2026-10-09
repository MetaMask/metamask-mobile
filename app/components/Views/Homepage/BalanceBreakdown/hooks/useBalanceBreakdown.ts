import { useMemo } from 'react';
import { useTokensSlice } from './slices/useTokensSlice';
import { useFiatNormalizer } from './useFiatNormalizer';
import { useNonTokenBalanceSlices } from '../../../../hooks/useNonTokenBalance';
import { SLICE_ORDER } from '../constants';
import { computeAggregateHero24hDelta } from '../utils/aggregateHero24hDelta';
import type {
  BalanceSlice,
  BreakdownData,
  HeroData,
  SliceData,
  SliceKey,
} from '../types';

function computePercentages(slices: Record<SliceKey, BalanceSlice>): {
  slices: Record<SliceKey, SliceData>;
  totalFiat: number;
} {
  const ready = SLICE_ORDER.filter((k) => slices[k].status === 'ready');
  // Money vault accounts are not part of AccountsController/account groups, so
  // the Money and Tokens slice sources are disjoint and can be summed directly.
  const totalFiat = ready.reduce((s, k) => s + slices[k].valueFiat, 0);
  // Allocation represents positive holdings. Debt still reduces the hero's net
  // total, but cannot be used as the denominator for a proportional asset bar.
  const allocationTotalFiat = ready.reduce(
    (sum, key) => sum + Math.max(slices[key].valueFiat, 0),
    0,
  );

  const updated = {} as Record<SliceKey, SliceData>;
  for (const key of SLICE_ORDER) {
    updated[key] = {
      ...slices[key],
      percentOfTotal:
        allocationTotalFiat > 0 &&
        slices[key].status === 'ready' &&
        slices[key].valueFiat > 0
          ? slices[key].valueFiat / allocationTotalFiat
          : 0,
    };
  }
  return { slices: updated, totalFiat };
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
  const { toUserCurrency, userCurrency } = useFiatNormalizer();
  const tokensSlice = useTokensSlice();
  const nonTokenSlices = useNonTokenBalanceSlices(toUserCurrency);

  const slicesRaw: Record<SliceKey, BalanceSlice> = useMemo(
    () => ({
      tokens: tokensSlice,
      money: nonTokenSlices.money,
      perps: nonTokenSlices.perps,
      predict: nonTokenSlices.predict,
      defi: nonTokenSlices.defi,
    }),
    [nonTokenSlices, tokensSlice],
  );

  const { slices, totalFiat } = useMemo(
    () => computePercentages(slicesRaw),
    [slicesRaw],
  );

  const heroStatus = useMemo(
    () => aggregateStatus(slices, totalFiat),
    [slices, totalFiat],
  );
  const isHeroPartiallyLoaded = useMemo(
    () =>
      heroStatus === 'ready' &&
      SLICE_ORDER.some((key) => slices[key].status === 'loading'),
    [heroStatus, slices],
  );
  const hasHeroErroredSlice = useMemo(
    () =>
      heroStatus === 'ready' &&
      SLICE_ORDER.some((key) => slices[key].status === 'error'),
    [heroStatus, slices],
  );

  const hero = useMemo<HeroData>(() => {
    /** A missing Perps baseline must not turn session PnL into a “Today” value. */
    const PERPS_24H_BASELINE_EPS = 1e-6;
    const hasTrustworthyPerps24hBaseline =
      slices.perps.valueFiat <= PERPS_24H_BASELINE_EPS ||
      (slices.perps.value1dAgoFiat ?? 0) > PERPS_24H_BASELINE_EPS;

    const includePerpsContribution =
      slices.perps.status === 'ready' &&
      slices.perps.value1dAgoFiat !== undefined &&
      hasTrustworthyPerps24hBaseline;

    const perpsFiatContribution = includePerpsContribution
      ? slices.perps.valueFiat - (slices.perps.value1dAgoFiat ?? 0)
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
      isPartiallyLoaded: isHeroPartiallyLoaded,
      hasErroredSlice: hasHeroErroredSlice,
    };
  }, [
    totalFiat,
    userCurrency,
    tokensSlice.delta,
    heroStatus,
    hasHeroErroredSlice,
    isHeroPartiallyLoaded,
    slices.perps.status,
    slices.perps.value1dAgoFiat,
    slices.perps.valueFiat,
  ]);

  return { hero, slices };
}
