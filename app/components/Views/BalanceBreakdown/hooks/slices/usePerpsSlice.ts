import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  HIP3_ASSET_MARKET_TYPES,
  type MarketType,
  type Position,
} from '@metamask/perps-controller';
import {
  usePerpsLiveAccount,
  usePerpsLivePositions,
} from '../../../../UI/Perps/hooks';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { useFiatNormalizer } from '../useFiatNormalizer';
import type { SliceData, DrilldownRow } from '../../types';
import {
  SLICE_COLOR_PLACEHOLDER,
  SLICE_LABELS,
  PERPS_HOMEPAGE_THROTTLE_MS,
} from '../../constants';
import {
  formatPnl,
  formatPercentage,
} from '../../../../UI/Perps/utils/formatUtils';

const CATEGORY_LABELS: Record<MarketType, string> = {
  crypto: 'Crypto',
  equity: 'Stocks',
  commodity: 'Commodities',
  forex: 'Forex',
};

function getMarketType(symbol: string): MarketType {
  // symbol may be like "xyz:TSLA" or "ETH" for crypto
  const hip3Type = HIP3_ASSET_MARKET_TYPES[symbol];
  if (hip3Type) return hip3Type;

  // Check dex-prefixed variants
  const parts = symbol.split(':');
  if (parts.length === 2) {
    const key = `${parts[0]}:${parts[1]}`;
    const mapped = HIP3_ASSET_MARKET_TYPES[key];
    if (mapped) return mapped;
  }

  return 'crypto';
}

/** Sum of (position mark value + unrealized PnL) in USD — aligns donut/center with drilldown row primaries. */
export function sumPositionsMtMUsd(positions: Position[]): number {
  return positions.reduce((sum, pos) => {
    const posValue = parseFloat(pos.positionValue ?? '0') || 0;
    const pnl = parseFloat(pos.unrealizedPnl ?? '0') || 0;
    return sum + posValue + pnl;
  }, 0);
}

function buildPerpsDrilldown(positions: Position[], usdToUserCurrency: (v: number) => number): DrilldownRow[] {
  // Group positions by market category
  const grouped: Record<MarketType, { count: number; totalUsd: number; totalPnlUsd: number }> = {
    crypto: { count: 0, totalUsd: 0, totalPnlUsd: 0 },
    equity: { count: 0, totalUsd: 0, totalPnlUsd: 0 },
    commodity: { count: 0, totalUsd: 0, totalPnlUsd: 0 },
    forex: { count: 0, totalUsd: 0, totalPnlUsd: 0 },
  };

  for (const pos of positions) {
    const type = getMarketType(pos.symbol);
    const posValue = parseFloat(pos.positionValue ?? '0') || 0;
    const pnl = parseFloat(pos.unrealizedPnl ?? '0') || 0;
    grouped[type].count += 1;
    grouped[type].totalUsd += posValue;
    grouped[type].totalPnlUsd += pnl;
  }

  const totalMtMUsd = sumPositionsMtMUsd(positions);

  return (Object.keys(grouped) as MarketType[])
    .filter((type) => grouped[type].count > 0)
    .map((type) => {
      const catMtMUsd = grouped[type].totalUsd + grouped[type].totalPnlUsd;
      const pct =
        totalMtMUsd > 0 ? Math.round((catMtMUsd / totalMtMUsd) * 100) : 0;
      return {
        key: `perps-${type}`,
        label: CATEGORY_LABELS[type],
        sublabel: `${grouped[type].count} position${grouped[type].count !== 1 ? 's' : ''} • ${pct}%`,
        // Primary = notional @ mark + session uPnL (same basis as slice valueFiat / donut / hero center)
        valueFiat: usdToUserCurrency(catMtMUsd),
        progressFraction:
          totalMtMUsd > 0 ? catMtMUsd / totalMtMUsd : 0,
        delta: {
          amount: usdToUserCurrency(grouped[type].totalPnlUsd),
          label: 'session' as const,
        },
      };
    });
}

export function usePerpsSlice(): SliceData {
  const isEnabled = useSelector(selectPerpsEnabledFlag);
  const { toUserCurrency } = useFiatNormalizer();

  const { account, isInitialLoading } = usePerpsLiveAccount({
    throttleMs: PERPS_HOMEPAGE_THROTTLE_MS,
  });
  const { positions, isInitialLoading: positionsLoading } = usePerpsLivePositions();

  // Perps is ineligible when the feature flag is off
  const isIneligible = !isEnabled;

  const valueFiat = useMemo(() => {
    if (positions.length > 0) {
      return toUserCurrency(sumPositionsMtMUsd(positions), 'usd');
    }
    if (!account?.totalBalance) return 0;
    const tb = parseFloat(account.totalBalance);
    return toUserCurrency(Number.isFinite(tb) ? tb : 0, 'usd');
  }, [account, positions, toUserCurrency]);

  const drilldown = useMemo<DrilldownRow[]>(() => {
    if (!positions.length) return [];
    return buildPerpsDrilldown(positions, (v) => toUserCurrency(v, 'usd'));
  }, [positions, toUserCurrency]);

  const status = useMemo(() => {
    if (isIneligible) return 'ineligible' as const;
    if (isInitialLoading || positionsLoading) return 'loading' as const;
    if (!account) return 'loading' as const;
    return 'ready' as const;
  }, [isIneligible, isInitialLoading, positionsLoading, account]);

  /** Same string as homepage Perps section (`PerpsSection` unrealized P&L row). */
  const heroSupplementalPnlText = useMemo(() => {
    if (status !== 'ready' || positions.length === 0 || !account) {
      return undefined;
    }
    const unrealizedPnl = account.unrealizedPnl ?? '0';
    const roe = parseFloat(account.returnOnEquity || '0');
    const pnlNum = parseFloat(unrealizedPnl);
    return `${formatPnl(pnlNum)} (${formatPercentage(roe, 1)})`;
  }, [status, positions.length, account]);

  return useMemo<SliceData>(
    () => ({
      key: 'perps',
      label: SLICE_LABELS.perps,
      color: SLICE_COLOR_PLACEHOLDER,
      valueFiat: status === 'ineligible' ? 0 : valueFiat,
      percentOfTotal: 0,
      delta: undefined,
      heroSupplementalPnlText,
      status,
      drilldown,
    }),
    [status, valueFiat, heroSupplementalPnlText, drilldown],
  );
}
