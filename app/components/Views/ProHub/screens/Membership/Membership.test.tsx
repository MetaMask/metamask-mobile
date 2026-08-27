import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Membership from './Membership';
import { MembershipTestIds } from './Membership.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  MOCK_MEMBERSHIP_STATS,
  MOCK_PAYMENT_DETAILS,
} from './Membership.constants';
import Routes from '../../../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

let mockGoBack: jest.Mock;
let mockNavigate: jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

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

const renderMembership = () => render(<Membership />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Membership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
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

    it('renders the plan row with mock plan value', () => {
      const { getByTestId } = renderMembership();

      // Row container includes both label + value; use regex for partial match.
      expect(getByTestId(MembershipTestIds.PLAN_ROW)).toHaveTextContent(
        toRegex(MOCK_MEMBERSHIP_STATS.plan),
      );
    });

    it('renders the earned this month row with mock value', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.EARNED_ROW)).toHaveTextContent(
        toRegex(MOCK_MEMBERSHIP_STATS.earnedThisMonth),
      );
    });

    it('renders the saved this month row with mock value', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.SAVED_ROW)).toHaveTextContent(
        toRegex(MOCK_MEMBERSHIP_STATS.savedThisMonth),
      );
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
        toRegex(MOCK_PAYMENT_DETAILS.totalOriginal),
      );
      expect(totalRow).toHaveTextContent(
        toRegex(MOCK_PAYMENT_DETAILS.totalDiscounted),
      );
    });

    it('renders the paying with row with payment method', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.PAYING_WITH_ROW)).toHaveTextContent(
        toRegex(MOCK_PAYMENT_DETAILS.payingWith),
      );
    });

    it('renders the renews on row with renewal date', () => {
      const { getByTestId } = renderMembership();

      expect(getByTestId(MembershipTestIds.RENEWS_ON_ROW)).toHaveTextContent(
        toRegex(MOCK_PAYMENT_DETAILS.renewsOn),
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

  // ── Stat info bottom sheet ────────────────────────────────────────────────

  describe('stat info bottom sheet', () => {
    it('is not visible by default', () => {
      const { queryByTestId } = renderMembership();

      expect(queryByTestId(MembershipTestIds.STAT_INFO_SHEET)).toBeNull();
    });

    it('opens when the Earned this month row is pressed', () => {
      const { getByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.EARNED_ROW));

      expect(getByTestId(MembershipTestIds.STAT_INFO_SHEET)).toBeOnTheScreen();
    });

    it('opens when the Saved this month row is pressed', () => {
      const { getByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.SAVED_ROW));

      expect(getByTestId(MembershipTestIds.STAT_INFO_SHEET)).toBeOnTheScreen();
    });

    it('shows the earned info title and description when earned row is pressed', () => {
      const { getByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.EARNED_ROW));

      expect(
        getByTestId(MembershipTestIds.STAT_INFO_SHEET_TITLE),
      ).toHaveTextContent(strings('pro_hub.membership.earned_info.title'));
      expect(
        getByTestId(MembershipTestIds.STAT_INFO_SHEET_DESCRIPTION),
      ).toHaveTextContent(
        strings('pro_hub.membership.earned_info.description'),
      );
    });

    it('shows the saved info title and description when saved row is pressed', () => {
      const { getByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.SAVED_ROW));

      expect(
        getByTestId(MembershipTestIds.STAT_INFO_SHEET_TITLE),
      ).toHaveTextContent(strings('pro_hub.membership.saved_info.title'));
      expect(
        getByTestId(MembershipTestIds.STAT_INFO_SHEET_DESCRIPTION),
      ).toHaveTextContent(strings('pro_hub.membership.saved_info.description'));
    });

    it('closes the sheet when onClose is fired', () => {
      const { getByTestId, queryByTestId } = renderMembership();

      fireEvent.press(getByTestId(MembershipTestIds.EARNED_ROW));
      expect(getByTestId(MembershipTestIds.STAT_INFO_SHEET)).toBeOnTheScreen();

      fireEvent(getByTestId(MembershipTestIds.STAT_INFO_SHEET), 'close');

      expect(queryByTestId(MembershipTestIds.STAT_INFO_SHEET)).toBeNull();
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
});
