import { Action } from '@reduxjs/toolkit';
import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import initialRootState from '../../util/test/initial-root-state';
import rewardsMoneyReducer, {
  resetRewardsMoneyState,
  setEarningsSummary,
  setEarningsSummaryError,
  setEarningsSummaryLoading,
  setReferralMe,
  setReferralMeError,
  setReferralMeLoading,
  type RewardsMoneyState,
} from '.';

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

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
  localized_text: {} as ReferralMeDto['localized_text'],
  invite_hero: null,
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

const initialState: RewardsMoneyState = rewardsMoneyReducer(undefined, {
  type: 'unknown',
} as Action);

describe('rewardsMoneyReducer', () => {
  it('returns empty profile maps as initial state', () => {
    const state = rewardsMoneyReducer(undefined, {
      type: 'unknown',
    } as Action);

    expect(state).toEqual({ referralMe: {}, earningsSummary: {} });
  });

  it('seeds initialRootState with empty rewardsMoney slice', () => {
    expect(initialRootState.rewardsMoney).toEqual({
      referralMe: {},
      earningsSummary: {},
    });
  });

  describe('setReferralMeLoading', () => {
    it('sets loading for one profile and creates a default entry', () => {
      const state = rewardsMoneyReducer(
        initialState,
        setReferralMeLoading({ profileId: PROFILE_A, loading: true }),
      );

      expect(state.referralMe[PROFILE_A]).toEqual({
        loading: true,
        error: false,
        data: null,
      });
    });
  });

  describe('setReferralMeError', () => {
    it('sets error for one profile and creates a default entry', () => {
      const state = rewardsMoneyReducer(
        initialState,
        setReferralMeError({ profileId: PROFILE_A, error: true }),
      );

      expect(state.referralMe[PROFILE_A]).toEqual({
        loading: false,
        error: true,
        data: null,
      });
    });
  });

  describe('setReferralMe', () => {
    it('sets data and clears loading and error for that profile', () => {
      const loadingState = rewardsMoneyReducer(
        initialState,
        setReferralMeLoading({ profileId: PROFILE_A, loading: true }),
      );
      const errorState = rewardsMoneyReducer(
        loadingState,
        setReferralMeError({ profileId: PROFILE_A, error: true }),
      );

      const state = rewardsMoneyReducer(
        errorState,
        setReferralMe({ profileId: PROFILE_A, data: mockReferralMe }),
      );

      expect(state.referralMe[PROFILE_A]).toEqual({
        loading: false,
        error: false,
        data: mockReferralMe,
      });
    });
  });

  describe('earnings summary', () => {
    it('sets loading for one profile and creates a default entry', () => {
      const state = rewardsMoneyReducer(
        initialState,
        setEarningsSummaryLoading({ profileId: PROFILE_A, loading: true }),
      );

      expect(state.earningsSummary[PROFILE_A]).toEqual({
        loading: true,
        error: false,
        data: null,
      });
    });

    it('sets data and clears error for that profile', () => {
      const errorState = rewardsMoneyReducer(
        initialState,
        setEarningsSummaryError({ profileId: PROFILE_A, error: true }),
      );

      const state = rewardsMoneyReducer(
        errorState,
        setEarningsSummary({
          profileId: PROFILE_A,
          data: mockEarningsSummary,
        }),
      );

      expect(state.earningsSummary[PROFILE_A]).toEqual({
        loading: false,
        error: false,
        data: mockEarningsSummary,
      });
    });

    it('keeps the summary of another profile untouched', () => {
      const withProfileB = rewardsMoneyReducer(
        initialState,
        setEarningsSummary({
          profileId: PROFILE_B,
          data: mockEarningsSummary,
        }),
      );

      const state = rewardsMoneyReducer(
        withProfileB,
        setEarningsSummaryError({ profileId: PROFILE_A, error: true }),
      );

      expect(state.earningsSummary[PROFILE_B]?.data).toEqual(
        mockEarningsSummary,
      );
      expect(state.earningsSummary[PROFILE_A]?.error).toBe(true);
    });

    it('does not share an entry with referral me for the same profile', () => {
      const state = rewardsMoneyReducer(
        initialState,
        setEarningsSummaryLoading({ profileId: PROFILE_A, loading: true }),
      );

      expect(state.referralMe[PROFILE_A]).toBeUndefined();
    });
  });

  describe('profile isolation', () => {
    it('does not clobber another profile when writing loading, error, or data', () => {
      const withProfileB = rewardsMoneyReducer(
        initialState,
        setReferralMe({ profileId: PROFILE_B, data: mockReferralMe }),
      );

      const afterLoading = rewardsMoneyReducer(
        withProfileB,
        setReferralMeLoading({ profileId: PROFILE_A, loading: true }),
      );
      const afterError = rewardsMoneyReducer(
        afterLoading,
        setReferralMeError({ profileId: PROFILE_A, error: true }),
      );
      const afterData = rewardsMoneyReducer(
        afterError,
        setReferralMe({
          profileId: PROFILE_A,
          data: { ...mockReferralMe, variant: 'NONE', role: 'NONE' },
        }),
      );

      expect(afterData.referralMe[PROFILE_B]).toEqual({
        loading: false,
        error: false,
        data: mockReferralMe,
      });
      expect(afterData.referralMe[PROFILE_A]?.data?.variant).toBe('NONE');
    });
  });

  describe('resetRewardsMoneyState', () => {
    it('clears every profile-keyed cache so a new API host cannot read the old one', () => {
      const withData = rewardsMoneyReducer(
        initialState,
        setReferralMe({ profileId: PROFILE_A, data: mockReferralMe }),
      );
      const withSummary = rewardsMoneyReducer(
        withData,
        setEarningsSummary({
          profileId: PROFILE_A,
          data: mockEarningsSummary,
        }),
      );

      const state = rewardsMoneyReducer(withSummary, resetRewardsMoneyState());

      expect(state).toEqual({ referralMe: {}, earningsSummary: {} });
    });
  });
});
