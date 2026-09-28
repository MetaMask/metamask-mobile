import {
  CANCELLATION_REASONS,
  type CancellationReasonCode,
} from '@metamask/subscription-controller';

export interface CancelReason {
  id: CancellationReasonCode;
  labelKey: string;
}

export const OTHER_REASON_ID = CANCELLATION_REASONS.OTHER;

export const CANCEL_REASONS: CancelReason[] = [
  {
    id: CANCELLATION_REASONS.TOO_EXPENSIVE,
    labelKey: 'pro_hub.cancel_membership.reason_cost',
  },
  {
    id: CANCELLATION_REASONS.NOT_USING_BENEFITS,
    labelKey: 'pro_hub.cancel_membership.reason_not_using',
  },
  {
    id: CANCELLATION_REASONS.BENEFITS_NOT_AS_EXPECTED,
    labelKey: 'pro_hub.cancel_membership.reason_benefit_misfit',
  },
  {
    id: CANCELLATION_REASONS.SOMETHING_DID_NOT_WORK,
    labelKey: 'pro_hub.cancel_membership.reason_didnt_work',
  },
  {
    id: CANCELLATION_REASONS.UNHAPPY_WITH_SUPPORT,
    labelKey: 'pro_hub.cancel_membership.reason_support',
  },
  {
    id: OTHER_REASON_ID,
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
