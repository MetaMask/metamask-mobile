import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';

export const REWARDS_MONEY_PROFILE_ID = 'profile-a';
export const REWARDS_MONEY_KEYRING_ID = 'entropy-source-1';

const LOCALIZED_TEXT = {
  waysToEarn: 'Ways to earn',
  earningsTab: 'Earnings',
  earnEligibleFees: 'Earn on eligible fees',
  yourReferralCode: 'Your referral code',
  share: 'Share',
  historyReferrals: 'Referrals',
  recordedEarnings: 'recorded claims',
  invitedBenefitTitle: 'Your referral benefit',
  invitedReferredBy: 'Referred by',
  invitedOptInDescription: 'Opt in to Rewards to start earning.',
  invitedOptInAction: 'Opt in to Rewards',
  invitedOptInLegal: 'Rewards terms apply.',
  inviteTitle: 'Claim your invite',
  inviteMessageBody: 'Your friend sent you a code that earns you cashback.',
  inviteReferralCode: 'Invite code',
  inviteDecline: 'Continue without referral',
  inviteAccept: 'Accept invite',
} as unknown as ReferralLocalizedText;

const EARN_RATES = {
  cashback_rate_bps: 500,
  cashback_earning_start: null,
  cashback_earning_end: null,
  revshare_rate_bps: 2500,
  revshare_earning_start: null,
  revshare_earning_end: null,
};

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  voided: '0',
  by_claim_family: {},
};

/** Rev-share lifetime 41750000 formats as $41.75. Cashback lifetime 7650000 formats as $7.65. */
export const REWARDS_MONEY_EARNINGS_SUMMARY = {
  lifetime_total: '0',
  window: null,
  pending: '0',
  claimed: '0',
  voided: '0',
  pairing_pending: false,
  minimum_musd_base_units: '1000000',
  self_earned: {
    ...emptyBranch,
    by_claim_family: {
      REFERRAL_TRADE_FEE_CASHBACK: { ...emptyBranch, lifetime: '7650000' },
    },
  },
  earned_by_others: {
    ...emptyBranch,
    by_claim_family: {
      REFERRAL_REV_SHARE: { ...emptyBranch, lifetime: '41750000' },
      SOCIAL_FOLLOW_TRADE: { ...emptyBranch, lifetime: '9150000' },
    },
  },
} as unknown as EarningsSummaryDto;

export function referralMeFixture(
  variant: 'REFERRER' | 'REFEREE' | 'NONE',
): ReferralMeDto {
  if (variant === 'REFERRER') {
    return {
      roles: ['REFERRER'],
      ui_variant: 'REFERRER',
      user_type: 'REGULAR',
      status: 'ACTIVE',
      referral_code: {
        code: 'SOPHIE',
        kind: 'PRIMARY',
        status: 'ACTIVE',
        share_url: null,
      },
      referral_code_status: 'ACTIVE',
      referred_by: null,
      earn_rates: EARN_RATES,
      localized_text: LOCALIZED_TEXT,
      invite_hero: null,
    };
  }

  if (variant === 'REFEREE') {
    return {
      roles: ['REFEREE'],
      ui_variant: 'REFEREE',
      user_type: 'REGULAR',
      status: 'ACTIVE',
      referral_code: null,
      referral_code_status: null,
      referred_by: { referral_code: 'SOPHIE' },
      earn_rates: EARN_RATES,
      localized_text: LOCALIZED_TEXT,
      invite_hero: null,
    };
  }

  return {
    roles: [],
    ui_variant: 'NONE',
    user_type: 'REGULAR',
    status: 'ACTIVE',
    referral_code: null,
    referral_code_status: null,
    referred_by: null,
    earn_rates: {
      cashback_rate_bps: null,
      cashback_earning_start: null,
      cashback_earning_end: null,
      revshare_rate_bps: null,
      revshare_earning_start: null,
      revshare_earning_end: null,
    },
    localized_text: LOCALIZED_TEXT,
    invite_hero: null,
  };
}

/**
 * Session identity and the Money flag, with no cached referral-me payload.
 * A cached entry would open the tab before the fetch and skip the skeleton.
 */
export const initialStateRewardsMoney = (options?: {
  referralMe?: ReferralMeDto;
}) => {
  const referralMe = options?.referralMe;

  return createStateFixture()
    .withRemoteFeatureFlags({
      rewardsMoneyControllerEnabled: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData: {
              [REWARDS_MONEY_KEYRING_ID]: {
                profile: { profileId: REWARDS_MONEY_PROFILE_ID },
              },
            },
          },
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              {
                type: 'HD Key Tree',
                accounts: [],
                metadata: { id: REWARDS_MONEY_KEYRING_ID, name: '' },
              },
            ],
          },
          RewardsController: {
            activeAccount: { subscriptionId: null },
          },
        },
      },
      rewardsMoney: {
        referralMe: referralMe
          ? {
              [REWARDS_MONEY_PROFILE_ID]: {
                loading: false,
                error: false,
                data: referralMe,
              },
            }
          : {},
        earningsSummary: {},
      },
    } as unknown as DeepPartial<RootState>);
};
