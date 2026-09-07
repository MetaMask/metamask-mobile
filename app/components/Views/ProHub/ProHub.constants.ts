export interface ProHubStats {
  /** Formatted currency string for lifetime Pro earnings. */
  earned: string;
  /** Formatted currency string for lifetime Pro savings. */
  saved: string;
}

export interface ProHubNextPayment {
  /** Formatted currency string for the upcoming membership charge. */
  amount: string;
  /** Human-readable date of the next charge. */
  date: string;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_PRO_HUB_STATS: ProHubStats = {
  earned: '$500.30',
  saved: '$266.61',
};

export const MOCK_NEXT_PAYMENT: ProHubNextPayment = {
  amount: '$49.99',
  date: 'Jul 20, 2027',
};

export type TradeAllowanceKind = 'currency' | 'count';

export interface TradeAllowanceItem {
  id: 'swaps' | 'perps' | 'predict';
  used: number;
  allowance: number;
  kind: TradeAllowanceKind;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_TRADE_ALLOWANCES: TradeAllowanceItem[] = [
  { id: 'swaps', used: 310, allowance: 500, kind: 'currency' },
  { id: 'perps', used: 240, allowance: 1000, kind: 'currency' },
  { id: 'predict', used: 0, allowance: 1, kind: 'count' },
];
