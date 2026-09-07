export interface CancelReason {
  id: string;
  labelKey: string;
}

export const CANCEL_REASONS: CancelReason[] = [
  {
    id: 'cost',
    labelKey: 'pro_hub.cancel_membership.reason_cost',
  },
  {
    id: 'not_using',
    labelKey: 'pro_hub.cancel_membership.reason_not_using',
  },
  {
    id: 'benefit_misfit',
    labelKey: 'pro_hub.cancel_membership.reason_benefit_misfit',
  },
  {
    id: 'didnt_work',
    labelKey: 'pro_hub.cancel_membership.reason_didnt_work',
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

export const MAX_STAY_FEEDBACK_LENGTH = 280;

export interface CancelMembershipStats {
  earnedAsMember: string;
  membershipCost: string;
}

export const MOCK_CANCEL_STATS: CancelMembershipStats = {
  earnedAsMember: '+$503.51',
  membershipCost: '$49.99/yr',
};

/** Mock cancellation end-date shown in the success step. */
export const MOCK_CANCELLATION_END_DATE = 'July 20th, 2027';
