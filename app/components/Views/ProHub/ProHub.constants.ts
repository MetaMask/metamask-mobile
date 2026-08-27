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
