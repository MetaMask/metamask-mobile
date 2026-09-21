import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type Currency,
  type PricingResponse,
  type ProductPrice,
  type RecurringInterval,
} from '@metamask/subscription-controller';

export interface PlanPricingView {
  interval: RecurringInterval;
  currency: Currency;
  unitAmount: number;
  unitDecimals: number;
  amount: number;
  trialPeriodDays?: number;
  minBillingCycles?: number;
  minBillingCyclesForBalance?: number;
}

export const PLUS_PRICING_STATUS = {
  ready: 'ready',
  unavailable: 'unavailable',
  malformed: 'malformed',
} as const;

export type PlusPricingStatus =
  (typeof PLUS_PRICING_STATUS)[keyof typeof PLUS_PRICING_STATUS];

export interface MoneyAccountPlusPricingView {
  monthly?: PlanPricingView;
  annual?: PlanPricingView;
  savings?: { amount: number; equivalentMonthly: number };
  status: PlusPricingStatus;
}

const KNOWN_INTERVALS = new Set<string>(Object.values(RECURRING_INTERVALS));

const toMajorUnits = (unitAmount: number, unitDecimals: number): number =>
  unitAmount / 10 ** unitDecimals;

const scaleUnitAmount = (
  unitAmount: number,
  fromDecimals: number,
  toDecimals: number,
): number => unitAmount * 10 ** (toDecimals - fromDecimals);

const isUsablePriceRow = (price: ProductPrice): boolean => {
  if (!KNOWN_INTERVALS.has(price.interval)) {
    return false;
  }
  if (price.currency !== 'usd') {
    return false;
  }
  if (!Number.isFinite(price.unitAmount)) {
    return false;
  }
  if (!Number.isFinite(price.unitDecimals) || price.unitDecimals < 0) {
    return false;
  }
  return true;
};

const toPlanPricingView = (price: ProductPrice): PlanPricingView => {
  const view: PlanPricingView = {
    interval: price.interval,
    currency: price.currency,
    unitAmount: price.unitAmount,
    unitDecimals: price.unitDecimals,
    amount: toMajorUnits(price.unitAmount, price.unitDecimals),
  };

  if (Number.isFinite(price.trialPeriodDays) && price.trialPeriodDays >= 0) {
    view.trialPeriodDays = price.trialPeriodDays;
  }

  if (Number.isFinite(price.minBillingCycles) && price.minBillingCycles >= 0) {
    view.minBillingCycles = price.minBillingCycles;
  }

  if (
    Number.isFinite(price.minBillingCyclesForBalance) &&
    price.minBillingCyclesForBalance >= 0
  ) {
    view.minBillingCyclesForBalance = price.minBillingCyclesForBalance;
  }

  return view;
};

const computeSavings = (
  monthly?: PlanPricingView,
  annual?: PlanPricingView,
): MoneyAccountPlusPricingView['savings'] => {
  if (monthly === undefined || annual === undefined) {
    return undefined;
  }

  const scaleDecimals = Math.max(monthly.unitDecimals, annual.unitDecimals);
  const monthlyMinor = scaleUnitAmount(
    monthly.unitAmount,
    monthly.unitDecimals,
    scaleDecimals,
  );
  const annualMinor = scaleUnitAmount(
    annual.unitAmount,
    annual.unitDecimals,
    scaleDecimals,
  );
  const savingsMinor = monthlyMinor * 12 - annualMinor;
  if (savingsMinor <= 0) {
    return undefined;
  }

  return {
    amount: toMajorUnits(savingsMinor, scaleDecimals),
    equivalentMonthly: annual.amount / 12,
  };
};

/**
 * Maps SubscriptionController pricing onto Money Account Plus monthly and
 * annual plans using product name and billing interval, not array position.
 *
 * @param pricing - Cached pricing response, or undefined when unfetched.
 * @returns Mapped Plus plans, optional savings, and availability status.
 */
export const mapMoneyAccountPlusPricing = (
  pricing?: PricingResponse,
): MoneyAccountPlusPricingView => {
  const plusProduct = pricing?.products.find(
    (product) => product.name === PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
  );

  if (plusProduct === undefined) {
    return { status: PLUS_PRICING_STATUS.unavailable };
  }

  const prices = plusProduct.prices;
  if (!Array.isArray(prices) || prices.length === 0) {
    return { status: PLUS_PRICING_STATUS.unavailable };
  }

  let monthly: PlanPricingView | undefined;
  let annual: PlanPricingView | undefined;

  prices.forEach((price) => {
    if (!isUsablePriceRow(price)) {
      return;
    }

    const view = toPlanPricingView(price);
    if (view.interval === RECURRING_INTERVALS.month && monthly === undefined) {
      monthly = view;
    }
    if (view.interval === RECURRING_INTERVALS.year && annual === undefined) {
      annual = view;
    }
  });

  if (monthly === undefined && annual === undefined) {
    return { status: PLUS_PRICING_STATUS.malformed };
  }

  return {
    monthly,
    annual,
    savings: computeSavings(monthly, annual),
    status: PLUS_PRICING_STATUS.ready,
  };
};
