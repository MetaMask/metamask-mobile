import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import { MEMBERSHIP_UNAVAILABLE_VALUE } from './Membership.constants';
import {
  getMembershipDetails,
  getRenewalRowLabelKey,
} from './Membership.utils';

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

describe('getMembershipDetails', () => {
  // Before the fixture period end, so Renews on stays the charge day.
  const beforePeriodEnd = new Date('2026-10-07T00:00:00.000Z');

  it('maps an annual card subscription and comparison pricing', () => {
    const subscription = createSubscription();

    const result = getMembershipDetails(
      subscription,
      readyPricing,
      beforePeriodEnd,
    );

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

    const result = getMembershipDetails(
      subscription,
      readyPricing,
      new Date('2026-08-01T00:00:00.000Z'),
    );

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

    const result = getMembershipDetails(
      subscription,
      readyPricing,
      beforePeriodEnd,
    );

    expect(result.renewsOn).toBe('Jul 20, 2027');
  });

  it('shows the last day of access for a scheduled cancellation', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-12-05T00:00:00.000Z',
    });

    const result = getMembershipDetails(
      subscription,
      readyPricing,
      new Date('2026-10-07T00:00:00.000Z'),
    );

    expect(result.renewsOn).toBe('Dec 4, 2026');
  });

  it('shows the last day of access for a lapsed membership', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.pastDue,
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
    });

    const result = getMembershipDetails(
      subscription,
      readyPricing,
      new Date('2026-10-07T00:00:00.000Z'),
    );

    expect(result.renewsOn).toBe('May 31, 2026');
  });

  it('shows the charge day for an active renewal at midnight UTC', () => {
    const subscription = createSubscription({
      currentPeriodEnd: '2026-12-05T00:00:00.000Z',
    });

    const result = getMembershipDetails(
      subscription,
      readyPricing,
      new Date('2026-10-07T00:00:00.000Z'),
    );

    expect(result.renewsOn).toBe('Dec 5, 2026');
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

describe('getRenewalRowLabelKey', () => {
  const now = new Date('2026-10-07T00:00:00.000Z');

  it('says Renews on for an active plan that will renew', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.active,
      currentPeriodEnd: '2027-07-20T00:00:00.000Z',
    });

    expect(getRenewalRowLabelKey(subscription, now)).toBe(
      'pro_hub.membership.renews_on',
    );
  });

  it('says Ends on while a period-end cancellation is scheduled', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.active,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2027-07-20T00:00:00.000Z',
    });

    expect(getRenewalRowLabelKey(subscription, now)).toBe(
      'pro_hub.membership.ends_on',
    );
  });

  it.each([
    SUBSCRIPTION_STATUSES.pastDue,
    SUBSCRIPTION_STATUSES.paused,
    SUBSCRIPTION_STATUSES.unpaid,
  ])('says Ended on for a %s plan whose period end has passed', (status) => {
    const subscription = createSubscription({
      status,
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
    });

    expect(getRenewalRowLabelKey(subscription, now)).toBe(
      'pro_hub.membership.ended_on',
    );
  });

  it('says Ended on instead of Ends on when a cancelled period has already passed', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.active,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-06-01T00:00:00.000Z',
    });

    expect(getRenewalRowLabelKey(subscription, now)).toBe(
      'pro_hub.membership.ended_on',
    );
  });

  it('keeps Renews on when there is no period end to compare', () => {
    const subscription = createSubscription({ currentPeriodEnd: undefined });

    expect(getRenewalRowLabelKey(subscription, now)).toBe(
      'pro_hub.membership.renews_on',
    );
  });
});
