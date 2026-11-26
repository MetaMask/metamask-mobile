import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  creditedBaseUnits,
  earnedByOthersLifetime,
  isVoidedEarning,
  selfEarnedLifetime,
  taxHeldBaseUnits,
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

  it('returns the family lifetime as-is when part of it was voided', () => {
    const summary = {
      ...SUMMARY,
      self_earned: {
        ...SUMMARY.self_earned,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            lifetime: '6650000',
            voided: '1000000',
          },
        },
      },
    } as unknown as EarningsSummaryDto;

    expect(selfEarnedLifetime(summary, 'REFERRAL_TRADE_FEE_CASHBACK')).toBe(
      '6650000',
    );
  });

  it('nets a partial void and floors a void larger than the amount at zero', () => {
    expect(creditedBaseUnits('10000000', '2000000')).toBe('8000000');
    expect(creditedBaseUnits('1000000', '2500000')).toBe('0');
    expect(creditedBaseUnits('1000000', '0')).toBe('1000000');
    expect(creditedBaseUnits(null, '1')).toBeNull();
  });

  it('marks a row voided only when the void covers the whole amount', () => {
    expect(isVoidedEarning('10000000', '10000000')).toBe(true);
    expect(isVoidedEarning('10000000', '12000000')).toBe(true);
    expect(isVoidedEarning('10000000', '2000000')).toBe(false);
    expect(isVoidedEarning('2500000', '0')).toBe(false);
    expect(isVoidedEarning(null, '1000000')).toBe(false);
    expect(isVoidedEarning('2500000', null)).toBe(false);
    expect(isVoidedEarning('2500000', undefined)).toBe(false);
    expect(isVoidedEarning('2500000', '')).toBe(false);
    expect(isVoidedEarning('nope', 'nope')).toBe(false);
  });

  it('ignores held money when summing blocked families under review', () => {
    const summary = {
      ...SUMMARY,
      held: '100000000',
      self_earned: {
        ...SUMMARY.self_earned,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            held: '100000000',
            blocked: '12000000',
            blocking_reason: 'UNDER_REVIEW',
          },
          REFERRAL_REV_SHARE: {
            ...emptyBranch,
            held: '50000000',
            blocked: '3000000',
            blocking_reason: 'SUSPENDED',
          },
        },
      },
    } as unknown as EarningsSummaryDto;

    expect(underReviewBlockedBaseUnits(summary)).toBe('12000000');
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

  describe('scoped to one family', () => {
    const summary = {
      ...SUMMARY,
      self_earned: {
        ...emptyBranch,
        by_claim_family: {
          REFERRAL_TRADE_FEE_CASHBACK: {
            ...emptyBranch,
            blocked: '2000000',
            blocking_reason: 'UNDER_REVIEW',
          },
        },
      },
      earned_by_others: {
        ...emptyBranch,
        by_claim_family: {
          SOCIAL_FOLLOW_TRADE: {
            ...emptyBranch,
            blocked: '5000000',
            blocking_reason: 'UNDER_REVIEW',
          },
        },
      },
    } as unknown as EarningsSummaryDto;

    it('reads only the scoped family', () => {
      expect(
        underReviewBlockedBaseUnits(summary, {
          branch: 'self_earned',
          family: 'REFERRAL_TRADE_FEE_CASHBACK',
        }),
      ).toBe('2000000');
      expect(
        underReviewBlockedBaseUnits(summary, {
          branch: 'earned_by_others',
          family: 'SOCIAL_FOLLOW_TRADE',
        }),
      ).toBe('5000000');
    });

    it('returns null for a family the summary does not list', () => {
      expect(
        underReviewBlockedBaseUnits(summary, {
          branch: 'earned_by_others',
          family: 'REFERRAL_REV_SHARE',
        }),
      ).toBeNull();
    });
  });
});

describe('taxHeldBaseUnits', () => {
  const summary = {
    ...SUMMARY,
    self_earned: {
      ...emptyBranch,
      by_claim_family: {
        REFERRAL_TRADE_FEE_CASHBACK: {
          ...emptyBranch,
          held: '9000000',
          blocking_reason: 'SUSPENDED',
        },
      },
    },
    earned_by_others: {
      ...emptyBranch,
      by_claim_family: {
        REFERRAL_REV_SHARE: {
          ...emptyBranch,
          held: '3000000',
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        },
        SOCIAL_FOLLOW_TRADE: {
          ...emptyBranch,
          held: '56000000',
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        },
      },
    },
  } as unknown as EarningsSummaryDto;

  it('sums held base units on families held for tax and ignores other reasons', () => {
    expect(taxHeldBaseUnits(summary)).toBe('59000000');
  });

  it('reads only the scoped family', () => {
    expect(
      taxHeldBaseUnits(summary, {
        branch: 'earned_by_others',
        family: 'SOCIAL_FOLLOW_TRADE',
      }),
    ).toBe('56000000');
    expect(
      taxHeldBaseUnits(summary, {
        branch: 'self_earned',
        family: 'REFERRAL_TRADE_FEE_CASHBACK',
      }),
    ).toBeNull();
  });

  it('returns null without a summary or a positive held amount', () => {
    expect(taxHeldBaseUnits(null)).toBeNull();
    expect(taxHeldBaseUnits(undefined)).toBeNull();
    expect(taxHeldBaseUnits(SUMMARY)).toBeNull();
    expect(
      taxHeldBaseUnits({
        ...SUMMARY,
        earned_by_others: {
          ...emptyBranch,
          by_claim_family: {
            SOCIAL_FOLLOW_TRADE: {
              ...emptyBranch,
              held: '0',
              blocking_reason: 'TAX_DETERMINATION_REQUIRED',
            },
          },
        },
      } as unknown as EarningsSummaryDto),
    ).toBeNull();
  });
});
