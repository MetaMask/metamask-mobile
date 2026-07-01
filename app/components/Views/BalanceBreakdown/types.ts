import type { ImageSourcePropType } from 'react-native';

export type SliceKey = 'tokens' | 'perps' | 'predict' | 'defi';

export type SliceStatus = 'loading' | 'ready' | 'error' | 'ineligible';

export type DeltaLabel = '24h' | 'session' | 'cost-basis';

export interface SliceDelta {
  amount: number;
  /**
   * Fractional change for hero formatting (e.g. 0.0124 → 1.24%).
   * Predict and Perps use `heroSupplementalPnlText` for the hero line instead.
   */
  percent?: number;
  label?: DeltaLabel;
}

export interface DrilldownRow {
  key: string;
  label: string;
  sublabel?: string;
  /** Inline token avatar after the title (tokens drilldown). */
  titleAvatar?: {
    name: string;
    imageUri?: string;
    /** Bundled artwork (e.g. native ETH) — takes precedence over imageUri. */
    localImage?: ImageSourcePropType;
  };
  valueFiat: number;
  /**
   * 1d holding-value % change, **percentage points** (same as `BalanceChangeResult.percentChange` /
   * `getFormattedPercentageChange` input — not a fraction).
   */
  pricePercentChange1d?: number;
  delta?: SliceDelta;
  /**
   * P&L as percentage points vs. initial stake (e.g. 21.59 for +21.59%).
   * Used with `delta.amount` for the secondary line in detailed list rows.
   */
  pnlPercentPoints?: number;
  /** Portion of the parent slice total (0–1); drives the row progress bar (fill uses slice color). */
  progressFraction?: number;
}

export interface SliceData {
  key: SliceKey;
  label: string;
  color: string;
  valueFiat: number;
  percentOfTotal: number;
  delta?: SliceDelta;
  status: SliceStatus;
  drilldown: DrilldownRow[];
  /**
   * When set (Predict / Perps), the donut hero shows this exact P&L line to match
   * the homepage section formatting.
   */
  heroSupplementalPnlText?: string;
}

export type BreakdownWarning =
  | 'multi_evm_undercount'
  | 'defi_stale'
  | 'perps_ineligible'
  | 'predict_ineligible';

export interface HeroData {
  totalFiat: number;
  userCurrency: string;
  delta?: SliceDelta;
  status: SliceStatus;
}

export interface BreakdownData {
  hero: HeroData;
  slices: Record<SliceKey, SliceData>;
  warnings: BreakdownWarning[];
}
