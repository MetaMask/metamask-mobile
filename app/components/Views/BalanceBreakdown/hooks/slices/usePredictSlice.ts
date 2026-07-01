import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import { usePredictPositions } from '../../../../UI/Predict/hooks/usePredictPositions';
import { useUnrealizedPnL } from '../../../../UI/Predict/hooks/useUnrealizedPnL';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import { formatPredictUnrealizedPnLStringParts } from '../../../../UI/Predict/utils/format';
import type { PredictPosition } from '../../../../UI/Predict/types';
import { useFiatNormalizer } from '../useFiatNormalizer';
import type { SliceData, DrilldownRow } from '../../types';
import {
  SLICE_COLOR_PLACEHOLDER,
  SLICE_LABELS,
  MAX_DRILLDOWN_ROWS,
  PREDICT_BREAKDOWN_CATEGORY_LABEL,
} from '../../constants';
import {
  inferPredictBreakdownCategory,
  type PredictBreakdownCategory,
} from '../../utils/inferPredictBreakdownCategory';

const CATEGORY_ORDER: PredictBreakdownCategory[] = [
  'sports',
  'politics',
  'crypto',
  'other',
];

type CategoryAgg = {
  count: number;
  valueFiat: number;
  cashPnlUsd: number;
  initialUsd: number;
};

function categoryRowFromAgg(
  cat: PredictBreakdownCategory,
  g: CategoryAgg,
  sliceTotalFiat: number,
  toUserFiatFromUsdc: (usdc: number) => number,
): DrilldownRow {
  const cashPnlFiat = toUserFiatFromUsdc(g.cashPnlUsd);
  const pnlPercentPoints =
    g.initialUsd > 0 ? (g.cashPnlUsd / g.initialUsd) * 100 : 0;
  const portfolioPct =
    sliceTotalFiat > 0 ? Math.round((g.valueFiat / sliceTotalFiat) * 100) : 0;
  const sublabel = `${g.count} position${g.count !== 1 ? 's' : ''} • ${portfolioPct}%`;

  return {
    key: `predict-cat-${cat}`,
    label: PREDICT_BREAKDOWN_CATEGORY_LABEL[cat],
    sublabel,
    valueFiat: g.valueFiat,
    progressFraction: sliceTotalFiat > 0 ? g.valueFiat / sliceTotalFiat : 0,
    delta: { amount: cashPnlFiat },
    pnlPercentPoints,
  };
}

function buildPredictCategoryDrilldown(
  availableBalance: number,
  positions: PredictPosition[],
  sliceTotalFiat: number,
  maxRows: number,
  toUserFiatFromUsdc: (usdc: number) => number,
): DrilldownRow[] {
  const rows: DrilldownRow[] = [];

  if (availableBalance > 0) {
    rows.push({
      key: 'predict-available',
      label: strings('balance_breakdown.available_balance'),
      valueFiat: availableBalance,
      progressFraction:
        sliceTotalFiat > 0 ? availableBalance / sliceTotalFiat : 0,
    });
  }

  const openPositions = positions.filter(
    (p) => !p.claimable && (p.currentValue ?? 0) > 0,
  );

  const grouped: Record<PredictBreakdownCategory, CategoryAgg> = {
    sports: { count: 0, valueFiat: 0, cashPnlUsd: 0, initialUsd: 0 },
    politics: { count: 0, valueFiat: 0, cashPnlUsd: 0, initialUsd: 0 },
    crypto: { count: 0, valueFiat: 0, cashPnlUsd: 0, initialUsd: 0 },
    other: { count: 0, valueFiat: 0, cashPnlUsd: 0, initialUsd: 0 },
  };

  for (const pos of openPositions) {
    const cat = inferPredictBreakdownCategory(pos);
    const g = grouped[cat];
    g.count += 1;
    g.valueFiat += toUserFiatFromUsdc(pos.currentValue ?? 0);
    g.cashPnlUsd += pos.cashPnl ?? 0;
    g.initialUsd += pos.initialValue ?? 0;
  }

  const nonEmptyCats = CATEGORY_ORDER.filter((c) => grouped[c].count > 0);
  const categoryRows = nonEmptyCats.map((cat) =>
    categoryRowFromAgg(cat, grouped[cat], sliceTotalFiat, toUserFiatFromUsdc),
  );

  categoryRows.sort((a, b) => b.valueFiat - a.valueFiat);

  const slotForCategories = Math.max(0, maxRows - rows.length);
  if (slotForCategories <= 0) {
    return rows;
  }

  if (categoryRows.length <= slotForCategories) {
    rows.push(...categoryRows);
    return rows;
  }

  const head = categoryRows.slice(0, slotForCategories - 1);
  const tail = categoryRows.slice(slotForCategories - 1);

  const mergedAgg: CategoryAgg = tail.reduce(
    (acc, row) => {
      const cat = row.key.replace(
        'predict-cat-',
        '',
      ) as PredictBreakdownCategory;
      const src = grouped[cat];
      return {
        count: acc.count + src.count,
        valueFiat: acc.valueFiat + src.valueFiat,
        cashPnlUsd: acc.cashPnlUsd + src.cashPnlUsd,
        initialUsd: acc.initialUsd + src.initialUsd,
      };
    },
    { count: 0, valueFiat: 0, cashPnlUsd: 0, initialUsd: 0 },
  );

  const mergedRow: DrilldownRow = {
    key: 'predict-cat-merged',
    label: strings('balance_breakdown.predict_more_categories', {
      count: tail.length,
    }),
    sublabel: strings('balance_breakdown.predict_positions_count', {
      count: mergedAgg.count,
    }),
    valueFiat: mergedAgg.valueFiat,
    progressFraction:
      sliceTotalFiat > 0 ? mergedAgg.valueFiat / sliceTotalFiat : 0,
    delta: {
      amount: toUserFiatFromUsdc(mergedAgg.cashPnlUsd),
    },
    pnlPercentPoints:
      mergedAgg.initialUsd > 0
        ? (mergedAgg.cashPnlUsd / mergedAgg.initialUsd) * 100
        : 0,
  };

  rows.push(...head, mergedRow);
  return rows;
}

export function usePredictSlice(): SliceData {
  const isEnabled = useSelector(selectPredictEnabledFlag);
  const { toUserCurrency } = useFiatNormalizer();

  const {
    data: availableBalanceUsdc,
    isLoading: balanceLoading,
    isError: balanceError,
  } = usePredictBalance();

  const {
    data: positions = [],
    isLoading: positionsLoading,
    isError: positionsError,
  } = usePredictPositions({ claimable: false });

  const hasPositions = positions.length > 0;

  const { data: upnl } = useUnrealizedPnL({
    enabled: hasPositions,
  });

  const availableBalance = useMemo(
    () => toUserCurrency(availableBalanceUsdc ?? 0, 'usdc'),
    [availableBalanceUsdc, toUserCurrency],
  );

  const positionsValue = useMemo(
    () =>
      positions.reduce(
        (sum, p) => sum + toUserCurrency(p.currentValue ?? 0, 'usdc'),
        0,
      ),
    [positions, toUserCurrency],
  );

  const valueFiat = availableBalance + positionsValue;

  const heroSupplementalPnlText = useMemo(() => {
    if (!upnl || !hasPositions) {
      return undefined;
    }
    return strings(
      'predict.unrealized_pnl_value',
      formatPredictUnrealizedPnLStringParts({
        cashUpnl: upnl.cashUpnl ?? 0,
        percentUpnl: upnl.percentUpnl ?? 0,
      }),
    );
  }, [upnl, hasPositions]);

  const drilldown = useMemo<DrilldownRow[]>(
    () =>
      buildPredictCategoryDrilldown(
        availableBalance,
        positions as PredictPosition[],
        valueFiat,
        MAX_DRILLDOWN_ROWS,
        (usdc) => toUserCurrency(usdc, 'usdc'),
      ),
    [availableBalance, positions, valueFiat, toUserCurrency],
  );

  const status = useMemo(() => {
    if (!isEnabled) return 'ineligible' as const;
    if (balanceError || positionsError) return 'error' as const;
    if (balanceLoading || positionsLoading) return 'loading' as const;
    return 'ready' as const;
  }, [
    isEnabled,
    balanceError,
    positionsError,
    balanceLoading,
    positionsLoading,
  ]);

  return useMemo<SliceData>(
    () => ({
      key: 'predict',
      label: SLICE_LABELS.predict,
      color: SLICE_COLOR_PLACEHOLDER,
      valueFiat: status === 'ineligible' ? 0 : valueFiat,
      percentOfTotal: 0,
      status,
      drilldown,
      heroSupplementalPnlText:
        status === 'ready' ? heroSupplementalPnlText : undefined,
    }),
    [status, valueFiat, drilldown, heroSupplementalPnlText],
  );
}
