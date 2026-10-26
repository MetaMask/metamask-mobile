import { Action } from '@reduxjs/toolkit';
import type {
  ClaimDto,
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../core/Engine/controllers/rewards-money-controller/types';
import initialRootState from '../../util/test/initial-root-state';
import rewardsMoneyReducer, {
  resetRewardsMoneyState,
  setCashbackLedger,
  setCommissions,
  setEarningsHistory,
  setClaimLock,
  setClaimWaitingUntil,
  setInFlightClaims,
  setEarningsSummary,
  setEarningsSummaryError,
  setEarningsSummaryLoading,
  setReferralFunnel,
  setReferralMe,
  setReferralMeError,
  setReferralMeLoading,
  type RewardsMoneyState,
} from '.';

const PROFILE_A = 'profile-a';
const PROFILE_B = 'profile-b';

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
  localized_text: {} as ReferralMeDto['localized_text'],
  invite_hero: null,
  excluded_regions: [],
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

const initialState: RewardsMoneyState = rewardsMoneyReducer(undefined, {
  type: 'unknown',
} as Action);

describe('rewardsMoneyReducer', () => {
  it('returns empty profile maps as initial state', () => {
    const state = rewardsMoneyReducer(undefined, {
      type: 'unknown',
    } as Action);

    expect(state).toEqual({
      referralMe: {},
      earningsSummary: {},
      referralFunnel: {},
      commissions: {},
      cashbackLedger: {},
      earningsHistory: {},
      inFlightClaims: {},
      claimWaitingUntil: {},
      claimLocks: {},
    });
  });

  it('seeds initialRootState with empty rewardsMoney slice', () => {
    expect(initialRootState.rewardsMoney).toEqual({
      referralMe: {},
      earningsSummary: {},
      referralFunnel: {},
      commissions: {},
      cashbackLedger: {},
      earningsHistory: {},
      inFlightClaims: {},
      claimWaitingUntil: {},
      claimLocks: {},
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
          data: { ...mockReferralMe, ui_variant: 'NONE', roles: [] },
        }),
      );

      expect(afterData.referralMe[PROFILE_B]).toEqual({
        loading: false,
        error: false,
        data: mockReferralMe,
      });
      expect(afterData.referralMe[PROFILE_A]?.data?.ui_variant).toBe('NONE');
    });
  });

  describe('persist/REHYDRATE', () => {
    it('keeps cached data and clears loading and error', () => {
      const persisted: RewardsMoneyState = {
        referralMe: {
          [PROFILE_A]: {
            loading: true,
            error: true,
            data: mockReferralMe,
          },
        },
        earningsSummary: {
          [PROFILE_A]: {
            loading: true,
            error: true,
            data: mockEarningsSummary,
          },
        },
        referralFunnel: {
          [PROFILE_A]: {
            loading: true,
            error: true,
            data: { enrolled: 12, earning_generating: 5 },
          },
        },
        commissions: {
          [PROFILE_A]: [
            {
              id: 'SOCIAL_FOLLOW_TRADE:2026-09-01:perps:BTC',
              earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
              day: '2026-09-01',
              token: {
                key: 'perps:BTC',
                symbol: 'BTC',
                source: 'PERPS',
              },
              musd_amount: '2500000',
              fee_amount_usd: '10.00000000',
              fill_count: 3,
              copied_times: 2,
            },
          ],
        },
        cashbackLedger: {
          [PROFILE_A]: [
            {
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
            },
          ],
        },
        earningsHistory: {
          [PROFILE_A]: [
            {
              type: 'earning' as const,
              id: 'earn-1',
              earning_origin_type: 'SWAPS_FEE_CASHBACK' as const,
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
            },
          ],
        },
        inFlightClaims: {
          [PROFILE_A]: [
            {
              id: 'claim-open',
              status: 'AUTHORIZED',
            },
          ] as ClaimDto[],
        },
        claimWaitingUntil: {
          [PROFILE_A]: 1_800_000_000_000,
        },
        claimLocks: {
          [PROFILE_A]: {
            status: 'in_progress' as const,
            summaryKey: 'stale',
          },
        },
      };

      const state = rewardsMoneyReducer(initialState, {
        type: 'persist/REHYDRATE',
        payload: { rewardsMoney: persisted },
      } as Action);

      expect(state.referralMe[PROFILE_A]).toEqual({
        loading: false,
        error: false,
        data: mockReferralMe,
      });
      expect(state.earningsSummary[PROFILE_A]).toEqual({
        loading: false,
        error: false,
        data: mockEarningsSummary,
      });
      expect(state.referralFunnel[PROFILE_A]).toEqual({
        loading: false,
        error: false,
        data: { enrolled: 12, earning_generating: 5 },
      });
      expect(state.commissions[PROFILE_A]).toEqual(
        persisted.commissions[PROFILE_A],
      );
      expect(state.cashbackLedger[PROFILE_A]).toEqual(
        persisted.cashbackLedger[PROFILE_A],
      );
      expect(state.earningsHistory[PROFILE_A]).toEqual(
        persisted.earningsHistory[PROFILE_A],
      );
      expect(state.inFlightClaims[PROFILE_A]).toEqual(
        persisted.inFlightClaims[PROFILE_A],
      );
      expect(state.claimWaitingUntil[PROFILE_A]).toBe(
        persisted.claimWaitingUntil[PROFILE_A],
      );
      expect(state.claimLocks).toEqual({});
    });

    it('drops a last profile id left by an older persisted slice', () => {
      const persisted = {
        referralMe: {},
        earningsSummary: {},
        lastResolvedProfileId: PROFILE_A,
      };

      const state = rewardsMoneyReducer(initialState, {
        type: 'persist/REHYDRATE',
        payload: { rewardsMoney: persisted },
      } as Action);

      expect(state).toEqual({
        referralMe: {},
        earningsSummary: {},
        referralFunnel: {},
        commissions: {},
        cashbackLedger: {},
        earningsHistory: {},
        inFlightClaims: {},
        claimWaitingUntil: {},
        claimLocks: {},
      });
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

      expect(state).toEqual({
        referralMe: {},
        earningsSummary: {},
        referralFunnel: {},
        commissions: {},
        cashbackLedger: {},
        earningsHistory: {},
        inFlightClaims: {},
        claimWaitingUntil: {},
        claimLocks: {},
      });
    });
  });

  describe('performance caches', () => {
    it('writes funnel data under the asked-for profile', () => {
      const state = rewardsMoneyReducer(
        initialState,
        setReferralFunnel({
          profileId: PROFILE_A,
          data: { enrolled: 12, earning_generating: 5 },
        }),
      );

      expect(state.referralFunnel[PROFILE_A]?.data).toEqual({
        enrolled: 12,
        earning_generating: 5,
      });
    });

    it('caches the first commissions page by profile', () => {
      const items = [
        {
          id: 'SOCIAL_FOLLOW_TRADE:2026-09-01:perps:BTC',
          earning_origin_type: 'SOCIAL_FOLLOW_TRADE' as const,
          day: '2026-09-01',
          token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' as const },
          musd_amount: '2500000',
          fee_amount_usd: '10.00000000',
          fill_count: 3,
          copied_times: 2,
        },
      ];

      const state = rewardsMoneyReducer(
        initialState,
        setCommissions({ profileId: PROFILE_A, items }),
      );

      expect(state.commissions[PROFILE_A]).toEqual(items);
    });

    it('caches cashback ledger rows by profile', () => {
      const items = [
        {
          type: 'earning' as const,
          id: 'earn-1',
          earning_origin_type: 'SWAPS_FEE_CASHBACK' as const,
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
        },
      ];

      const state = rewardsMoneyReducer(
        initialState,
        setCashbackLedger({ profileId: PROFILE_A, items }),
      );

      expect(state.cashbackLedger[PROFILE_A]).toEqual(items);
    });

    it('caches unified earnings history by profile', () => {
      const items = [
        {
          type: 'earning' as const,
          id: 'earn-1',
          earning_origin_type: 'SWAPS_FEE_CASHBACK' as const,
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
        },
        {
          type: 'claim' as const,
          id: 'claim-1',
          route: 'REFERRAL_TRADE_FEE_CASHBACK',
          gross_amount: '1000000',
          net_amount: '1000000',
          withholding_rate_bps: 0,
          status: 'SETTLED',
          ledger_timestamp: '2026-09-02T00:00:00.000Z',
          settled_at: '2026-09-02T00:00:00.000Z',
          payout_method: 'VOUCHER',
        },
      ];

      const state = rewardsMoneyReducer(
        initialState,
        setEarningsHistory({ profileId: PROFILE_A, items }),
      );

      expect(state.earningsHistory[PROFILE_A]).toEqual(items);
    });

    it('caches open claims by profile', () => {
      const claims = [
        {
          id: 'claim-open',
          status: 'AUTHORIZED' as const,
        },
      ] as ClaimDto[];

      const state = rewardsMoneyReducer(
        initialState,
        setInFlightClaims({ profileId: PROFILE_A, claims }),
      );

      expect(state.inFlightClaims[PROFILE_A]).toEqual(claims);
    });

    it('keeps a claim wait by profile and clears it', () => {
      const waiting = rewardsMoneyReducer(
        initialState,
        setClaimWaitingUntil({
          profileId: PROFILE_A,
          until: 1_800_000_000_000,
        }),
      );

      expect(waiting.claimWaitingUntil[PROFILE_A]).toBe(1_800_000_000_000);

      const cleared = rewardsMoneyReducer(
        waiting,
        setClaimWaitingUntil({ profileId: PROFILE_A, until: null }),
      );

      expect(cleared.claimWaitingUntil[PROFILE_A]).toBeUndefined();
    });

    it('keeps a claim lock by profile and clears it', () => {
      const locked = rewardsMoneyReducer(
        initialState,
        setClaimLock({
          profileId: PROFILE_A,
          lock: { status: 'awaiting_fresh_summary', summaryKey: 'before' },
        }),
      );

      expect(locked.claimLocks[PROFILE_A]).toEqual({
        status: 'awaiting_fresh_summary',
        summaryKey: 'before',
      });

      const cleared = rewardsMoneyReducer(
        locked,
        setClaimLock({ profileId: PROFILE_A, lock: null }),
      );

      expect(cleared.claimLocks[PROFILE_A]).toBeUndefined();
    });
  });
});
