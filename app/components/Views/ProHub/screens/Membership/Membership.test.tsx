import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type PricingResponse,
  type Subscription,
} from '@metamask/subscription-controller';
import Membership from './Membership';
import { MembershipTestIds } from './Membership.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import configureStore from '../../../../../util/test/configureStore';
import { formatSubscriptionFiat } from '../../../../../util/subscription/formatSubscriptionFiat';

// ─── Navigation ───────────────────────────────────────────────────────────────

let mockGoBack: jest.Mock;
let mockNavigate: jest.Mock;
const mockUnCancelSubscription = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionController: {
        unCancelSubscription: (...args: unknown[]) =>
          mockUnCancelSubscription(...args),
      },
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Escapes all regex special characters so a plain string can be used
 * as a partial-match pattern inside toHaveTextContent().
 */
const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const subscription: Subscription = {
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
};

const pricing: PricingResponse = {
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      prices: [
        {
          interval: RECURRING_INTERVALS.month,
          currency: 'usd',
          unitAmount: 999,
          unitDecimals: 2,
          trialPeriodDays: 0,
          minBillingCycles: 1,
          minBillingCyclesForBalance: 1,
        },
        {
          interval: RECURRING_INTERVALS.year,
          currency: 'usd',
          unitAmount: 9900,
          unitDecimals: 2,
          trialPeriodDays: 0,
          minBillingCycles: 1,
          minBillingCyclesForBalance: 1,
        },
      ],
    },
  ],
  paymentMethods: [],
};

const createStoreState = (
  membershipSubscription: Subscription = subscription,
) =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: [membershipSubscription],
          trialedProducts: [],
          pricing,
        },
      },
    },
  }) as unknown as RootState;

const renderMembership = (
  membershipSubscription: Subscription = subscription,
) =>
  render(
    <Provider store={configureStore(createStoreState(membershipSubscription))}>
      <Membership />
    </Provider>,
  );

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Membership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
    mockUnCancelSubscription.mockResolvedValue(undefined);
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.membership.title'),
      );
    });
  });

  // ── Stats section ──────────────────────────────────────────────────────────

  describe('stats section', () => {
    it('renders the stats section', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.STATS_SECTION)).toBeOnTheScreen();
    });

    it('renders the annual plan from SubscriptionController state', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.PLAN_ROW)).toHaveTextContent(
        toRegex(strings('pro_subscription.plans.annual.label')),
      );
    });

    it('renders the lifetime earnings row with an unavailable value absent from controller state', () => {
      const { getByTestId } = renderMembership();
      const lifetimeEarningsRow = getByTestId(
        MembershipTestIds.LIFETIME_EARNINGS_ROW,
      );

      expect(lifetimeEarningsRow).toHaveTextContent(
        toRegex(strings('pro_hub.membership.lifetime_earnings')),
      );
      expect(lifetimeEarningsRow).toHaveTextContent(toRegex('--'));
    });
  });

  // ── Payment details section ────────────────────────────────────────────────

  describe('payment details section', () => {
    it('renders the payment section', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.PAYMENT_SECTION)).toBeOnTheScreen();
    });

    it('renders the payment details heading from i18n', () => {
      // Use getByText to target the exact Text node, not the whole section container.
      const { getByText } = renderMembership();

      expect(
        getByText(strings('pro_hub.membership.payment_details')),
      ).toBeOnTheScreen();
    });

    it('renders the total row with original and discounted prices', () => {
      const { getByTestId } = renderMembership();
      const totalRow = getByTestId(MembershipTestIds.TOTAL_ROW);

      expect(totalRow).toHaveTextContent(
        toRegex(formatSubscriptionFiat(119.88, 'usd')),
      );
      expect(totalRow).toHaveTextContent(
        toRegex(formatSubscriptionFiat(99, 'usd')),
      );
    });

    it('renders the paying with row with payment method', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.PAYING_WITH_ROW)).toHaveTextContent(
        toRegex('VISA •••• 4242'),
      );
    });

    it('renders the renews on row with renewal date', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.RENEWS_ON_ROW)).toHaveTextContent(
        toRegex('Jul 20, 2027'),
      );
    });
  });

  // ── Manage section ─────────────────────────────────────────────────────────

  describe('manage section', () => {
    it('renders the manage section', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.MANAGE_SECTION)).toBeOnTheScreen();
    });

    it('renders the manage section heading from i18n', () => {
      // Use getByText to target the exact Text node, not the whole section container.
      const { getByText } = renderMembership();

      expect(getByText(strings('pro_hub.membership.manage'))).toBeOnTheScreen();
    });

    it('renders the invoices row with correct label', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.INVOICES_ROW)).toHaveTextContent(
        strings('pro_hub.membership.invoices'),
      );
    });

    it('renders the contact support row with correct label', () => {
      const { getByTestId } = renderMembership();

      expect(
        getByTestId(MembershipTestIds.CONTACT_SUPPORT_ROW),
      ).toHaveTextContent(strings('pro_hub.membership.contact_support'));
    });

    it('renders the cancel membership row with correct label', () => {
      const { getByTestId } = renderMembership();

      expect(
        getByTestId(MembershipTestIds.CANCEL_MEMBERSHIP_ROW),
      ).toHaveTextContent(strings('pro_hub.membership.cancel_membership'));
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates to CancelMembership when cancel membership row is pressed', () => {
      const { getByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.CANCEL_MEMBERSHIP_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PRO_HUB.CANCEL_MEMBERSHIP,
      );
    });

    it('does not navigate before any row is pressed', () => {
      renderMembership();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before the button is pressed', () => {
      renderMembership();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('resume membership', () => {
    const pendingCancellation: Subscription = {
      ...subscription,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2027-07-20T00:00:00.000Z',
    };

    it('shows resume and uncancels the subscription when the period end is still ahead', async () => {
      const { getByTestId, queryByTestId } =
        renderMembership(pendingCancellation);

      expect(queryByTestId(MembershipTestIds.CANCEL_MEMBERSHIP_ROW)).toBeNull();
      expect(
        getByTestId(MembershipTestIds.RESUME_MEMBERSHIP_ROW),
      ).toHaveTextContent(strings('pro_hub.membership.resume_membership'));
      fireEvent.press(getByTestId(MembershipTestIds.RESUME_MEMBERSHIP_ROW));

      await waitFor(() =>
        expect(mockUnCancelSubscription).toHaveBeenCalledWith({
          subscriptionId: pendingCancellation.id,
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('hides the membership action when the period end has passed', () => {
      const { queryByTestId } = renderMembership({
        ...pendingCancellation,
        currentPeriodEnd: '2020-01-01T00:00:00.000Z',
      });

      expect(queryByTestId(MembershipTestIds.RESUME_MEMBERSHIP_ROW)).toBeNull();
      expect(queryByTestId(MembershipTestIds.CANCEL_MEMBERSHIP_ROW)).toBeNull();
    });

    it('shows the resume error and does not navigate when uncancel fails', async () => {
      mockUnCancelSubscription.mockRejectedValueOnce(
        new Error('request failed'),
      );
      const { getByTestId } = renderMembership(pendingCancellation);

      fireEvent.press(getByTestId(MembershipTestIds.RESUME_MEMBERSHIP_ROW));

      await waitFor(() =>
        expect(getByTestId(MembershipTestIds.RESUME_ERROR)).toHaveTextContent(
          strings('pro_hub.membership.resume_failed'),
        ),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            feature: 'money_account_plus',
            operation: 'uncancel_subscription',
          },
        }),
      );
    });
  });
});
