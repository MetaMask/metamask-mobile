import type {
  EarningOriginType,
  EarningsSummaryDto,
  EarningsSummaryTotals,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { deriveClaimability } from './deriveClaimability';

const createTotals = (
  overrides: Partial<EarningsSummaryTotals> = {},
): EarningsSummaryTotals => ({
  lifetime: '0',
  claimable: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  blocking_reason: null,
  ...overrides,
});

const createSummary = (
  overrides: Partial<EarningsSummaryDto> = {},
): EarningsSummaryDto => ({
  lifetime_total: '0',
  claimable: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '10000000',
  by_earning_origin_type: {},
  ...overrides,
});

const BOTH_TYPES: EarningOriginType[] = ['CASHBACK', 'REFERRAL_REV_SHARE'];

describe('deriveClaimability', () => {
  it('reports nothing claimable when the summary has not loaded', () => {
    const result = deriveClaimability(null, BOTH_TYPES);

    expect(result.canClaim).toBe(false);
    expect(result.coverage).toBe('none');
    expect(result.claimableTypes).toStrictEqual([]);
  });

  it('reports full coverage when every requested type pays', () => {
    const summary = createSummary({
      claimable: '20000000',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '12000000' }),
        REFERRAL_REV_SHARE: createTotals({ claimable: '8000000' }),
      },
    });

    const result = deriveClaimability(summary, BOTH_TYPES);

    expect(result.coverage).toBe('all');
    expect(result.claimableTypes).toStrictEqual(BOTH_TYPES);
    expect(result.withheldTypes).toStrictEqual([]);
    expect(result.canClaim).toBe(true);
    expect(result.claimable).toBe(20000000n);
  });

  it('reports partial coverage and the withheld type when income is held', () => {
    const summary = createSummary({
      claimable: '12500000',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '12500000' }),
        REFERRAL_REV_SHARE: createTotals({
          claimable: '0',
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        }),
      },
    });

    const result = deriveClaimability(summary, BOTH_TYPES);

    expect(result.coverage).toBe('partial');
    expect(result.claimableTypes).toStrictEqual(['CASHBACK']);
    expect(result.withheldTypes).toStrictEqual(['REFERRAL_REV_SHARE']);
    expect(result.canClaim).toBe(true);
    expect(result.blockingReason).toBe('TAX_DETERMINATION_REQUIRED');
  });

  it('reports no coverage and the shared reason when every type is blocked', () => {
    const summary = createSummary({
      claimable: '0',
      by_earning_origin_type: {
        CASHBACK: createTotals({ blocking_reason: 'SUSPENDED' }),
        REFERRAL_REV_SHARE: createTotals({ blocking_reason: 'SUSPENDED' }),
      },
    });

    const result = deriveClaimability(summary, BOTH_TYPES);

    expect(result.coverage).toBe('none');
    expect(result.canClaim).toBe(false);
    expect(result.blockingReason).toBe('SUSPENDED');
  });

  it('reports no blocking reason when the withheld types disagree', () => {
    const summary = createSummary({
      by_earning_origin_type: {
        CASHBACK: createTotals({ blocking_reason: 'SUSPENDED' }),
        REFERRAL_REV_SHARE: createTotals({
          blocking_reason: 'TAX_DETERMINATION_REQUIRED',
        }),
      },
    });

    const result = deriveClaimability(summary, BOTH_TYPES);

    expect(result.blockingReason).toBeNull();
  });

  it('blocks the claim when the total sits under the minimum', () => {
    const summary = createSummary({
      claimable: '9999999',
      minimum_musd_base_units: '10000000',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '9999999' }),
        REFERRAL_REV_SHARE: createTotals({ claimable: '0' }),
      },
    });

    const result = deriveClaimability(summary, BOTH_TYPES);

    expect(result.isBelowMinimum).toBe(true);
    expect(result.canClaim).toBe(false);
    expect(result.blockingReason).toBe('BELOW_MINIMUM');
  });

  it('allows the claim when the total exactly meets the minimum', () => {
    const summary = createSummary({
      claimable: '10000000',
      minimum_musd_base_units: '10000000',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '10000000' }),
      },
    });

    const result = deriveClaimability(summary, ['CASHBACK']);

    expect(result.isBelowMinimum).toBe(false);
    expect(result.canClaim).toBe(true);
  });

  it('treats an absent origin-type key as paying nothing', () => {
    const summary = createSummary({
      claimable: '12000000',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: '12000000' }),
      },
    });

    const result = deriveClaimability(summary, BOTH_TYPES);

    expect(result.withheldTypes).toStrictEqual(['REFERRAL_REV_SHARE']);
    expect(result.coverage).toBe('partial');
  });

  it('treats a malformed amount as paying nothing rather than throwing', () => {
    const summary = createSummary({
      claimable: 'not-a-number',
      by_earning_origin_type: {
        CASHBACK: createTotals({ claimable: 'also-not-a-number' }),
      },
    });

    const result = deriveClaimability(summary, ['CASHBACK']);

    expect(result.claimable).toBe(0n);
    expect(result.canClaim).toBe(false);
  });

  it('reads amounts beyond Number.MAX_SAFE_INTEGER without losing precision', () => {
    const huge = '9007199254740993000000';
    const summary = createSummary({
      claimable: huge,
      by_earning_origin_type: { CASHBACK: createTotals({ claimable: huge }) },
    });

    const result = deriveClaimability(summary, ['CASHBACK']);

    expect(result.claimable).toBe(BigInt(huge));
  });
});
