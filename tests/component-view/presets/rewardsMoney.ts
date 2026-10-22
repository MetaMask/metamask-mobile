import type {
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
  ReferralMeDto,
  SelfEarnedFamilyTotalsDto,
} from '../../../app/core/Engine/controllers/rewards-money-controller/types';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import Engine from '../../../app/core/Engine';
import { initialState as rewardsMoneyInitialState } from '../../../app/reducers/rewardsMoney';
import { createStateFixture } from '../stateFixture';

export const REWARDS_MONEY_PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';

/**
 * Copy the Earnings tab and the claims-paused sheet read. The server fills
 * every key; the rest are unused by these screens.
 */
const LOCALIZED_TEXT = {
  waysToEarn: 'Ways to earn',
  earningsTab: 'Earnings',
  performanceTitle: 'Performance',
  availableToClaim: 'Available to claim',
  balance: 'Balance',
  mUSD: 'mUSD',
  claim: 'Claim',
  paused: 'Paused',
  claimed: 'Claimed',
  held: 'Held',
  blocked: 'Blocked',
  voided: 'Voided',
  pending: 'Pending',
  claimsPausedTitle: 'Claims paused',
  claimsPausedDescription: 'You cannot claim rewards right now.',
  last7Days: 'Last 7 days',
  recordedEarnings: 'Recorded earnings',
  totalEarningsLabel: 'Total earnings',
  breakdown: 'Breakdown',
  history: 'History',
  historyRebate: 'Rebate',
  tradingRebates: 'Trading rebates',
  invitedBenefitTitle: 'Your referral benefit',
  invitedReferredBy: 'Referred by',
} as unknown as ReferralLocalizedText;

const EARN_RATES: ReferralMeDto['earn_rates'] = {
  cashback_rate_bps: 500,
  cashback_earning_start: null,
  cashback_earning_end: null,
  revshare_rate_bps: null,
  revshare_earning_start: null,
  revshare_earning_end: null,
};

const ZERO_BRANCH = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  voided: '0',
  claimable: '0',
  held: '0',
  blocked: '0',
};

function cashbackFamily(claimable: string): SelfEarnedFamilyTotalsDto {
  return {
    ...ZERO_BRANCH,
    lifetime: claimable,
    claimable,
    by_address: [],
  };
}

/** Referee summary. `cashbackClaimable` is the family a claim route reads. */
export function refereeEarningsSummary(
  overrides: Partial<EarningsSummaryDto> & { cashbackClaimable?: string } = {},
): EarningsSummaryDto {
  const { cashbackClaimable = '0', ...rest } = overrides;
  return {
    lifetime_total: '0',
    window: null,
    claimable: '0',
    held: '0',
    blocked: '0',
    voided: '0',
    pending: '0',
    claimed: '0',
    pairing_pending: false,
    minimum_musd_base_units: '1000000',
    self_earned: {
      ...ZERO_BRANCH,
      lifetime: cashbackClaimable,
      claimable: cashbackClaimable,
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: cashbackFamily(cashbackClaimable),
      },
    },
    earned_by_others: {
      ...ZERO_BRANCH,
      by_claim_family: {},
    },
    ...rest,
  };
}

/** Cashback at $5, above the $1 claim minimum. */
export const CLAIMABLE_EARNINGS_SUMMARY = refereeEarningsSummary({
  lifetime_total: '5000000',
  claimable: '5000000',
  cashbackClaimable: '5000000',
});

/**
 * Claimable below the minimum, with held and blocked balances, so the card
 * shows Paused and the sheet copies these root totals.
 */
export const PAUSED_EARNINGS_SUMMARY = refereeEarningsSummary({
  lifetime_total: '112500000',
  claimable: '500000',
  held: '100000000',
  blocked: '12000000',
  cashbackClaimable: '0',
});

/** Nothing payable or paused; a prior claim is the only balance. */
export const CLAIMED_EARNINGS_SUMMARY = refereeEarningsSummary({
  lifetime_total: '2500000',
  claimed: '2500000',
  cashbackClaimable: '0',
});

export const EARNINGS_HISTORY_ROW: LedgerEntryDto = {
  type: 'earning',
  id: 'earn-1',
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

function refereeReferralMe(): ReferralMeDto {
  return {
    roles: ['REFEREE'],
    ui_variant: 'REFEREE',
    user_type: 'REGULAR',
    status: 'ACTIVE',
    referral_code: null,
    referral_code_status: null,
    referred_by: { referral_code: 'FRIEND' },
    earn_rates: EARN_RATES,
    localized_text: LOCALIZED_TEXT,
    invite_hero: null,
  };
}

/**
 * Session profile plus a settled referee summary. The dashboard reads the
 * profile from the primary HD keyring session; the Earnings tab reads the
 * same summary by the profile id it is given.
 */
export function rewardsMoneyViewState(summary: EarningsSummaryDto) {
  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withOverrides({
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData: {
              [KEYRING_ID]: {
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
                metadata: { id: KEYRING_ID, name: '' },
              },
            ],
          },
          // Claim reads the primary Money account. An empty map is enough
          // for the button states; pressing Claim is a separate journey.
          MoneyAccountController: {
            moneyAccounts: {},
          },
        },
      },
      rewardsMoney: {
        ...rewardsMoneyInitialState,
        referralMe: {
          [REWARDS_MONEY_PROFILE_ID]: {
            loading: false,
            error: false,
            data: refereeReferralMe(),
          },
        },
        earningsSummary: {
          [REWARDS_MONEY_PROFILE_ID]: {
            loading: false,
            error: false,
            data: summary,
          },
        },
      },
    })
    .build();
}

/**
 * The earnings hooks refetch on focus. Answer with the preset summary so that
 * refresh does not replace it, and keep the windowed last-7 read off the
 * unwindowed cache key.
 */
export function installRewardsMoneyReads(
  summary: EarningsSummaryDto,
  ledgerResults: LedgerEntryDto[] = [],
): void {
  const mockCall = Engine.controllerMessenger.call as jest.Mock;
  mockCall.mockImplementation((action: string, params?: { from?: string }) => {
    if (action === 'RewardsMoneyController:getEarningsSummary') {
      if (params?.from) {
        return Promise.resolve({
          ...summary,
          window: { from: params.from, to: params.from },
          claimable: undefined,
        });
      }
      return Promise.resolve(summary);
    }
    if (action === 'RewardsMoneyController:getEarningsLedger') {
      return Promise.resolve({
        results: ledgerResults,
        has_more: false,
        cursor: null,
        window: null,
      });
    }
    if (action === 'RewardsMoneyController:getClaimHistory') {
      return Promise.resolve({ results: [], has_more: false, cursor: null });
    }
    return Promise.resolve(undefined);
  });
}
