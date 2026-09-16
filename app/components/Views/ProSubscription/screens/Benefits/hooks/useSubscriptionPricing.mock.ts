import { RECURRING_INTERVALS } from '@metamask/subscription-controller';
import type { MoneyAccountPlusPricingView } from '../utils/mapMoneyAccountPlusPricing';

/**
 * Dev-only stand-in for Money Account Plus pricing, so the Benefits screen can
 * be driven end to end (plan cards -> CTA -> Success -> Pro Hub) without a
 * SubscriptionController backend that returns `MONEY_ACCOUNT_PLUS` prices.
 *
 * Mirrors the `MM_PRO_SUBSCRIPTION_FLOW_ENABLED` override in
 * `useProSubscriptionEnabled`: set the env var before starting Metro.
 *
 * ```bash
 * MM_PRO_SUBSCRIPTION_FLOW_ENABLED=true MM_PRO_PRICING_MOCK_ENABLED=true yarn watch:clean
 * ```
 */
export const isMockPricingEnabled =
  process.env.MM_PRO_PRICING_MOCK_ENABLED === 'true';

export const MOCK_PLUS_PRICING: MoneyAccountPlusPricingView = {
  monthly: {
    interval: RECURRING_INTERVALS.month,
    currency: 'usd',
    unitAmount: 999,
    unitDecimals: 2,
    amount: 9.99,
    trialPeriodDays: 7,
  },
  annual: {
    interval: RECURRING_INTERVALS.year,
    currency: 'usd',
    unitAmount: 9900,
    unitDecimals: 2,
    amount: 99,
    trialPeriodDays: 7,
  },
  savings: {
    amount: 20.88,
    equivalentMonthly: 8.25,
  },
  status: 'ready',
};
