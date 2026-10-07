import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import { MEMBERSHIP_UNAVAILABLE_VALUE } from './Membership.constants';
import { canResumeMembership, getMembershipDetails } from './Membership.utils';

const readyPricing = {
  monthly: {
    interval: RECURRING_INTERVALS.month,
    currency: 'usd' as const,
    unitAmount: 999,
    unitDecimals: 2,
    amount: 9.99,
  },
  annual: {
    interval: RECURRING_INTERVALS.year,
    currency: 'usd' as const,
    unitAmount: 9900,
    unitDecimals: 2,
    amount: 99,
  },
  status: 'ready' as const,
};

const createSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
  id: 'money-account-plus-subscription',
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
  ...overrides,
});

describe('canResumeMembership', () => {
  const now = new Date('2026-10-07T00:00:00.000Z');

  it('is true when cancellation is pending and the period end is still ahead', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2027-07-20T00:00:00.000Z',
    });

    expect(canResumeMembership(subscription, now)).toBe(true);
  });

  it('is false when the period end is already past', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-10-06T00:00:00.000Z',
    });

    expect(canResumeMembership(subscription, now)).toBe(false);
  });

  it('is false when the period end is missing', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: undefined,
    });

    expect(canResumeMembership(subscription, now)).toBe(false);
  });

  it('is false when the period end is not a date', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: 'not-a-date',
    });

    expect(canResumeMembership(subscription, now)).toBe(false);
  });

  it('is false for a canceled subscription that is not pending period-end cancellation', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.canceled,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2027-07-20T00:00:00.000Z',
    });

    expect(canResumeMembership(subscription, now)).toBe(false);
  });

  it('is false when there is no subscription', () => {
    expect(canResumeMembership(undefined, now)).toBe(false);
  });
});

describe('getMembershipDetails', () => {
  it('maps an annual card subscription and comparison pricing', () => {
    const subscription = createSubscription();

    const result = getMembershipDetails(subscription, readyPricing);

    expect(result).toEqual({
      plan: 'Annual',
      lifetimeEarnings: MEMBERSHIP_UNAVAILABLE_VALUE,
      total: '$99.00',
      totalOriginal: '$119.88',
      savingsNote: '2 months on us',
      payingWith: 'VISA •••• 4242',
      renewsOn: 'Jul 20, 2027',
    });
  });

  it('maps a monthly crypto subscription without annual savings', () => {
    const subscription = createSubscription({
      products: [
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          currency: 'usd',
          unitAmount: 999,
          unitDecimals: 2,
        },
      ],
      interval: RECURRING_INTERVALS.month,
      currentPeriodEnd: '2026-08-20T00:00:00.000Z',
      paymentMethod: {
        type: PAYMENT_TYPES.byCrypto,
        crypto: {
          payerAddress: '0x1111111111111111111111111111111111111111',
          chainId: '0x1',
          tokenSymbol: 'USDC',
        },
      },
    });

    const result = getMembershipDetails(subscription, readyPricing);

    expect(result.plan).toBe('Monthly');
    expect(result.total).toBe('$9.99');
    expect(result.totalOriginal).toBeUndefined();
    expect(result.savingsNote).toBeUndefined();
    expect(result.payingWith).toBe('Money account');
    expect(result.renewsOn).toBe('Aug 20, 2026');
  });

  it('renews on the period end even when the subscription has a scheduled end date', () => {
    const subscription = createSubscription({
      endDate: '2026-09-20T00:00:00.000Z',
    });

    const result = getMembershipDetails(subscription, readyPricing);

    expect(result.renewsOn).toBe('Jul 20, 2027');
  });

  it('returns unavailable values when the subscription is absent', () => {
    const result = getMembershipDetails(undefined, {
      status: 'unavailable',
    });

    expect(result).toEqual({
      plan: MEMBERSHIP_UNAVAILABLE_VALUE,
      lifetimeEarnings: MEMBERSHIP_UNAVAILABLE_VALUE,
      total: MEMBERSHIP_UNAVAILABLE_VALUE,
      payingWith: MEMBERSHIP_UNAVAILABLE_VALUE,
      renewsOn: MEMBERSHIP_UNAVAILABLE_VALUE,
    });
  });

  it('returns unavailable values for a missing product and invalid renewal date', () => {
    const subscription = createSubscription({
      products: [],
      currentPeriodEnd: 'not-a-date',
    });

    const result = getMembershipDetails(subscription, readyPricing);

    expect(result.total).toBe(MEMBERSHIP_UNAVAILABLE_VALUE);
    expect(result.totalOriginal).toBeUndefined();
    expect(result.savingsNote).toBeUndefined();
    expect(result.renewsOn).toBe(MEMBERSHIP_UNAVAILABLE_VALUE);
  });
});
