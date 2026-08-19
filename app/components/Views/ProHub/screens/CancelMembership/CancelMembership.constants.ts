export interface CancelReason {
  id: string;
  labelKey: string;
}

export const CANCEL_REASONS: CancelReason[] = [
  {
    id: 'issue',
    labelKey: 'pro_hub.cancel_membership.reason_issue',
  },
  {
    id: 'no_value',
    labelKey: 'pro_hub.cancel_membership.reason_no_value',
  },
  {
    id: 'no_benefits',
    labelKey: 'pro_hub.cancel_membership.reason_no_benefits',
  },
  {
    id: 'support',
    labelKey: 'pro_hub.cancel_membership.reason_support',
  },
  {
    id: 'other',
    labelKey: 'pro_hub.cancel_membership.reason_other',
  },
];

export interface CancelMembershipStats {
  earnedAsMember: string;
  membershipCost: string;
}

export const MOCK_CANCEL_STATS: CancelMembershipStats = {
  earnedAsMember: '+$503.51',
  membershipCost: '$49.99/yr',
};
