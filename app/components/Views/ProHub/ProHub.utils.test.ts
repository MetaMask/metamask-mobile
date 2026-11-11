import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import I18n from '../../../../locales/i18n';
import {
  canResumeMembership,
  formatSubscriptionPeriodEnd,
  getMembershipManageAction,
  MembershipManageAction,
} from './ProHub.utils';

describe('formatSubscriptionPeriodEnd', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it.each([
    ['2027-07-20T12:00:00.000Z', 'Jul 19, 2027'],
    ['2026-09-15T12:00:00.000Z', 'Sep 14, 2026'],
    ['2026-10-04T12:00:00.000Z', 'Oct 3, 2026'],
    ['2026-12-05T02:00:00.000Z', 'Dec 4, 2026'],
    ['2026-08-01T00:00:00.000Z', 'Jul 31, 2026'],
  ])('formats %s as the previous UTC day %s', (timestamp, expected) => {
    I18n.locale = 'en';

    expect(formatSubscriptionPeriodEnd(timestamp)).toBe(expected);
  });

  it('formats in the app language rather than English only', () => {
    I18n.locale = 'es';

    expect(formatSubscriptionPeriodEnd('2027-07-20T12:00:00.000Z')).toBe(
      '19 jul 2027',
    );
  });

  it('uses the UTC day even when the device calendar day differs', () => {
    // Jest runs with TZ=America/Toronto, where noon UTC is still Jul 20.
    I18n.locale = 'en';

    expect(formatSubscriptionPeriodEnd('2027-07-20T12:00:00.000Z')).toBe(
      'Jul 19, 2027',
    );
  });

  it('keeps a fallback timestamp on its own UTC day', () => {
    I18n.locale = 'en';

    expect(
      formatSubscriptionPeriodEnd('2026-09-20T12:00:00.000Z', {
        exclusivePeriodEnd: false,
      }),
    ).toBe('Sep 20, 2026');
  });

  it('returns undefined for a missing timestamp', () => {
    expect(formatSubscriptionPeriodEnd(undefined)).toBeUndefined();
  });

  it('returns undefined for an unparseable timestamp', () => {
    expect(formatSubscriptionPeriodEnd('not-a-date')).toBeUndefined();
  });
});

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

  it('is false when the period end is exactly now', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: now.toISOString(),
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

describe('getMembershipManageAction', () => {
  const now = new Date('2026-10-07T00:00:00.000Z');

  it('returns resume while a period-end cancellation can still be reversed', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2027-07-20T00:00:00.000Z',
    });

    expect(getMembershipManageAction(subscription, now)).toBe(
      MembershipManageAction.Resume,
    );
  });

  it('returns hidden once the resume window has closed', () => {
    const subscription = createSubscription({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-10-06T00:00:00.000Z',
    });

    expect(getMembershipManageAction(subscription, now)).toBe(
      MembershipManageAction.Hidden,
    );
  });

  it('returns cancel when the subscription is not pending cancellation', () => {
    expect(getMembershipManageAction(createSubscription(), now)).toBe(
      MembershipManageAction.Cancel,
    );
  });

  it('returns cancel when there is no subscription', () => {
    expect(getMembershipManageAction(undefined, now)).toBe(
      MembershipManageAction.Cancel,
    );
  });
});
