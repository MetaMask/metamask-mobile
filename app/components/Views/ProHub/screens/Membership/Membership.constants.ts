export interface MembershipStats {
  /** Current plan name, e.g. "Pro (Annual)". */
  plan: string;
  /** Formatted currency string for earnings this month. */
  earnedThisMonth: string;
  /** Formatted currency string for savings this month. */
  savedThisMonth: string;
}

export interface PaymentDetails {
  /** Original price before discount (shown with strikethrough). */
  totalOriginal: string;
  /** Discounted / current price. */
  totalDiscounted: string;
  /** Short savings note displayed alongside the price. */
  savingsNote: string;
  /** Payment method label. */
  payingWith: string;
  /** Human-readable renewal date. */
  renewsOn: string;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_MEMBERSHIP_STATS: MembershipStats = {
  plan: 'Pro (Annual)',
  earnedThisMonth: '$22.50',
  savedThisMonth: '$12.84',
};

export const MOCK_PAYMENT_DETAILS: PaymentDetails = {
  totalOriginal: '$59.98',
  totalDiscounted: '$49.99',
  savingsNote: '2 months on us',
  payingWith: 'Money account',
  renewsOn: 'Jul 20, 2027',
};
