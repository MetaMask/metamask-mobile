import { strings } from '../../../../../../../locales/i18n';
import {
  ANNUAL_SAVINGS_COPY,
  PLAN_IDS,
  PLANS,
  type PlanId,
  type PlanOption,
} from '../Benefits.constants';
import { formatSubscriptionFiat } from './formatSubscriptionFiat';
import {
  PLUS_PRICING_STATUS,
  type MoneyAccountPlusPricingView,
} from './mapMoneyAccountPlusPricing';

export interface PlanSelectorCardCopy {
  price: string;
  subPrice?: string;
  savingsBadge?: string;
  trialLabel?: string;
}

const getPlanOption = (planId: PlanId): PlanOption => {
  const plan = PLANS.find((option) => option.id === planId);
  if (plan === undefined) {
    throw new Error(`Unknown plan id: ${planId}`);
  }
  return plan;
};

/**
 * Picks the visible plan when the user's selection is missing from mapped pricing.
 *
 * @param selectedPlan - The user's current plan selection.
 * @param plusPricing - Mapped Money Account Plus pricing.
 * @returns An available plan id, preferring the selection when present.
 */
export const resolveSelectedPlanId = (
  selectedPlan: string,
  plusPricing: MoneyAccountPlusPricingView,
): PlanId => {
  const candidate: PlanId =
    selectedPlan === PLAN_IDS.monthly ? PLAN_IDS.monthly : PLAN_IDS.annual;

  if (plusPricing.status !== PLUS_PRICING_STATUS.ready) {
    return candidate;
  }

  if (plusPricing[candidate] !== undefined) {
    return candidate;
  }

  if (plusPricing.annual !== undefined) {
    return PLAN_IDS.annual;
  }

  if (plusPricing.monthly !== undefined) {
    return PLAN_IDS.monthly;
  }

  return candidate;
};

/**
 * Builds the Benefits header price line from mapped Plus plans.
 *
 * @param plusPricing - Mapped Money Account Plus pricing.
 * @returns Localized copy, or undefined when prices are not ready to show.
 */
export const getBenefitsPriceLine = (
  plusPricing: MoneyAccountPlusPricingView,
): string | undefined => {
  if (plusPricing.status !== PLUS_PRICING_STATUS.ready) {
    return undefined;
  }

  const monthlyPrice =
    plusPricing.monthly === undefined
      ? undefined
      : formatSubscriptionFiat(
          plusPricing.monthly.amount,
          plusPricing.monthly.currency,
        );
  const annualPrice =
    plusPricing.annual === undefined
      ? undefined
      : formatSubscriptionFiat(
          plusPricing.annual.amount,
          plusPricing.annual.currency,
        );

  if (monthlyPrice !== undefined && annualPrice !== undefined) {
    return strings('pro_subscription.description', {
      monthlyPrice,
      annualPrice,
    });
  }

  if (monthlyPrice !== undefined) {
    return strings('pro_subscription.description_monthly', { monthlyPrice });
  }

  if (annualPrice !== undefined) {
    return strings('pro_subscription.description_annual', { annualPrice });
  }

  return undefined;
};

/**
 * Builds display copy for a plan selector card from mapped Plus pricing.
 *
 * @param planId - UI plan id (`annual` or `monthly`).
 * @param plusPricing - Mapped Money Account Plus pricing.
 * @returns Card copy, or undefined when that interval is not available.
 */
export const getPlanSelectorCardCopy = (
  planId: PlanId,
  plusPricing: MoneyAccountPlusPricingView,
): PlanSelectorCardCopy | undefined => {
  if (plusPricing.status !== PLUS_PRICING_STATUS.ready) {
    return undefined;
  }

  const planPricing = plusPricing[planId];
  if (planPricing === undefined) {
    return undefined;
  }

  const plan = getPlanOption(planId);
  const formattedPrice = formatSubscriptionFiat(
    planPricing.amount,
    planPricing.currency,
  );
  const copy: PlanSelectorCardCopy = {
    price: strings(plan.price, { price: formattedPrice }),
  };

  if (planId === PLAN_IDS.annual && plusPricing.savings !== undefined) {
    copy.subPrice = strings(ANNUAL_SAVINGS_COPY.subPrice, {
      price: formatSubscriptionFiat(
        plusPricing.savings.equivalentMonthly,
        planPricing.currency,
      ),
    });
    copy.savingsBadge = strings(ANNUAL_SAVINGS_COPY.savingsBadge);
  }

  if (
    planPricing.trialPeriodDays !== undefined &&
    planPricing.trialPeriodDays > 0
  ) {
    copy.trialLabel = strings('pro_subscription.plans.trial', {
      days: String(planPricing.trialPeriodDays),
    });
  }

  return copy;
};
