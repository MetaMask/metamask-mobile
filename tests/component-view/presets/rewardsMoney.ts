import type { MoneyAccount } from '@metamask/money-account-controller';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import type {
  ClaimDto,
  CommissionEntryView,
  EarningsSummaryDto,
  LedgerEarningEntryDto,
  LedgerEntryDto,
  ReferralFunnelDto,
  ReferralLocalizedText,
  ReferralMeDto,
  SummaryTotalsDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';
import { initialState as pointsRewardsInitialState } from '../../../app/reducers/rewards';
import { initialState as rewardsMoneyInitialState } from '../../../app/reducers/rewardsMoney';
import type { MoneyDashboardPersona } from '../../../app/reducers/rewardsMoney/selectors';
import { createStateFixture } from '../stateFixture';

export const REWARDS_MONEY_PROFILE_ID = 'profile-a';
export const REWARDS_MONEY_KEYRING_ID = 'entropy-source-1';
export const REWARDS_MONEY_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111';
export const MONAD_MAINNET_CHAIN_ID = '0x8f';

const MONAD_VAULT = {
  chainId: MONAD_MAINNET_CHAIN_ID,
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999C8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
} as const;

/**
 * Every Contentful key the tip serves. Asserted copy uses the renamed keys
 * (`recordedEarnings`, not the retired total-earnings label).
 */
export const REFERRAL_LOCALIZED_TEXT: ReferralLocalizedText = {
  waysToEarn: 'Ways to earn',
  earningsTab: 'Earnings',
  performanceTitle: 'Performance',
  earnEligibleFees: 'Earn eligible fees',
  yourReferralCode: 'Your referral code',
  share: 'Share',
  referrals: 'Referrals',
  tradeCommissions: 'Trade commissions',
  recordedEarnings: 'Recorded earnings',
  availableToClaim: 'Available to claim',
  claim: 'Claim',
  claimed: 'Claimed',
  held: 'Held',
  blocked: 'Blocked',
  voided: 'Voided',
  pending: 'Pending',
  claimSuccessToast: 'Claim sent',
  claimPartialSuccessToast: 'Part of your claim was sent',
  claimFailureToast: 'Claim failed',
  claimFailureRetryToast: 'Try the claim again',
  claimFailureWaitToast: 'Claim again later',
  claimFailureWaitMinutesToast: 'Claim again in a few minutes',
  claimFailureMinimumToast: 'Claim at least $1',
  claimFailureAddressBlockedToast: 'This address cannot claim',
  claimFailureTooLargeToast: 'Claim is too large',
  claimFailureNoEligibleBalanceToast: 'Nothing eligible to claim',
  claimFailureUnavailableToast: 'Claims are unavailable',
  claimFailureContactSupportToast: 'Contact support',
  historyClaimPending: 'Claim pending',
  last7Days: 'Last 7 days',
  totalEarningsLabel: 'Total earnings',
  breakdown: 'Breakdown',
  breakdownTrading: 'Trading',
  breakdownTradingDescription: 'Trading description',
  breakdownReferralsDescription: 'Referrals description',
  breakdownSocialDescription: 'Social description',
  tradingRebates: 'Trading rebates',
  history: 'History',
  historyReferrals: 'Referral earning',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
  historyPromo: 'Promo',
  shareCode: 'Share code',
  shareVia: 'Share via',
  copyLink: 'Copy link',
  messages: 'Messages',
  telegram: 'Telegram',
  updatedDaily: 'Updated daily',
  eligibleFees: 'Eligible fees',
  funnelCodeUses: 'Code uses',
  funnelCodeUsesDescription: 'Code uses description',
  funnelConfirmed: 'Confirmed referrals',
  funnelConfirmedDescription: 'People who confirmed your code',
  funnelActive: 'Active referrals',
  funnelActiveDescription: 'Active referrals description',
  funnelFeeGenerating: 'Fee-generating referrals',
  funnelFeeGeneratingDescription: 'Referrals that generated fees',
  tradingCommissionsSection: 'Trading commissions',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
  rebatePerpsVolume: 'Perps volume',
  rebateSwapsVolume: 'Swaps volume',
  rebatePredictions: 'Predictions',
  rebateSwaps: 'Swaps',
  inviteTitle: 'Invite',
  inviteIllustrationLabel: 'Invite illustration',
  inviteMessageBody: 'Invite body',
  inviteReferralCode: 'Referral code',
  inviteDecline: 'Decline',
  inviteAccept: 'Accept',
  inviteAcceptedEyebrow: 'You are in',
  inviteAcceptedTitle: 'Invite accepted',
  inviteAcceptedBody: 'Invite accepted body',
  inviteAcceptedCloseA11y: 'Close',
  inviteAcceptedViewRewards: 'View rewards',
  inviteAcceptedStartTrading: 'Start trading',
  invitedBenefitTitle: 'Invited benefit',
  offerEndsIn: 'Offer ends in',
  offerDurationDay: 'day',
  offerDurationDays: 'days',
  offerDurationHour: 'hour',
  offerDurationHours: 'hours',
  invitedReferredBy: 'Referred by',
  invitedOptInDescription: 'Opt in description',
  invitedOptInAction: 'Opt in',
  invitedOptInSuccessToast: 'Opted in',
  invitedOptInLegal: 'Legal',
  termsTitle: 'Terms',
  termsDescription: 'Terms description',
  termsLearnMore: 'Learn more',
  termsUrl: 'https://example.com/terms',
  balance: 'Balance',
  mUSD: 'mUSD',
  paused: 'Paused',
  claimsPausedTitle: 'Claims paused',
  claimsPausedDescription: 'You cannot claim rewards right now.',
  rewardsPausedTitle: 'Rewards paused',
  rewardsPausedDescription: 'These rewards are paused while they are reviewed.',
  rewardsPausedBanner: '{amount} of rewards paused.',
  rewardsPausedLearnMore: 'Learn more',
  settingsReferralTitle: 'Referral Code',
  settingsReferralLinkedDescription:
    'You are all set. Start trading to earn rewards.',
  settingsReferralNotLinkedDescription:
    'Have a referral code? Enter it below and you will be linked.',
  settingsReferralPlaceholder: 'Enter referral code',
  settingsReferralApply: 'Apply',
};

/**
 * Funnel labels the referrer tab must not render. Not Contentful keys, so
 * they stay out of {@link REFERRAL_LOCALIZED_TEXT}.
 */
export const RETIRED_FUNNEL_COPY = {
  last30DaysUpdatedDaily: 'Last 30 days · Updated daily',
} as const;

function totals(
  lifetime: string,
  overrides: Partial<SummaryTotalsDto> = {},
): SummaryTotalsDto {
  return {
    lifetime,
    claimable: '0',
    held: '0',
    blocked: '0',
    voided: '0',
    pending: '0',
    claimed: '0',
    ...overrides,
  };
}

export interface EarningsSummaryFixtureOptions {
  lifetimeTotal?: string;
  claimable?: string;
  held?: string;
  blocked?: string;
  claimed?: string;
  pending?: string;
  cashbackClaimable?: string;
  cashbackBlocked?: string;
  cashbackBlockingReason?: SummaryTotalsDto['blocking_reason'];
  revShareLifetime?: string;
}

/** Unwindowed summary. Cashback claimable is what `canClaimEarnings` reads. */
export function earningsSummaryFixture(
  options: EarningsSummaryFixtureOptions = {},
): EarningsSummaryDto {
  const claimable = options.claimable ?? '0';
  const cashbackClaimable = options.cashbackClaimable ?? claimable;
  const revShareLifetime = options.revShareLifetime ?? '0';

  return {
    lifetime_total: options.lifetimeTotal ?? '58500000',
    window: null,
    claimable,
    held: options.held ?? '0',
    blocked: options.blocked ?? '0',
    voided: '0',
    pending: options.pending ?? '0',
    claimed: options.claimed ?? '0',
    minimum_musd_base_units: '1000000',
    pairing_pending: false,
    self_earned: {
      ...totals('7650000'),
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: {
          ...totals('7650000', {
            claimable: cashbackClaimable,
            ...(options.cashbackBlocked === undefined
              ? {}
              : { blocked: options.cashbackBlocked }),
            ...(options.cashbackBlockingReason === undefined
              ? {}
              : { blocking_reason: options.cashbackBlockingReason }),
          }),
          by_address: [],
        },
      },
    },
    earned_by_others: {
      ...totals(revShareLifetime),
      by_claim_family: {
        REFERRAL_REV_SHARE: totals(revShareLifetime),
      },
    },
  };
}

/** $5 of cashback. Above the $1 minimum, so a referee can claim it. */
export const CLAIMABLE_EARNINGS_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '5000000',
  claimable: '5000000',
  cashbackClaimable: '5000000',
});

/** Exactly $1 of cashback, the claim minimum. */
export const EXACT_DOLLAR_EARNINGS_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '1000000',
  claimable: '1000000',
  cashbackClaimable: '1000000',
});

/** Under $1, with held and blocked money, so the card shows Paused. */
export const PAUSED_EARNINGS_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '112500000',
  claimable: '500000',
  held: '100000000',
  blocked: '12000000',
  cashbackClaimable: '0',
});

/** Nothing left to claim. The card shows a disabled Claimed button. */
export const CLAIMED_EARNINGS_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '2500000',
  claimable: '0',
  claimed: '2500000',
  cashbackClaimable: '0',
});

/** Referrer funnel reads rev-share lifetime as eligible fees ($41.75). */
export const REFERRER_FUNNEL_SUMMARY = earningsSummaryFixture({
  revShareLifetime: '41750000',
  lifetimeTotal: '41750000',
});

/**
 * Blocked cashback whose family reason is UNDER_REVIEW. The history screen
 * turns this into the paused banner.
 */
export const UNDER_REVIEW_EARNINGS_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '12000000',
  claimable: '0',
  blocked: '12000000',
  cashbackClaimable: '0',
  cashbackBlocked: '12000000',
  cashbackBlockingReason: 'UNDER_REVIEW',
});

/** Summary a refusal refresh returns, with the hold that opens the sheet. */
export const REFUSAL_REFRESH_SUMMARY = earningsSummaryFixture({
  lifetimeTotal: '58500000',
  claimable: '0',
  held: '12000000',
  cashbackClaimable: '0',
});

/**
 * Windowed last-7 read. `claimable` is omitted so it cannot overwrite the
 * unwindowed balance cached for the claim card.
 */
export function windowedEarningsSummary(
  summary: EarningsSummaryDto,
  from: string,
  to: string | undefined,
): EarningsSummaryDto {
  return {
    ...summary,
    window: { from, to: to ?? null },
    claimable: undefined,
  };
}

export const REFERRAL_FUNNEL_FIXTURE: ReferralFunnelDto = {
  enrolled: 12,
  earning_generating: 5,
};

export function earningRow(index: number): LedgerEarningEntryDto {
  return {
    type: 'earning',
    id: `earn-${index}`,
    earning_origin_type: 'SWAPS_FEE_CASHBACK',
    musd_amount: '1000000',
    voided_musd_amount: '0',
    fee_amount_usd: '1',
    entry_count: 1,
    transaction_hash: null,
    chain_id: null,
    ledger_timestamp: '2026-09-01T00:00:00.000Z',
    claim_status: 'unclaimed',
    claimable_at: '2026-09-02T00:00:00.000Z',
    swaps_source: null,
    perps_source: null,
    predict_source: null,
  };
}

export const EARNINGS_HISTORY_ROW: LedgerEntryDto = earningRow(0);

export const CASHBACK_LEDGER_FIXTURE: LedgerEarningEntryDto[] = Array.from(
  { length: 8 },
  (_, index) => earningRow(index),
);

export const COMMISSIONS_FIXTURE: CommissionEntryView[] = [
  {
    id: 'commission-1',
    earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
    day: '2026-09-01',
    token: { key: 'SWAPS:eip155:1/slip44:60', symbol: 'ETH', source: 'SWAPS' },
    musd_amount: '1000000',
    fee_amount_usd: '1.00',
    fill_count: 1,
    copied_times: 2,
  },
];

export const PENDING_CLAIM_FIXTURE: ClaimDto = {
  id: 'claim-pending-1',
  beneficiary_profile_id: REWARDS_MONEY_PROFILE_ID,
  money_account_address: REWARDS_MONEY_ACCOUNT_ADDRESS,
  earning_origin_types: ['SWAPS_FEE_CASHBACK'],
  gross_amount: '2500000',
  withheld_amount: '0',
  net_amount: '2500000',
  withholding_rate_bps: 0,
  nonce: null,
  signature: null,
  valid_before: null,
  settled_block: null,
  settled_tx_hash: null,
  settled_at: null,
  released_at: null,
  status: 'PENDING_SIGNATURE',
  route: 'referral-trade-fee-cashback',
  payout_method: 'VOUCHER',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

const EMPTY_EARN_RATES: ReferralMeDto['earn_rates'] = {
  cashback_rate_bps: null,
  cashback_earning_start: null,
  cashback_earning_end: null,
  revshare_rate_bps: null,
  revshare_earning_start: null,
  revshare_earning_end: null,
};

export function referralMeFixture(
  persona: MoneyDashboardPersona,
): ReferralMeDto {
  const referrer = persona === 'referrer';
  const referee = persona === 'referee';

  return {
    roles: referrer ? ['REFERRER'] : referee ? ['REFEREE'] : [],
    ui_variant: referrer ? 'REFERRER' : referee ? 'REFEREE' : 'NONE',
    user_type: 'REGULAR',
    status: 'ACTIVE',
    referral_code: referrer
      ? {
          code: 'SOPHIE',
          kind: 'standard',
          status: 'ACTIVE',
          share_url: 'https://link.metamask.io/invite?code=SOPHIE',
        }
      : null,
    referral_code_status: referrer ? 'ACTIVE' : null,
    referred_by: referee ? { referral_code: 'SOPHIE' } : null,
    earn_rates: EMPTY_EARN_RATES,
    localized_text: REFERRAL_LOCALIZED_TEXT,
    invite_hero: null,
    excluded_regions: [],
  };
}

function moneyAccount(): MoneyAccount {
  return {
    id: 'money-1',
    address: REWARDS_MONEY_ACCOUNT_ADDRESS,
    type: 'eip155:eoa',
    scopes: [],
    methods: [],
    options: {
      entropy: {
        type: 'mnemonic',
        id: REWARDS_MONEY_KEYRING_ID,
        derivationPath: "m/44'/60'/0'/0/0",
        groupIndex: 0,
      },
      exportable: false,
    },
  };
}

/**
 * The three gates a claim checks before it asks for a voucher. An omitted
 * gate follows `claimReady`.
 */
export interface ClaimSubmissionGates {
  /** `moneyAccountVaultConfig` for Monad mainnet. */
  monadVault?: boolean;
  /** Gas sponsorship for the vault chain. */
  gasSponsorship?: boolean;
  /** Primary Money account the voucher pays into. */
  moneyAccount?: boolean;
}

export interface RewardsMoneyViewStateOptions {
  persona?: MoneyDashboardPersona;
  summary?: EarningsSummaryDto | null;
  /**
   * Cached `GET /referral/me`. Omitted uses the persona fixture. The Settings
   * gear and referral field read this cache, the `REFERRER` role, and geo.
   */
  referralMe?: ReferralMeDto;
  /** Points subscription. Null leaves Rewards Settings on the referral field. */
  subscriptionId?: string | null;
  /** Device country. Null fails open for a Money referral. */
  geoLocation?: string | null;
  /** Remote `rewardsMoneyControllerEnabled`. The referral section needs it. */
  moneyControllerEnabled?: boolean;
  /**
   * Monad Money account plus the vault and gas-sponsorship flags a claim
   * batch checks before it asks for a voucher.
   */
  claimReady?: boolean;
  /**
   * Turns one claim gate off while the others stay ready. Unset fields
   * follow `claimReady`.
   */
  claimGates?: ClaimSubmissionGates;
  /**
   * `empty` is a finished read with no payload, which is the dashboard retry
   * banner. `omit` leaves no entry, so the Rewards tab waits on the fetch.
   */
  referralCache?: 'empty' | 'omit';
}

/**
 * Redux for a Money screen. Spreads `rewardsMoneyInitialState` so later
 * slices (history, in-flight claims, claim locks) are present.
 */
export function rewardsMoneyViewState({
  persona = 'referee',
  summary = CLAIMABLE_EARNINGS_SUMMARY,
  claimReady = false,
  claimGates,
  referralMe: referralMeOverride,
  referralCache,
  subscriptionId = null,
  geoLocation = null,
  moneyControllerEnabled = false,
}: RewardsMoneyViewStateOptions = {}) {
  const profileId = REWARDS_MONEY_PROFILE_ID;
  const referralMe = referralMeOverride ?? referralMeFixture(persona);
  const referralMeState =
    referralCache === 'omit'
      ? {}
      : {
          [profileId]: {
            loading: false,
            error: false,
            data: referralCache === 'empty' ? null : referralMe,
          },
        };
  const account = moneyAccount();
  const monadVault = claimGates?.monadVault ?? claimReady;
  const gasSponsorship = claimGates?.gasSponsorship ?? claimReady;
  const includeMoneyAccount = claimGates?.moneyAccount ?? claimReady;
  const remoteFeatureFlags: Record<string, unknown> = {};
  if (monadVault) {
    remoteFeatureFlags.moneyAccountVaultConfig = MONAD_VAULT;
  }
  if (gasSponsorship) {
    remoteFeatureFlags.gasFeesSponsoredNetwork = {
      [MONAD_MAINNET_CHAIN_ID]: true,
    };
  }
  if (moneyControllerEnabled) {
    remoteFeatureFlags.rewardsMoneyControllerEnabled = {
      enabled: true,
      minimumVersion: '1.0.0',
    };
  }

  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags(remoteFeatureFlags)
    .withOverrides({
      rewards: {
        ...pointsRewardsInitialState,
        candidateSubscriptionId: subscriptionId,
        geoLocation,
      },
      rewardsMoney: {
        ...rewardsMoneyInitialState,
        referralMe: referralMeState,
        earningsSummary: {
          [profileId]: {
            loading: false,
            error: false,
            data: summary,
          },
        },
      },
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings: [
              {
                type: ExtendedKeyringTypes.hd,
                accounts: ['0x0000000000000000000000000000000000000001'],
                metadata: { id: REWARDS_MONEY_KEYRING_ID },
              },
            ],
          },
          AuthenticationController: {
            srpSessionData: {
              [REWARDS_MONEY_KEYRING_ID]: {
                profile: { profileId },
              },
            },
          },
          MoneyAccountController: {
            moneyAccounts: includeMoneyAccount ? { [account.id]: account } : {},
          },
          ...(subscriptionId
            ? {
                RewardsController: {
                  activeAccount: {
                    account: `eip155:1:${REWARDS_MONEY_ACCOUNT_ADDRESS}`,
                    subscriptionId,
                    perpsFeeDiscount: null,
                    lastPerpsDiscountRateFetched: null,
                  },
                },
              }
            : {}),
        },
      },
    })
    .build();
}
