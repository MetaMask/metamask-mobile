import type { RootState } from '..';
import type {
  ClaimDto,
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import initialRootState from '../../util/test/initial-root-state';
import type { EarningsSummaryEntry, ReferralMeEntry } from '.';
import {
  canAcceptMoneyReferralInvite,
  moneyDashboardPersona,
  selectCashbackLedger,
  selectClaimLock,
  selectClaimWaitingUntil,
  selectCommissions,
  selectEarningsHistory,
  selectEarningsSummaryEntry,
  selectInFlightClaims,
  selectMoneyDashboardPersona,
  selectMoneyReferralAllowedForGeo,
  selectReferralFunnelEntry,
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
} from './selectors';

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

const mockLocalizedText = {
  waysToEarn: 'Ways to earn',
} as ReferralMeDto['localized_text'];

const mockReferralMe: ReferralMeDto = {
  roles: ['REFERRER'],
  ui_variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: {
    code: 'KOL1',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referral_code_status: 'ACTIVE',
  referred_by: null,
  earn_rates: {
    cashback_rate_bps: null,
    cashback_earning_start: null,
    cashback_earning_end: null,
    revshare_rate_bps: 1000,
    revshare_earning_start: null,
    revshare_earning_end: null,
  },
  localized_text: mockLocalizedText,
  invite_hero: null,
  excluded_regions: [],
};

const settledEntry: ReferralMeEntry = {
  loading: false,
  error: false,
  data: mockReferralMe,
};

const loadingEntry: ReferralMeEntry = {
  loading: true,
  error: false,
  data: null,
};

const mockEarningsSummary = {
  lifetime_total: '41750000',
  window: null,
  pending: '0',
  claimed: '0',
  voided: '0',
  pairing_pending: false,
  minimum_musd_base_units: '1000000',
  self_earned: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    voided: '0',
    by_claim_family: {},
  },
  earned_by_others: {
    lifetime: '41750000',
    pending: '0',
    claimed: '0',
    voided: '0',
    by_claim_family: {},
  },
} as EarningsSummaryDto;

const settledSummaryEntry: EarningsSummaryEntry = {
  loading: false,
  error: false,
  data: mockEarningsSummary,
};

const buildState = (
  referralMe: Record<string, ReferralMeEntry> = {},
  earningsSummary: Record<string, EarningsSummaryEntry> = {},
): RootState =>
  ({
    ...initialRootState,
    rewardsMoney: {
      ...initialRootState.rewardsMoney,
      referralMe,
      earningsSummary,
    },
  }) as RootState;

describe('rewardsMoney selectors', () => {
  describe('selectReferralMeEntry', () => {
    it('returns undefined when there is no profile id', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectReferralMeEntry(state, undefined)).toBeUndefined();
    });

    it('returns undefined when the profile has no entry yet', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectReferralMeEntry(state, PROFILE_B)).toBeUndefined();
    });

    it('returns the entry for the given profile', () => {
      const state = buildState({
        [PROFILE_A]: settledEntry,
        [PROFILE_B]: loadingEntry,
      });

      expect(selectReferralMeEntry(state, PROFILE_A)).toEqual(settledEntry);
      expect(selectReferralMeEntry(state, PROFILE_B)).toEqual(loadingEntry);
    });
  });

  describe('moneyDashboardPersona', () => {
    it('treats a referrer as the referrer screen even when they are also a referee', () => {
      expect(
        moneyDashboardPersona({
          roles: ['REFERRER', 'REFEREE'],
          ui_variant: 'REFERRER',
        }),
      ).toBe('referrer');
    });

    it.each(['REFEREE', 'CASHBACK_EXPERIMENT', 'COPY_TRADING'] as const)(
      'treats %s on the referee screen as a referee',
      (role) => {
        expect(
          moneyDashboardPersona({
            roles: [role],
            ui_variant: 'REFEREE',
          }),
        ).toBe('referee');
      },
    );

    it('keeps an empty role list on the points dashboard even when the screen is forced to referee', () => {
      expect(moneyDashboardPersona({ roles: [], ui_variant: 'REFEREE' })).toBe(
        'plain',
      );
      expect(moneyDashboardPersona({ roles: [], ui_variant: 'NONE' })).toBe(
        'plain',
      );
    });
  });

  describe('canAcceptMoneyReferralInvite', () => {
    it('stays open for a plain user and a cashback-experiment member', () => {
      expect(canAcceptMoneyReferralInvite({ roles: [] })).toBe(true);
      expect(
        canAcceptMoneyReferralInvite({ roles: ['CASHBACK_EXPERIMENT'] }),
      ).toBe(true);
    });

    it('closes for a referrer or an existing referee', () => {
      expect(canAcceptMoneyReferralInvite({ roles: ['REFERRER'] })).toBe(false);
      expect(canAcceptMoneyReferralInvite({ roles: ['REFEREE'] })).toBe(false);
    });
  });

  describe('selectMoneyDashboardPersona', () => {
    it('returns the persona of the entry data', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectMoneyDashboardPersona(state, PROFILE_A)).toBe('referrer');
    });

    it('returns undefined when the entry has no data', () => {
      const state = buildState({ [PROFILE_A]: loadingEntry });

      expect(selectMoneyDashboardPersona(state, PROFILE_A)).toBeUndefined();
    });

    it('returns undefined when there is no profile id', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectMoneyDashboardPersona(state, undefined)).toBeUndefined();
    });
  });

  describe('selectReferralMeLocalizedText', () => {
    it('returns the localized text of the entry data', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectReferralMeLocalizedText(state, PROFILE_A)).toEqual(
        mockLocalizedText,
      );
    });

    it('returns undefined when the entry has no data', () => {
      const state = buildState({ [PROFILE_A]: loadingEntry });

      expect(selectReferralMeLocalizedText(state, PROFILE_A)).toBeUndefined();
    });
  });

  describe('selectMoneyReferralAllowedForGeo', () => {
    it('refuses when the device country is on excluded_regions', () => {
      const state = {
        ...buildState({
          [PROFILE_A]: {
            loading: false,
            error: false,
            data: { ...mockReferralMe, excluded_regions: ['GB'] },
          },
        }),
        rewards: {
          ...initialRootState.rewards,
          geoLocation: 'GB',
        },
      } as RootState;

      expect(selectMoneyReferralAllowedForGeo(state, PROFILE_A)).toBe(false);
    });

    it('allows when geo is unknown', () => {
      const state = {
        ...buildState({
          [PROFILE_A]: {
            loading: false,
            error: false,
            data: { ...mockReferralMe, excluded_regions: ['GB'] },
          },
        }),
        rewards: {
          ...initialRootState.rewards,
          geoLocation: null,
        },
      } as RootState;

      expect(selectMoneyReferralAllowedForGeo(state, PROFILE_A)).toBe(true);
    });
  });

  describe('selectEarningsSummaryEntry', () => {
    it('returns the entry for the given profile', () => {
      const state = buildState({}, { [PROFILE_A]: settledSummaryEntry });

      expect(selectEarningsSummaryEntry(state, PROFILE_A)).toEqual(
        settledSummaryEntry,
      );
    });

    it('returns undefined for another profile, so a late write cannot be read as this one', () => {
      const state = buildState({}, { [PROFILE_A]: settledSummaryEntry });

      expect(selectEarningsSummaryEntry(state, PROFILE_B)).toBeUndefined();
    });

    it('returns undefined when there is no profile id', () => {
      const state = buildState({}, { [PROFILE_A]: settledSummaryEntry });

      expect(selectEarningsSummaryEntry(state, undefined)).toBeUndefined();
    });
  });

  describe('selectInFlightClaims', () => {
    it('returns the open claims stored for the profile', () => {
      const claims = [{ id: 'claim-open' }] as ClaimDto[];
      const state = {
        ...initialRootState,
        rewardsMoney: {
          ...initialRootState.rewardsMoney,
          inFlightClaims: { [PROFILE_A]: claims },
        },
      } as RootState;

      expect(selectInFlightClaims(state, PROFILE_A)).toEqual(claims);
    });

    it('returns undefined when a restored slice is missing the map', () => {
      const state = {
        ...initialRootState,
        rewardsMoney: {},
      } as RootState;

      expect(selectReferralMeEntry(state, PROFILE_A)).toBeUndefined();
      expect(selectEarningsSummaryEntry(state, PROFILE_A)).toBeUndefined();
      expect(selectReferralFunnelEntry(state, PROFILE_A)).toBeUndefined();
      expect(selectCommissions(state, PROFILE_A)).toBeUndefined();
      expect(selectCashbackLedger(state, PROFILE_A)).toBeUndefined();
      expect(selectEarningsHistory(state, PROFILE_A)).toBeUndefined();
      expect(selectInFlightClaims(state, PROFILE_A)).toBeUndefined();
      expect(selectClaimWaitingUntil(state, PROFILE_A)).toBeUndefined();
    });

    it('returns undefined when the profile or the page is missing', () => {
      const state = buildState();

      expect(selectInFlightClaims(state, undefined)).toBeUndefined();
      expect(selectInFlightClaims(state, PROFILE_A)).toBeUndefined();
      expect(selectInFlightClaims(state, PROFILE_B)).toBeUndefined();
    });
  });

  describe('selectClaimWaitingUntil', () => {
    it('returns the stored wait for the profile', () => {
      const state = {
        ...initialRootState,
        rewardsMoney: {
          ...initialRootState.rewardsMoney,
          claimWaitingUntil: { [PROFILE_A]: 1_800_000_000_000 },
        },
      };

      expect(selectClaimWaitingUntil(state, PROFILE_A)).toBe(1_800_000_000_000);
      expect(selectClaimWaitingUntil(state, PROFILE_B)).toBeUndefined();
      expect(selectClaimWaitingUntil(state, undefined)).toBeUndefined();
    });
  });

  describe('selectClaimLock', () => {
    it('returns the session lock for the profile', () => {
      const lock = {
        status: 'in_progress' as const,
        summaryKey: '1000000',
      };
      const state = {
        ...initialRootState,
        rewardsMoney: {
          ...initialRootState.rewardsMoney,
          claimLocks: { [PROFILE_A]: lock },
        },
      };

      expect(selectClaimLock(state, PROFILE_A)).toEqual(lock);
      expect(selectClaimLock(state, PROFILE_B)).toBeUndefined();
      expect(selectClaimLock(state, undefined)).toBeUndefined();
    });
  });
});
