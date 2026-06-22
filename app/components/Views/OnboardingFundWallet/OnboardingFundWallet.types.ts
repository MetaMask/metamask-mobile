export interface OnboardingFundWalletRouteParams {
  onComplete: () => void;
  accountType?: string;
  selectedInterests?: string[];
  otherText?: string;
}
