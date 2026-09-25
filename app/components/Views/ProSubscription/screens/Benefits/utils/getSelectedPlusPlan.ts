import {
  PRODUCT_TYPES,
  type Currency,
  type RecurringInterval,
} from '@metamask/subscription-controller';
import type { PlanId } from '../Benefits.constants';
import {
  PLUS_PRICING_STATUS,
  type MoneyAccountPlusPricingView,
} from './mapMoneyAccountPlusPricing';

/**
 * Normalized plan the Benefits screen hands off for checkout (SUB-1030).
 */
export interface SelectedPlusPlan {
  planId: PlanId;
  product: typeof PRODUCT_TYPES.MONEY_ACCOUNT_PLUS;
  interval: RecurringInterval;
  currency: Currency;
  unitAmount: number;
  unitDecimals: number;
  amount: number;
  trialPeriodDays?: number;
  minBillingCycles?: number;
  minBillingCyclesForBalance?: number;
}

/**
 * Builds a checkout-ready Plus plan from the UI selection and mapped pricing.
 *
 * @param planId - Resolved UI plan id (`annual` or `monthly`).
 * @param plusPricing - Mapped Money Account Plus pricing.
 * @returns The selected plan, or undefined when that interval is not ready.
 */
export const getSelectedPlusPlan = (
  planId: PlanId,
  plusPricing: MoneyAccountPlusPricingView,
): SelectedPlusPlan | undefined => {
  if (plusPricing.status !== PLUS_PRICING_STATUS.ready) {
    return undefined;
  }

  const pricing = plusPricing[planId];
  if (pricing === undefined) {
    return undefined;
  }

  const selectedPlan: SelectedPlusPlan = {
    planId,
    product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    interval: pricing.interval,
    currency: pricing.currency,
    unitAmount: pricing.unitAmount,
    unitDecimals: pricing.unitDecimals,
    amount: pricing.amount,
  };

  if (pricing.trialPeriodDays !== undefined) {
    selectedPlan.trialPeriodDays = pricing.trialPeriodDays;
  }

  if (pricing.minBillingCycles !== undefined) {
    selectedPlan.minBillingCycles = pricing.minBillingCycles;
  }

  if (pricing.minBillingCyclesForBalance !== undefined) {
    selectedPlan.minBillingCyclesForBalance =
      pricing.minBillingCyclesForBalance;
  }

  return selectedPlan;
};
