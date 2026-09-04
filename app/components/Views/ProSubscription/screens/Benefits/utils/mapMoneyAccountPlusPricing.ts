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
}

export interface MoneyAccountPlusPricingView {
  monthly?: PlanPricingView;
  annual?: PlanPricingView;
  savings?: { amount: number; equivalentMonthly: number };
  status: 'ready' | 'unavailable' | 'malformed';
}

const KNOWN_INTERVALS = new Set<string>(Object.values(RECURRING_INTERVALS));

const toMajorUnits = (unitAmount: number, unitDecimals: number): number =>
  unitAmount / 10 ** unitDecimals;

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

  return view;
};

const computeSavings = (
  monthly?: PlanPricingView,
  annual?: PlanPricingView,
): MoneyAccountPlusPricingView['savings'] => {
  if (monthly === undefined || annual === undefined) {
    return undefined;
  }

  const savingsAmount = monthly.amount * 12 - annual.amount;
  if (savingsAmount <= 0) {
    return undefined;
  }

  return {
    amount: savingsAmount,
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
    return { status: 'unavailable' };
  }

  const prices = plusProduct.prices;
  if (!Array.isArray(prices) || prices.length === 0) {
    return { status: 'unavailable' };
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
    return { status: 'malformed' };
  }

  return {
    monthly,
    annual,
    savings: computeSavings(monthly, annual),
    status: 'ready',
  };
};
