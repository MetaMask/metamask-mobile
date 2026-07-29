export type SliceKey = 'tokens' | 'money' | 'perps' | 'predict' | 'defi';

export type SliceStatus = 'loading' | 'ready' | 'error' | 'ineligible';

export type FiatConverter = (usdAmount: number) => number | undefined;

export interface SliceDelta {
  amount: number;
  /** Fractional change (e.g. 0.0124 → 1.24%). */
  percent?: number;
}

export interface BalanceSlice {
  key: SliceKey;
  valueFiat: number;
  delta?: SliceDelta;
  status: SliceStatus;
  apyPercentFormatted?: string;
  value1dAgoFiat?: number;
}

export interface SliceData extends BalanceSlice {
  color: string;
  percentOfTotal: number;
}

export interface HeroData {
  totalFiat: number;
  userCurrency: string;
  delta?: SliceDelta;
  status: SliceStatus;
}

export interface BreakdownData {
  hero: HeroData;
  slices: Record<SliceKey, SliceData>;
}
