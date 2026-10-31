import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import I18n, { strings } from '../../../../../../locales/i18n';
import { ProHubTestIds } from '../../ProHub.testIds';
import MembershipBanner from './MembershipBanner';
import {
  getMembershipBannerModel,
  MembershipAlertAction,
  MembershipStatusKind,
} from './MembershipBanner.utils';

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
  currentPeriodEnd: '2026-10-12T12:00:00.000Z',
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

const renderBanner = (subscription: Subscription, onAction = jest.fn()) => {
  const model = getMembershipBannerModel(subscription);

  return {
    ...render(<MembershipBanner model={model} onAction={onAction} />),
    onAction,
  };
};

describe('MembershipBanner', () => {
  const originalLocale = I18n.locale;

  beforeEach(() => {
    I18n.locale = 'en';
  });

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('renders Active with no alert and no status icon', () => {
    const { getByTestId, queryByTestId } = renderBanner(createSubscription());

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.active'));
    expect(queryByTestId(ProHubTestIds.MEMBERSHIP_STATUS_ICON)).toBeNull();
    expect(
      queryByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_BANNER(MembershipStatusKind.Overdue),
      ),
    ).toBeNull();
  });

  it('renders Overdue with the payment-failed alert', () => {
    const onAction = jest.fn();
    const { getByTestId } = renderBanner(
      createSubscription({ status: SUBSCRIPTION_STATUSES.pastDue }),
      onAction,
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.overdue'));
    expect(getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_ICON)).toBeOnTheScreen();
    expect(
      getByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_BANNER(MembershipStatusKind.Overdue),
      ),
    ).toHaveTextContent(
      strings('pro_hub.membership_alert.payment_failed.title'),
      {
        exact: false,
      },
    );
    expect(
      getByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_ACTION(MembershipStatusKind.Overdue),
      ),
    ).toHaveTextContent(
      strings('pro_hub.membership_alert.payment_failed.action'),
    );

    fireEvent.press(
      getByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_ACTION(MembershipStatusKind.Overdue),
      ),
    );

    expect(onAction).toHaveBeenCalledWith(MembershipAlertAction.AddFunds);
  });

  it('renders Deactivated with the inactive alert', () => {
    const { getByTestId } = renderBanner(
      createSubscription({ status: SUBSCRIPTION_STATUSES.paused }),
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.deactivated'));
    expect(
      getByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_BANNER(MembershipStatusKind.Deactivated),
      ),
    ).toHaveTextContent(strings('pro_hub.membership_alert.inactive.title'), {
      exact: false,
    });
  });

  it('renders the waiting-for-funds alert without an action for an awaiting-funds plan', () => {
    const { getByTestId, queryByTestId } = renderBanner(
      createSubscription({ status: SUBSCRIPTION_STATUSES.awaitingFunds }),
    );

    const banner = getByTestId(
      ProHubTestIds.MEMBERSHIP_ALERT_BANNER(MembershipStatusKind.Active),
    );
    expect(banner).toHaveTextContent(
      strings('pro_hub.membership_alert.awaiting_funds.title'),
      { exact: false },
    );
    expect(banner).toHaveTextContent(
      strings('pro_hub.membership_alert.awaiting_funds.description'),
      { exact: false },
    );
    expect(
      queryByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_ACTION(MembershipStatusKind.Active),
      ),
    ).toBeNull();
  });

  it('renders Cancelled with the renew-before date', () => {
    const { getByTestId } = renderBanner(
      createSubscription({ status: SUBSCRIPTION_STATUSES.canceled }),
    );

    expect(
      getByTestId(ProHubTestIds.MEMBERSHIP_STATUS_LABEL),
    ).toHaveTextContent(strings('pro_hub.membership_status.cancelled'));
    expect(
      getByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_BANNER(MembershipStatusKind.Cancelled),
      ),
    ).toHaveTextContent(
      strings('pro_hub.membership_alert.cancelled.description', {
        date: 'Oct 12, 2026',
      }),
      { exact: false },
    );
    expect(
      getByTestId(
        ProHubTestIds.MEMBERSHIP_ALERT_ACTION(MembershipStatusKind.Cancelled),
      ),
    ).toHaveTextContent(strings('pro_hub.membership_alert.cancelled.action'));
  });
});
