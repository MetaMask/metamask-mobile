import { type SubscriptionBenefitsState } from '@metamask/subscription-controller';
import Routes from '../../../../../constants/navigation/Routes';
import {
  mapPlusBenefitToDetail,
  PlusBenefitDetailStatus,
  type MapPlusBenefitToDetailInput,
  type PlusEntitlementFlags,
  type ShieldEntitlementFlags,
} from './mapPlusBenefitToDetail';

const ALL_PLUS: PlusEntitlementFlags = {
  swapFeeWaiver: true,
  perpsFeeWaiver: true,
  predictFreeTx: true,
  premiumApy: true,
};

const ALL_SHIELD: ShieldEntitlementFlags = {
  shieldClaim: true,
  prioritySupport: true,
};

const BENEFITS: SubscriptionBenefitsState = {
  billingPeriodId: 'bp_2026_08_15',
  swaps: {
    feeBips: '30',
    capMicroUsd: 500_000_000,
    consumedMicroUsd: 100_000_000,
    remainingMicroUsd: 400_000_000,
    exhausted: false,
  },
  perps: {
    builderFeeBips: '0',
    builderCode: 'code',
    capMicroUsd: 1_000_000_000,
    consumedMicroUsd: 240_000_000,
    remainingMicroUsd: 760_000_000,
    exhausted: false,
  },
  predict: {
    builderCode: 'code',
    capTxCount: 3,
    consumedTxCount: 1,
    remainingTxCount: 2,
    exhausted: false,
  },
};

const createInput = (
  overrides: Partial<MapPlusBenefitToDetailInput> &
    Pick<MapPlusBenefitToDetailInput, 'id'>,
): MapPlusBenefitToDetailInput => ({
  benefits: BENEFITS,
  benefitsFailed: false,
  plusEntitlements: ALL_PLUS,
  shieldEntitlements: ALL_SHIELD,
  resetsOn: 'Sep 15',
  apyPercentFormatted: '7%',
  ...overrides,
});

describe('mapPlusBenefitToDetail', () => {
  it('maps swaps usage, remaining, and fee bips when entitled', () => {
    const result = mapPlusBenefitToDetail(createInput({ id: 'swaps' }));

    expect(result).toEqual(
      expect.objectContaining({
        id: 'swaps',
        status: PlusBenefitDetailStatus.Available,
        kind: 'currency',
        used: 100,
        remaining: 400,
        allowance: 500,
        feePercent: '0.3%',
        resetsOn: 'Sep 15',
        ctaRoute: Routes.BRIDGE.ROOT,
        showRetry: false,
      }),
    );
  });

  it('maps predict remaining as a transaction count', () => {
    const result = mapPlusBenefitToDetail(createInput({ id: 'predict' }));

    expect(result).toEqual(
      expect.objectContaining({
        id: 'predict',
        status: PlusBenefitDetailStatus.Available,
        kind: 'count',
        used: 1,
        remaining: 2,
        allowance: 3,
        ctaRoute: Routes.PREDICT.ROOT,
      }),
    );
  });

  it('marks an exhausted swaps meter as exhausted', () => {
    const result = mapPlusBenefitToDetail(
      createInput({
        id: 'swaps',
        benefits: {
          ...BENEFITS,
          swaps: {
            ...BENEFITS.swaps,
            consumedMicroUsd: 500_000_000,
            remainingMicroUsd: 0,
            exhausted: true,
          },
        },
      }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.Exhausted);
    expect(result.used).toBe(500);
    expect(result.remaining).toBe(0);
  });

  it('returns not included when the Plus entitlement is false', () => {
    const result = mapPlusBenefitToDetail(
      createInput({
        id: 'swaps',
        plusEntitlements: { ...ALL_PLUS, swapFeeWaiver: false },
      }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.NotIncluded);
    expect(result.used).toBeUndefined();
    expect(result.ctaRoute).toBeUndefined();
  });

  it('returns unavailable with retry when benefits failed and there is no cache', () => {
    const result = mapPlusBenefitToDetail(
      createInput({
        id: 'perps',
        benefits: undefined,
        benefitsFailed: true,
      }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.Unavailable);
    expect(result.showRetry).toBe(true);
  });

  it('returns unavailable without inventing a bar when the product has no cap', () => {
    const result = mapPlusBenefitToDetail(
      createInput({
        id: 'predict',
        benefits: {
          ...BENEFITS,
          predict: {
            builderCode: 'code',
            remainingTxCount: null,
            exhausted: false,
          },
        },
      }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.Unavailable);
    expect(result.allowance).toBeUndefined();
    expect(result.showRetry).toBe(false);
  });

  it('returns earn APY when PremiumApy is entitled', () => {
    const result = mapPlusBenefitToDetail(createInput({ id: 'earn' }));

    expect(result).toEqual(
      expect.objectContaining({
        id: 'earn',
        status: PlusBenefitDetailStatus.Available,
        apyPercentFormatted: '7%',
        ctaRoute: Routes.PRO_HUB.EARNED,
      }),
    );
  });

  it('returns unavailable for earn when APY has not loaded', () => {
    const result = mapPlusBenefitToDetail(
      createInput({ id: 'earn', apyPercentFormatted: undefined }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.Unavailable);
  });

  it('returns available card detail with the Card CTA', () => {
    const result = mapPlusBenefitToDetail(createInput({ id: 'card' }));

    expect(result).toEqual(
      expect.objectContaining({
        id: 'card',
        status: PlusBenefitDetailStatus.Available,
        ctaRoute: Routes.CARD.ROOT,
      }),
    );
  });

  it('returns not included for transaction protection without ShieldClaim', () => {
    const result = mapPlusBenefitToDetail(
      createInput({
        id: 'transaction_protection',
        shieldEntitlements: { ...ALL_SHIELD, shieldClaim: false },
      }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.NotIncluded);
  });

  it('returns available priority support when entitled', () => {
    const result = mapPlusBenefitToDetail(
      createInput({ id: 'priority_support' }),
    );

    expect(result.status).toBe(PlusBenefitDetailStatus.Available);
    expect(result.ctaRoute).toBeUndefined();
  });
});
