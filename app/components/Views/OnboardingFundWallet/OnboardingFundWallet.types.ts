export type FundWalletOptionId =
  | 'apple_pay'
  | 'debit_credit'
  | 'wire_transfer'
  | 'receive_external'
  | 'paypal'
  | 'more_payment_methods';

export interface OnboardingFundWalletRouteParams {
  onComplete: () => void;
  accountType?: string;
  selectedInterests?: string[];
  otherText?: string;
}
