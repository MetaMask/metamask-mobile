import type {
  PredictBenefitUsage,
  SubscriptionBenefitsResponse,
} from '@metamask/subscription-controller';
import {
  getStandardPredictFeePolicy,
  resolvePredictFeePolicy,
} from './predictFeePolicy';

const STANDARD_METAMASK_FEE = 0.02;

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
        standardMetamaskFee: STANDARD_METAMASK_FEE,
      }),
    ).toEqual({
      status: 'membership',
      effectiveMetamaskFee: 0,
      builderCode: 'predict-pro-builder',
      isMetaMaskFeeWaived: true,
      canPresentBenefit: true,
    });
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
  ])('uses the standard fee when %s', (_reason, overrides) => {
    expect(
      resolvePredictFeePolicy({
        benefits: createBenefits(overrides),
        standardMetamaskFee: STANDARD_METAMASK_FEE,
      }),
    ).toMatchObject({
      status: 'standard',
      effectiveMetamaskFee: STANDARD_METAMASK_FEE,
      isMetaMaskFeeWaived: false,
      canPresentBenefit: false,
    });
  });

  it('uses the standard policy when the live benefits request fails', () => {
    expect(getStandardPredictFeePolicy(STANDARD_METAMASK_FEE)).toEqual({
      status: 'standard',
      effectiveMetamaskFee: STANDARD_METAMASK_FEE,
      isMetaMaskFeeWaived: false,
      canPresentBenefit: false,
    });
  });

  it('uses the standard fee when the benefits response is ineligible', () => {
    expect(
      resolvePredictFeePolicy({
        benefits: {
          ...createBenefits(),
          eligible: false,
        },
        standardMetamaskFee: STANDARD_METAMASK_FEE,
      }),
    ).toMatchObject({
      status: 'standard',
      effectiveMetamaskFee: STANDARD_METAMASK_FEE,
      isMetaMaskFeeWaived: false,
    });
  });
});
