import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
} from '@metamask/subscription-controller';
import { getSelectedPlusPlan } from './getSelectedPlusPlan';
import type {
  MoneyAccountPlusPricingView,
  PlanPricingView,
} from './mapMoneyAccountPlusPricing';

const monthly: PlanPricingView = {
  interval: RECURRING_INTERVALS.month,
  currency: 'usd',
  unitAmount: 499,
  unitDecimals: 2,
  amount: 4.99,
  trialPeriodDays: 7,
};

const annual: PlanPricingView = {
  interval: RECURRING_INTERVALS.year,
  currency: 'usd',
  unitAmount: 4999,
  unitDecimals: 2,
  amount: 49.99,
};

const READY_BOTH: MoneyAccountPlusPricingView = {
  status: 'ready',
  monthly,
  annual,
};

describe('getSelectedPlusPlan', () => {
  it('returns undefined when pricing is not ready', () => {
    const result = getSelectedPlusPlan('annual', { status: 'unavailable' });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the selected interval is missing', () => {
    const result = getSelectedPlusPlan('annual', {
      status: 'ready',
      monthly,
    });

    expect(result).toBeUndefined();
  });

  it('returns a checkout payload for the annual plan', () => {
    const result = getSelectedPlusPlan('annual', READY_BOTH);

    expect(result).toEqual({
      planId: 'annual',
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      interval: RECURRING_INTERVALS.year,
      currency: 'usd',
      unitAmount: 4999,
      unitDecimals: 2,
      amount: 49.99,
    });
  });

  it('includes trialPeriodDays when the mapped plan has a trial', () => {
    const result = getSelectedPlusPlan('monthly', READY_BOTH);

    expect(result).toEqual({
      planId: 'monthly',
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      interval: RECURRING_INTERVALS.month,
      currency: 'usd',
      unitAmount: 499,
      unitDecimals: 2,
      amount: 4.99,
      trialPeriodDays: 7,
    });
  });
});
