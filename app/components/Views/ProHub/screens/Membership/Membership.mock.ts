import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import type { MembershipPricing } from './Membership.utils';

/**
 * Dev-only membership stand-in, so the screen can be driven without a
 * SubscriptionController backend that returns an active Plus subscription.
 *
 * Mirrors the `MM_PRO_SUBSCRIPTION_FLOW_ENABLED` override in
 * `useProSubscriptionEnabled`: set the env var before starting Metro.
 *
 * ```bash
 * MM_PRO_MEMBERSHIP_MOCK_ENABLED=true yarn watch:clean
 * ```
 */
export const isMockMembershipEnabled =
  process.env.MM_PRO_MEMBERSHIP_MOCK_ENABLED === 'true';

export const MOCK_MEMBERSHIP_SUBSCRIPTION: Subscription = {
  id: 'mock-money-account-plus-subscription',
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 9900,
      unitDecimals: 2,
    },
  ],
  currentPeriodStart: '2026-07-20T00:00:00.000Z',
  currentPeriodEnd: '2027-07-20T00:00:00.000Z',
  status: SUBSCRIPTION_STATUSES.active,
  interval: RECURRING_INTERVALS.year,
  paymentMethod: {
    type: PAYMENT_TYPES.byCard,
    card: {
      brand: 'visa',
      displayBrand: 'visa',
      last4: '4242',
    },
  },
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
};

export const MOCK_MEMBERSHIP_PRICING: MembershipPricing = {
  monthly: {
    amount: 9.99,
    currency: 'usd',
  },
  status: 'ready',
};
