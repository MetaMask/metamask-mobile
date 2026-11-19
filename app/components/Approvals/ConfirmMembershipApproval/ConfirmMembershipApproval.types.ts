export interface ConfirmMembershipRequestData {
  monthlyAmount: string;
  totalAmount: string;
  /** True when the selected plan bills once a year. */
  isAnnual: boolean;
  renewDate: string;
  isTrial?: boolean;
  billedOn?: string;
}
