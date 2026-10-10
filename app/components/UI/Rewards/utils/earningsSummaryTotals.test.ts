import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  creditedBaseUnits,
  creditedEarnedByOthersLifetime,
  creditedSelfEarnedLifetime,
  earnedByOthersLifetime,
  selfEarnedLifetime,
  underReviewBlockedBaseUnits,
} from './earningsSummaryTotals';

const emptyBranch = {
  lifetime: '0',
  pending: '0',
  claimed: '0',
  voided: '0',
  by_claim_family: {},
};

const SUMMARY = {
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

  it('removes voided base units from a family lifetime', () => {
    const summary = {
      ...SUMMARY,
      self_earned: {
        ...SUMMARY.self_earned,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            lifetime: '7650000',
            voided: '1000000',
          },
        },
      },
    } as unknown as EarningsSummaryDto;

    expect(
      creditedSelfEarnedLifetime(summary, 'REFERRAL_TRADE_FEE_CASHBACK'),
    ).toBe('6650000');
    expect(creditedEarnedByOthersLifetime(SUMMARY, 'REFERRAL_REV_SHARE')).toBe(
      '41750000',
    );
  });

  it('floors a void larger than the amount at zero', () => {
    expect(creditedBaseUnits('1000000', '2500000')).toBe('0');
    expect(creditedBaseUnits('1000000', '0')).toBe('1000000');
    expect(creditedBaseUnits(null, '1')).toBeNull();
  });

  it('returns null when there is no summary', () => {
    expect(selfEarnedLifetime(null, 'REFERRAL_TRADE_FEE_CASHBACK')).toBeNull();
    expect(earnedByOthersLifetime(undefined, 'REFERRAL_REV_SHARE')).toBeNull();
    expect(underReviewBlockedBaseUnits(null)).toBeNull();
    expect(underReviewBlockedBaseUnits(undefined)).toBeNull();
  });

  it('sums blocked base units on families under review', () => {
    const summary = {
      ...SUMMARY,
      self_earned: {
        ...SUMMARY.self_earned,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            blocked: '2000000',
            blocking_reason: 'UNDER_REVIEW',
          },
        },
      },
      earned_by_others: {
        ...SUMMARY.earned_by_others,
        by_claim_family: {
          REFERRAL_REV_SHARE: {
            ...emptyBranch,
            blocked: '5000000',
            blocking_reason: 'UNDER_REVIEW',
          },
          SOCIAL_FOLLOW_TRADE: {
            ...emptyBranch,
            blocked: '9000000',
            blocking_reason: 'MECHANISM_NOT_CLAIMABLE',
          },
        },
      },
    } as unknown as EarningsSummaryDto;

    expect(underReviewBlockedBaseUnits(summary)).toBe('7000000');
  });

  it('ignores a zero under-review block and a family with another reason', () => {
    const summary = {
      ...SUMMARY,
      self_earned: {
        ...SUMMARY.self_earned,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            blocked: '0',
            blocking_reason: 'UNDER_REVIEW',
          },
        },
      },
    } as unknown as EarningsSummaryDto;

    expect(underReviewBlockedBaseUnits(summary)).toBeNull();
    expect(underReviewBlockedBaseUnits(SUMMARY)).toBeNull();
  });

  it.each([
    ['omitted', undefined],
    ['negative', '-1000000'],
    ['not a number', 'nope'],
  ])('returns null when the under-review amount is %s', (_label, blocked) => {
    const summary = {
      ...SUMMARY,
      self_earned: {
        ...emptyBranch,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            blocked,
            blocking_reason: 'UNDER_REVIEW',
          },
        },
      },
      earned_by_others: { ...emptyBranch, by_claim_family: {} },
    } as unknown as EarningsSummaryDto;

    expect(underReviewBlockedBaseUnits(summary)).toBeNull();
  });

  it('returns null when neither branch lists claim families', () => {
    const summary = {
      ...SUMMARY,
      self_earned: undefined,
      earned_by_others: undefined,
    } as unknown as EarningsSummaryDto;

    expect(underReviewBlockedBaseUnits(summary)).toBeNull();
  });
});
