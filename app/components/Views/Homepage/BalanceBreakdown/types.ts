export type SliceKey = 'tokens' | 'money' | 'perps' | 'predict' | 'defi';

export type SliceStatus =
  | 'loading'
  | 'ready'
  /**
   * The slice reports a value, but an underlying source is missing (TAT-4407:
   * an aggregated Perps total where at least one venue failed to report), so
   * the figure is a subtotal rather than the complete balance. Renders like
   * `ready` — the money is real — but consumers can flag the incompleteness.
   */
  | 'partial'
  | 'error'
  | 'ineligible';

export type FiatConverter = (usdAmount: number) => number | undefined;

export interface SliceDelta {
  amount: number;
  /** Fractional change (e.g. 0.0124 → 1.24%). */
  percent?: number;
}

export interface BalanceSlice {
  key: SliceKey;
  /** Whether the product should be exposed on the homepage. */
  isVisible: boolean;
  valueFiat: number;
  delta?: SliceDelta;
  status: SliceStatus;
  apyPercent?: number;
  apyLoading?: boolean;
  value1dAgoFiat?: number;
}

export interface SliceData extends BalanceSlice {
  percentOfTotal: number;
}

export interface HeroData {
  totalFiat: number;
  userCurrency: string;
  delta?: SliceDelta;
  status: SliceStatus;
  isPartiallyLoaded?: boolean;
  hasErroredSlice?: boolean;
}

export interface BreakdownData {
  hero: HeroData;
  slices: Record<SliceKey, SliceData>;
}
