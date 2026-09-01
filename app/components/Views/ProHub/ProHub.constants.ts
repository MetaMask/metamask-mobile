export interface ProHubStats {
  /** Formatted currency string for lifetime Pro earnings. */
  lifetimeEarnings: string;
  /** Formatted currency string for Money balance earnings. */
  moneyBalance: string;
  /** Formatted currency string for mUSD back earnings. */
  musdBack: string;
}

export interface ProHubNextPayment {
  /** Formatted currency string for the upcoming membership charge. */
  amount: string;
  /** Human-readable date of the next charge. */
  date: string;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_PRO_HUB_STATS: ProHubStats = {
  lifetimeEarnings: '$86.42',
  moneyBalance: '+$48.92',
  musdBack: '$0.00',
};

export const MOCK_NEXT_PAYMENT: ProHubNextPayment = {
  amount: '$49.99',
  date: 'Jul 20, 2027',
};
