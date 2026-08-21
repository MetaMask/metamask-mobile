export interface SavedBreakdownItem {
  /** Formatted currency string including the leading + sign. */
  amount: string;
}

export interface SavedScreenData {
  /** Formatted lifetime savings since joining Pro. */
  total: string;
  /** Trading-fee savings on swaps and perps. */
  tradingFees: SavedBreakdownItem;
  /** Card and ATM fee savings. */
  cardAndAtmFees: SavedBreakdownItem;
  /** Combined earned-back total used in the paid-for-itself section. */
  paidForItself: string;
  /** How many times the membership fee has been earned back. */
  membershipFeeMultiplier: string;
  /** Formatted membership fee used in the paid-for-itself copy. */
  membershipFee: string;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_SAVED_DATA: SavedScreenData = {
  total: '$266.61',
  tradingFees: {
    amount: '+$125.81',
  },
  cardAndAtmFees: {
    amount: '+$140.80',
  },
  paidForItself: '$770.12',
  membershipFeeMultiplier: '15',
  membershipFee: '$49.99',
};
