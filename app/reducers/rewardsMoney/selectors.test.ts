import type { RootState } from '..';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import initialRootState from '../../util/test/initial-root-state';
import type { EarningsSummaryEntry, ReferralMeEntry } from '.';
import {
  selectEarningsSummaryEntry,
  selectMoneyReferralAllowedForGeo,
  selectReferralMeEntry,
  selectReferralMeLocalizedText,
  selectReferralMeVariant,
} from './selectors';

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

const mockLocalizedText = {
  waysToEarn: 'Ways to earn',
} as ReferralMeDto['localized_text'];

const mockReferralMe: ReferralMeDto = {
  role: 'REFERRER',
  variant: 'REFERRER',
  user_type: 'KOL',
  status: 'ACTIVE',
  referral_code: {
    code: 'KOL1',
    kind: 'PRIMARY',
    status: 'ACTIVE',
    share_url: null,
  },
  referred_by: null,
  earn_rates: {
    revshare_rate_bps: 1000,
    cashback_rate_bps: null,
    revshare_earning_term_minutes: 525600,
    cashback_earning_term_minutes: null,
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
  forfeited: '0',
  minimum_musd_base_units: '1000000',
  self_earned: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    forfeited: '0',
    by_claim_family: {},
  },
  earned_by_others: {
    lifetime: '41750000',
    pending: '0',
    claimed: '0',
    forfeited: '0',
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
    rewardsMoney: { referralMe, earningsSummary },
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

  describe('selectReferralMeVariant', () => {
    it('returns the variant of the entry data', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectReferralMeVariant(state, PROFILE_A)).toBe('REFERRER');
    });

    it('returns undefined when the entry has no data', () => {
      const state = buildState({ [PROFILE_A]: loadingEntry });

      expect(selectReferralMeVariant(state, PROFILE_A)).toBeUndefined();
    });

    it('returns undefined when there is no profile id', () => {
      const state = buildState({ [PROFILE_A]: settledEntry });

      expect(selectReferralMeVariant(state, undefined)).toBeUndefined();
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
});
