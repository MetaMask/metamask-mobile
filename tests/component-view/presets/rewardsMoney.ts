import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import type {
  EarnRatesView,
  EarningsSummaryDto,
  ReferralCodeView,
  ReferralLocalizedText,
  ReferralLocalizedTextKey,
  ReferralMeDto,
  SelfEarnedFamilyTotalsDto,
  SummaryTotalsDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';

export const REWARDS_MONEY_PROFILE_ID = 'profile-a';
export const REWARDS_MONEY_KEYRING_ID = 'entropy-source-1';
export const REWARDS_MONEY_SUBSCRIPTION_ID = 'sub-rewards';

export type ReferralMeVariant =
  | 'REFERRER'
  | 'REFEREE'
  | 'NONE'
  | 'CASHBACK_EXPERIMENT';

const LOCALIZED_TEXT_KEYS: readonly ReferralLocalizedTextKey[] = [
  'waysToEarn',
  'earningsTab',
  'performanceTitle',
  'earnEligibleFees',
  'yourReferralCode',
  'share',
  'referrals',
  'tradeCommissions',
  'recordedEarnings',
  'availableToClaim',
  'claim',
  'claimed',
  'claimSuccessToast',
  'last7Days',
  'recordedEarningsLabel',
  'breakdown',
  'tradingRebates',
  'history',
  'historyReferrals',
  'historyCommission',
  'historyRebate',
  'historyClaimed',
  'historyPromo',
  'shareCode',
  'shareVia',
  'copyLink',
  'messages',
  'telegram',
  'last30DaysUpdatedDaily',
  'eligibleFees',
  'funnelCodeUses',
  'funnelCodeUsesDescription',
  'funnelConfirmed',
  'funnelConfirmedDescription',
  'funnelActive',
  'funnelActiveDescription',
  'funnelFeeGenerating',
  'funnelFeeGeneratingDescription',
  'tradingCommissionsSection',
  'copiedOnce',
  'copiedTimes',
  'rebatePerpsVolume',
  'rebateSwapsVolume',
  'rebatePredictions',
  'rebateSwaps',
  'inviteTitle',
  'inviteIllustrationLabel',
  'inviteMessageBody',
  'inviteReferralCode',
  'inviteDecline',
  'inviteAccept',
  'inviteAcceptedEyebrow',
  'inviteAcceptedTitle',
  'inviteAcceptedBody',
  'inviteAcceptedCloseA11y',
  'inviteAcceptedViewRewards',
  'inviteAcceptedStartTrading',
  'invitedBenefitTitle',
  'offerEndsIn',
  'offerDurationDay',
  'offerDurationDays',
  'offerDurationHour',
  'offerDurationHours',
  'invitedReferredBy',
  'invitedOptInDescription',
  'invitedOptInAction',
  'invitedOptInSuccessToast',
  'invitedOptInLegal',
  'termsTitle',
  'termsDescription',
  'termsLearnMore',
  'termsUrl',
];

const LOCALIZED_TEXT_COPY: Partial<ReferralLocalizedText> = {
  waysToEarn: 'Ways to earn',
  earningsTab: 'Earnings',
  earnEligibleFees: 'Earn on eligible fees',
  yourReferralCode: 'Your referral code',
  share: 'Share',
  historyReferrals: 'Referrals',
  recordedEarnings: 'recorded claims',
  shareCode: 'Share code',
  shareVia: 'Share via',
  copyLink: 'Copy link',
  messages: 'Messages',
  telegram: 'Telegram',
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
  inviteAcceptedViewRewards: 'View rewards',
};

/** Every Contentful key is present. Callers overlay the copy a test reads. */
export function referralLocalizedText(
  overrides: Partial<ReferralLocalizedText> = {},
): ReferralLocalizedText {
  const text = LOCALIZED_TEXT_KEYS.reduce((copy, key) => {
    copy[key] = '';
    return copy;
  }, {} as ReferralLocalizedText);

  return { ...text, ...LOCALIZED_TEXT_COPY, ...overrides };
}

const EARN_RATES: EarnRatesView = {
  cashback_rate_bps: 500,
  cashback_earning_start: null,
  cashback_earning_end: null,
  revshare_rate_bps: 2500,
  revshare_earning_start: null,
  revshare_earning_end: null,
};

const NO_EARN_RATES: EarnRatesView = {
  cashback_rate_bps: null,
  cashback_earning_start: null,
  cashback_earning_end: null,
  revshare_rate_bps: null,
  revshare_earning_start: null,
  revshare_earning_end: null,
};

const REFERRER_CODE: ReferralCodeView = {
  code: 'SOPHIE',
  kind: 'PRIMARY',
  status: 'ACTIVE',
  share_url: null,
};

const emptyTotals = (): SummaryTotalsDto => ({
  lifetime: '0',
  pending: '0',
  claimed: '0',
  voided: '0',
});

const selfEarnedFamily = (lifetime: string): SelfEarnedFamilyTotalsDto => ({
  ...emptyTotals(),
  lifetime,
  by_address: [],
});

/**
 * Rev-share lifetime 41750000 formats as $41.75.
 * Cashback lifetime 7650000 formats as $7.65.
 * Pass `claimable` to light the earnings-tab dot.
 */
export function earningsSummaryFixture(
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto {
  return {
    lifetime_total: '0',
    window: null,
    pending: '0',
    claimed: '0',
    voided: '0',
    pairing_pending: false,
    minimum_musd_base_units: '1000000',
    self_earned: {
      ...emptyTotals(),
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: selfEarnedFamily('7650000'),
      },
    },
    earned_by_others: {
      ...emptyTotals(),
      by_claim_family: {
        REFERRAL_REV_SHARE: { ...emptyTotals(), lifetime: '41750000' },
        SOCIAL_FOLLOW_TRADE: { ...emptyTotals(), lifetime: '9150000' },
      },
    },
    ...overrides,
  };
}

export const REWARDS_MONEY_EARNINGS_SUMMARY = earningsSummaryFixture();

// Spread, rather than a direct field, so this stays valid on the dashboard-view
// base. That base's ReferralMeDto does not declare excluded_regions yet.
// Current main and the earnings stack require the field.
const EXCLUDED_REGIONS: { excluded_regions: string[] } = {
  excluded_regions: [],
};

function referralMeBase(variant: ReferralMeVariant): ReferralMeDto {
  const localizedText = referralLocalizedText();

  if (variant === 'REFERRER') {
    return {
      roles: ['REFERRER'],
      ui_variant: 'REFERRER',
      user_type: 'REGULAR',
      status: 'ACTIVE',
      referral_code: { ...REFERRER_CODE },
      referral_code_status: 'ACTIVE',
      referred_by: null,
      earn_rates: { ...EARN_RATES },
      localized_text: localizedText,
      invite_hero: null,
      ...EXCLUDED_REGIONS,
    };
  }

  if (variant === 'REFEREE' || variant === 'CASHBACK_EXPERIMENT') {
    return {
      roles: variant === 'REFEREE' ? ['REFEREE'] : ['CASHBACK_EXPERIMENT'],
      ui_variant: 'REFEREE',
      user_type: 'REGULAR',
      status: 'ACTIVE',
      referral_code: null,
      referral_code_status: null,
      referred_by: variant === 'REFEREE' ? { referral_code: 'SOPHIE' } : null,
      earn_rates: { ...EARN_RATES },
      localized_text: localizedText,
      invite_hero: null,
      ...EXCLUDED_REGIONS,
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
    earn_rates: { ...NO_EARN_RATES },
    localized_text: localizedText,
    invite_hero: null,
    ...EXCLUDED_REGIONS,
  };
}

export type ReferralMeFixtureOverrides = Omit<
  Partial<ReferralMeDto>,
  'referral_code' | 'earn_rates' | 'localized_text'
> & {
  referral_code?: Partial<ReferralCodeView> | null;
  earn_rates?: Partial<EarnRatesView>;
  localized_text?: Partial<ReferralLocalizedText>;
};

/**
 * One referral-me payload.
 *
 * `share_url`, a paused code, and `CASHBACK_EXPERIMENT` are overrides the
 * Performance, Earnings, and claim stacks can pass without rebuilding the DTO.
 * Nested `referral_code` and `earn_rates` merge onto the variant.
 */
export function referralMeFixture(
  variant: ReferralMeVariant,
  overrides: ReferralMeFixtureOverrides = {},
): ReferralMeDto {
  const base = referralMeBase(variant);
  const referralCode =
    overrides.referral_code === undefined
      ? base.referral_code
      : overrides.referral_code === null
        ? null
        : {
            ...(base.referral_code ?? REFERRER_CODE),
            ...overrides.referral_code,
          };

  return {
    ...base,
    ...overrides,
    referral_code: referralCode,
    earn_rates: { ...base.earn_rates, ...overrides.earn_rates },
    localized_text: {
      ...base.localized_text,
      ...overrides.localized_text,
    },
    referred_by:
      overrides.referred_by === undefined
        ? base.referred_by
        : overrides.referred_by,
  };
}

export interface InitialStateRewardsMoneyOptions {
  /** Cached payload. Omitted leaves the cache empty so the tab waits on the fetch. */
  referralMe?: ReferralMeDto;
  /**
   * A finished entry with no payload. The Money dashboard then shows its
   * retry banner instead of a home. Ignored when `referralMe` is set.
   */
  referralMeSettledEmpty?: boolean;
  /** Sets `activeAccount.subscriptionId` to {@link REWARDS_MONEY_SUBSCRIPTION_ID}. */
  subscribed?: boolean;
  /** Wins over `subscribed` when passed, including `null`. */
  subscriptionId?: string | null;
  /** `rewardsMoneyControllerEnabled`. Defaults to on. */
  moneyEnabled?: boolean;
  /** Primary HD keyring plus the SRP session. Defaults to ready. */
  identityReady?: boolean;
}

function resolveSubscriptionId(
  options: InitialStateRewardsMoneyOptions | undefined,
): string | null {
  if (options?.subscriptionId !== undefined) {
    return options.subscriptionId;
  }
  return options?.subscribed ? REWARDS_MONEY_SUBSCRIPTION_ID : null;
}

/**
 * Session identity and the Money flag, composed from the standard minimal
 * builders. A cached entry opens the tab before the fetch and skips the skeleton.
 */
export const initialStateRewardsMoney = (
  options?: InitialStateRewardsMoneyOptions,
) => {
  const moneyEnabled = options?.moneyEnabled ?? true;
  const identityReady = options?.identityReady ?? true;
  const subscriptionId = resolveSubscriptionId(options);
  const referralEntry = options?.referralMe
    ? {
        loading: false,
        error: false,
        data: options.referralMe,
      }
    : options?.referralMeSettledEmpty
      ? { loading: false, error: false, data: null }
      : undefined;

  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({
      rewardsMoneyControllerEnabled: {
        enabled: moneyEnabled,
        minimumVersion: '0.0.0',
      },
    })
    .withOverrides({
      engine: {
        backgroundState: {
          RewardsController: {
            activeAccount: { subscriptionId },
          },
          // RewardsDashboard reads this on the points path. An absent
          // controller throws in selectMoneyAccounts.
          MoneyAccountController: {
            moneyAccounts: {},
          },
          ...(identityReady
            ? {
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
                      type: ExtendedKeyringTypes.hd,
                      accounts: [],
                      metadata: { id: REWARDS_MONEY_KEYRING_ID, name: '' },
                    },
                  ],
                },
              }
            : {}),
        },
      },
      rewardsMoney: {
        referralMe: referralEntry
          ? { [REWARDS_MONEY_PROFILE_ID]: referralEntry }
          : {},
        earningsSummary: {},
      },
    } as DeepPartial<RootState>);

  return builder.withAccountTreeForSelectedAccount();
};
