import {
  BannerAlertSeverity,
  IconColor,
} from '@metamask/design-system-react-native';
import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  INVOICE_PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import I18n from '../../../../../../locales/i18n';
import {
  getMembershipBannerModel,
  MembershipAlertAction,
  MembershipStatusKind,
} from './MembershipBanner.utils';

const PERIOD_END = '2026-10-12T12:00:00.000Z';

const createSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
  id: 'sub-plus',
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 500,
      unitDecimals: 2,
    },
  ],
  currentPeriodStart: '2026-09-12T12:00:00.000Z',
  currentPeriodEnd: PERIOD_END,
  status: SUBSCRIPTION_STATUSES.active,
  interval: RECURRING_INTERVALS.month,
  paymentMethod: {
    type: PAYMENT_TYPES.byCard,
    card: { brand: 'visa', displayBrand: 'visa', last4: '4242' },
  },
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
  ...overrides,
});

describe('getMembershipBannerModel', () => {
  const originalLocale = I18n.locale;

  beforeEach(() => {
    I18n.locale = 'en';
  });

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it.each([
    SUBSCRIPTION_STATUSES.active,
    SUBSCRIPTION_STATUSES.trialing,
    SUBSCRIPTION_STATUSES.provisional,
  ])('shows Active with no alert for a %s plan', (status) => {
    const subscription = createSubscription({
      status,
      trialPeriodDays: 14,
      trialEnd: '2026-10-04T12:00:00.000Z',
      cancelAtPeriodEnd: true,
    });

    const model = getMembershipBannerModel(subscription);

    expect(model).toEqual({
      statusKind: MembershipStatusKind.Active,
      statusKey: 'pro_hub.membership_status.active',
    });
  });

  it('shows Unavailable when no subscription has loaded', () => {
    expect(getMembershipBannerModel()).toEqual({
      statusKind: MembershipStatusKind.Unavailable,
      statusKey: 'pro_hub.membership_status.unavailable',
    });
  });

  it.each([
    SUBSCRIPTION_STATUSES.incomplete,
    SUBSCRIPTION_STATUSES.incompleteExpired,
  ])('shows Unavailable for an unmapped %s plan', (status) => {
    const model = getMembershipBannerModel(createSubscription({ status }));

    expect(model).toEqual({
      statusKind: MembershipStatusKind.Unavailable,
      statusKey: 'pro_hub.membership_status.unavailable',
    });
  });

  it('shows Overdue and the payment-failed alert for a past-due plan', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.pastDue,
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.statusKind).toBe(MembershipStatusKind.Overdue);
    expect(model.statusKey).toBe('pro_hub.membership_status.overdue');
    expect(model.iconColor).toBe(IconColor.ErrorDefault);
    expect(model.alert).toEqual({
      severity: BannerAlertSeverity.Danger,
      titleKey: 'pro_hub.membership_alert.payment_failed.title',
      descriptionKey: 'pro_hub.membership_alert.payment_failed.description',
      actionKey: 'pro_hub.membership_alert.payment_failed.action',
      action: MembershipAlertAction.AddFunds,
    });
  });

  it.each([SUBSCRIPTION_STATUSES.paused, SUBSCRIPTION_STATUSES.unpaid])(
    'shows Deactivated and the inactive alert for a %s plan',
    (status) => {
      const subscription = createSubscription({ status });

      const model = getMembershipBannerModel(subscription);

      expect(model.statusKind).toBe(MembershipStatusKind.Deactivated);
      expect(model.statusKey).toBe('pro_hub.membership_status.deactivated');
      expect(model.iconColor).toBe(IconColor.ErrorDefault);
      expect(model.alert).toEqual({
        severity: BannerAlertSeverity.Danger,
        titleKey: 'pro_hub.membership_alert.inactive.title',
        descriptionKey: 'pro_hub.membership_alert.inactive.description',
        actionKey: 'pro_hub.membership_alert.inactive.action',
        action: MembershipAlertAction.AddFunds,
      });
    },
  );

  it('shows Cancelled and the renew-before date for a canceled plan', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.canceled,
      canceledAt: '2026-09-20T12:00:00.000Z',
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.statusKind).toBe(MembershipStatusKind.Cancelled);
    expect(model.statusKey).toBe('pro_hub.membership_status.cancelled');
    expect(model.iconColor).toBe(IconColor.WarningDefault);
    expect(model.alert).toEqual({
      severity: BannerAlertSeverity.Warning,
      titleKey: 'pro_hub.membership_alert.cancelled.title',
      descriptionKey: 'pro_hub.membership_alert.cancelled.description',
      descriptionValues: { date: 'Oct 12, 2026' },
      actionKey: 'pro_hub.membership_alert.cancelled.action',
      action: MembershipAlertAction.Renew,
    });
  });

  it('uses canceledAt when a cancelled plan has no period end', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.canceled,
      currentPeriodEnd: undefined,
      canceledAt: '2026-09-20T12:00:00.000Z',
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.alert?.descriptionKey).toBe(
      'pro_hub.membership_alert.cancelled.description',
    );
    expect(model.alert?.descriptionValues).toEqual({ date: 'Sep 20, 2026' });
  });

  it('omits the cancelled description when the plan has no date', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.canceled,
      currentPeriodEnd: undefined,
      canceledAt: undefined,
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.alert?.titleKey).toBe(
      'pro_hub.membership_alert.cancelled.title',
    );
    expect(model.alert?.descriptionKey).toBeUndefined();
    expect(model.alert?.descriptionValues).toBeUndefined();
  });

  it('shows the renewal-failed alert when the latest invoice failed', () => {
    const subscription = createSubscription({
      lastInvoice: {
        id: 'inv-failed',
        status: INVOICE_PAYMENT_STATUSES.FAILED,
      },
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.statusKind).toBe(MembershipStatusKind.Active);
    expect(model.iconColor).toBe(IconColor.WarningDefault);
    expect(model.alert?.titleKey).toBe(
      'pro_hub.membership_alert.renewal_failed.title',
    );
    expect(model.alert?.action).toBe(MembershipAlertAction.AddFunds);
  });

  it('shows the waiting-for-funds alert while a plan is waiting for funds', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.awaitingFunds,
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.statusKind).toBe(MembershipStatusKind.Active);
    expect(model.iconColor).toBe(IconColor.PrimaryDefault);
    expect(model.alert).toEqual({
      severity: BannerAlertSeverity.Info,
      titleKey: 'pro_hub.membership_alert.awaiting_funds.title',
      descriptionKey: 'pro_hub.membership_alert.awaiting_funds.description',
    });
  });

  it('omits a date from the waiting-for-funds alert', () => {
    const subscription = createSubscription({
      status: SUBSCRIPTION_STATUSES.awaitingFunds,
      currentPeriodEnd: undefined,
      endDate: '2026-11-01T12:00:00.000Z',
    });

    const model = getMembershipBannerModel(subscription);

    expect(model.alert?.descriptionValues).toBeUndefined();
  });
});
