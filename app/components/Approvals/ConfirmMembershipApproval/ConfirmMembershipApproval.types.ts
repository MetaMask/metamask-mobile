export interface ConfirmMembershipRequestData {
  monthlyAmount: string;
  totalAmount: string;
  renewDate: string;
  isTrial?: boolean;
  billedOn?: string;
}
