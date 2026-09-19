import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  earnedByOthersLifetime,
  selfEarnedLifetime,
} from './earningsSummaryTotals';

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  by_claim_family: {},
};

const SUMMARY = {
  lifetime_total: '0',
  window: null,
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '1000000',
  self_earned: {
    ...emptyBranch,
    by_claim_family: {
      REFERRAL_TRADE_FEE_CASHBACK: { ...emptyBranch, lifetime: '7650000' },
      REFERRAL_REV_SHARE: { ...emptyBranch, lifetime: '11000000' },
    },
  },
  earned_by_others: {
    ...emptyBranch,
    by_claim_family: {
      REFERRAL_REV_SHARE: { ...emptyBranch, lifetime: '41750000' },
    },
  },
} as unknown as EarningsSummaryDto;

describe('earningsSummaryTotals', () => {
  it('reads a family from the self-earned branch', () => {
    expect(selfEarnedLifetime(SUMMARY, 'REFERRAL_TRADE_FEE_CASHBACK')).toBe(
      '7650000',
    );
  });

  it('reads a family from the earned-by-others branch', () => {
    expect(earnedByOthersLifetime(SUMMARY, 'REFERRAL_REV_SHARE')).toBe(
      '41750000',
    );
  });

  it('keeps the two branches apart for the same family name', () => {
    expect(selfEarnedLifetime(SUMMARY, 'REFERRAL_REV_SHARE')).toBe('11000000');
    expect(earnedByOthersLifetime(SUMMARY, 'REFERRAL_REV_SHARE')).toBe(
      '41750000',
    );
  });

  it('returns null for a family the branch does not carry', () => {
    expect(earnedByOthersLifetime(SUMMARY, 'SOCIAL_FOLLOW_TRADE')).toBeNull();
  });

  it('returns null when there is no summary', () => {
    expect(selfEarnedLifetime(null, 'REFERRAL_TRADE_FEE_CASHBACK')).toBeNull();
    expect(earnedByOthersLifetime(undefined, 'REFERRAL_REV_SHARE')).toBeNull();
  });
});
