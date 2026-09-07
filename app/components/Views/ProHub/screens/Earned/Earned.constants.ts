export interface EarnedBreakdownItem {
  /** Formatted currency string including the leading + sign. */
  amount: string;
}

export interface EarnedScreenData {
  /** Formatted lifetime earnings since joining Pro. */
  total: string;
  /** Interest earned on Money balance. */
  interest: EarnedBreakdownItem;
  /** Card cashback earned. */
  cardCashback: EarnedBreakdownItem;
  /** Spend amount shown in the card cashback subtitle. */
  cardCashbackSpend: string;
  /** Combined earned-back total used in the paid-for-itself section. */
  paidForItself: string;
  /** How many times the membership fee has been earned back. */
  membershipFeeMultiplier: string;
  /** Formatted membership fee used in the paid-for-itself copy. */
  membershipFee: string;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_EARNED_DATA: EarnedScreenData = {
  total: '$503.51',
  interest: {
    amount: '+$223.01',
  },
  cardCashback: {
    amount: '+$280.50',
  },
  cardCashbackSpend: '$9,350.00',
  paidForItself: '$770.12',
  membershipFeeMultiplier: '15',
  membershipFee: '$49.99',
};
