import type {
  PredictBenefitUsage,
  SubscriptionBenefitsResponse,
} from '@metamask/subscription-controller';
import type { OrderPreview } from '../types';
import {
  resolvePredictFeePolicy,
  syncPreviewWithFeePolicy,
} from './predictFeePolicy';

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

    expect(availablePolicy).toEqual({
      builderCode: 'predict-pro-builder',
    });
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
    ['the remaining count is not an integer', { remainingTxCount: 1.5 }],
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

  describe('syncPreviewWithFeePolicy', () => {
    const feePolicy = {
      builderCode: 'predict-pro-builder',
    };

    const createFees = (
      overrides: Partial<NonNullable<OrderPreview['fees']>> = {},
    ): NonNullable<OrderPreview['fees']> => ({
      metamaskFee: 0.2,
      providerFee: 0.3,
      totalFee: 0.5,
      totalFeePercentage: 5,
      collector: '0x1111111111111111111111111111111111111111',
      executors: [],
      permit2Enabled: true,
      ...overrides,
    });

    it('attaches the current policy and preserves fee snapshots', () => {
      const fees = createFees({ metamaskFee: 0 });
      const originalFees = createFees();
      const params = {
        feePolicy: { builderCode: 'previous-builder' },
        fees,
        originalFees,
      };

      const result = syncPreviewWithFeePolicy(params, feePolicy);

      expect(result).toEqual({
        feePolicy,
        fees,
        originalFees,
      });
    });

    it('restores standard fees when the current policy is unavailable', () => {
      const fees = createFees({ metamaskFee: 0 });
      const originalFees = createFees();
      const params = {
        feePolicy,
        fees,
        originalFees,
      };

      const result = syncPreviewWithFeePolicy(params);

      expect(result).toEqual({ fees: originalFees });
    });

    it('removes waived fees when the standard fee snapshot is unavailable', () => {
      const params = {
        feePolicy,
        fees: createFees({ metamaskFee: 0 }),
      };

      const result = syncPreviewWithFeePolicy(params);

      expect(result).toEqual({});
    });

    it('preserves standard fees when no previous policy is attached', () => {
      const fees = createFees();
      const params = { fees };

      const result = syncPreviewWithFeePolicy(params);

      expect(result).toEqual({ fees });
    });
  });
});
