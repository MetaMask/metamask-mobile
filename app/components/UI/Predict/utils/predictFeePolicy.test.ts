import { DiscountType } from '@metamask/bridge-controller';
import type {
  PredictBenefitUsage,
  SubscriptionBenefitsResponse,
} from '@metamask/subscription-controller';
import { resolvePredictFeePolicy } from './predictFeePolicy';

const createBenefits = (
  predictOverrides: Partial<PredictBenefitUsage> = {},
): SubscriptionBenefitsResponse => ({
  eligible: true,
  billingPeriodId: 'period-1',
  products: {
    swaps: {
      feeBips: null,
      remainingMicroUsd: null,
      exhausted: false,
    },
    perps: {
      builderFeeBips: null,
      builderCode: null,
      remainingMicroUsd: null,
      exhausted: false,
    },
    predict: {
      builderCode: 'predict-pro-builder',
      remainingTxCount: 2,
      exhausted: false,
      ...predictOverrides,
    },
  },
});

describe('Predict fee policy', () => {
  it('waives only the MetaMask fee for an eligible remaining Predict benefit', () => {
    expect(
      resolvePredictFeePolicy({
        benefits: createBenefits(),
      }),
    ).toEqual({
      discountType: DiscountType.SUBSCRIPTION,
      builderCode: 'predict-pro-builder',
    });
  });

  it('uses membership discount only when the benefit is not exhausted', () => {
    const availablePolicy = resolvePredictFeePolicy({
      benefits: createBenefits({
        exhausted: false,
        remainingTxCount: 1,
      }),
    });
    const exhaustedPolicy = resolvePredictFeePolicy({
      benefits: createBenefits({
        exhausted: true,
        remainingTxCount: 1,
      }),
    });

    expect(availablePolicy?.discountType).toBe(DiscountType.SUBSCRIPTION);
    expect(exhaustedPolicy).toBeUndefined();
  });

  it.each([
    ['the allowance is exhausted', { exhausted: true }],
    ['the allowance has no remaining transactions', { remainingTxCount: 0 }],
    [
      'the allowance has an unknown remaining count',
      { remainingTxCount: null },
    ],
    ['the builder code is missing', { builderCode: null }],
    ['the builder code is blank', { builderCode: '  ' }],
  ])('does not resolve a policy when %s', (_reason, overrides) => {
    expect(
      resolvePredictFeePolicy({
        benefits: createBenefits(overrides),
      }),
    ).toBeUndefined();
  });

  it('does not resolve a policy when the benefits response is ineligible', () => {
    expect(
      resolvePredictFeePolicy({
        benefits: {
          ...createBenefits(),
          eligible: false,
        },
      }),
    ).toBeUndefined();
  });
});
