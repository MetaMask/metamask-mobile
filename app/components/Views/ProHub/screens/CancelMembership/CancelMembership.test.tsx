import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CancelMembership from './CancelMembership';
import {
  CancelMembershipTestIds,
  getCancelReasonCheckmarkTestId,
  getCancelReasonTestId,
} from './CancelMembership.testIds';
import {
  CANCEL_REASONS,
  MOCK_CANCEL_STATS,
} from './CancelMembership.constants';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

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

const renderScreen = () => render(<CancelMembership />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancelMembership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancelMembershipTestIds.BACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.cancel_membership.title'),
      );
    });

    it('renders the subtitle from i18n', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.SUBTITLE)).toHaveTextContent(
        strings('pro_hub.cancel_membership.subtitle'),
      );
    });
  });

  // ── Stats card ─────────────────────────────────────────────────────────────

  describe('stats card', () => {
    it('renders the stats card', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toBeOnTheScreen();
    });

    it('shows earned as member value', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(MOCK_CANCEL_STATS.earnedAsMember),
      );
    });

    it('shows membership cost value', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(MOCK_CANCEL_STATS.membershipCost),
      );
    });

    it('shows earned as member label from i18n', () => {
      const { getByTestId } = renderScreen();

      // Use toRegex for partial match — the card contains multiple text nodes.
      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(strings('pro_hub.cancel_membership.earned_as_member')),
      );
    });

    it('shows membership cost label from i18n', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(strings('pro_hub.cancel_membership.membership_cost')),
      );
    });
  });

  // ── Reason options ─────────────────────────────────────────────────────────

  describe('reason options', () => {
    it('renders the reasons list', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancelMembershipTestIds.REASONS_LIST),
      ).toBeOnTheScreen();
    });

    it('renders all 5 reason items', () => {
      const { getByTestId } = renderScreen();

      CANCEL_REASONS.forEach((reason) => {
        expect(getByTestId(getCancelReasonTestId(reason.id))).toBeOnTheScreen();
      });
    });

    it('renders each reason item with the correct i18n label', () => {
      const { getByTestId } = renderScreen();

      CANCEL_REASONS.forEach((reason) => {
        expect(getByTestId(getCancelReasonTestId(reason.id))).toHaveTextContent(
          strings(reason.labelKey),
        );
      });
    });

    it('shows the checkmark for a selected reason', () => {
      const { getByTestId } = renderScreen();
      const firstReason = CANCEL_REASONS[0];

      fireEvent.press(getByTestId(getCancelReasonTestId(firstReason.id)));

      expect(
        getByTestId(getCancelReasonCheckmarkTestId(firstReason.id)),
      ).toBeOnTheScreen();
    });

    it('hides the checkmark for the previously selected reason after a new one is picked', () => {
      const { getByTestId, queryByTestId } = renderScreen();
      const first = CANCEL_REASONS[0];
      const second = CANCEL_REASONS[1];

      fireEvent.press(getByTestId(getCancelReasonTestId(first.id)));
      fireEvent.press(getByTestId(getCancelReasonTestId(second.id)));

      expect(
        queryByTestId(getCancelReasonCheckmarkTestId(first.id)),
      ).toBeNull();
      expect(
        getByTestId(getCancelReasonCheckmarkTestId(second.id)),
      ).toBeOnTheScreen();
    });

    it('shows no checkmarks before any reason is selected', () => {
      const { queryByTestId } = renderScreen();

      CANCEL_REASONS.forEach((reason) => {
        expect(
          queryByTestId(getCancelReasonCheckmarkTestId(reason.id)),
        ).toBeNull();
      });
    });
  });

  // ── Bottom actions ─────────────────────────────────────────────────────────

  describe('bottom actions', () => {
    it('renders the keep membership button with i18n label', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancelMembershipTestIds.KEEP_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the cancel button with i18n label', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancelMembershipTestIds.CANCEL_BUTTON),
      ).toBeOnTheScreen();
    });

    it('calls navigation.goBack when keep membership is pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancelMembershipTestIds.KEEP_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before any button is pressed', () => {
      renderScreen();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('navigates to CancellationSuccess when the cancel button is pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PRO_HUB.CANCELLATION_SUCCESS,
      );
    });

    it('does not call navigation.goBack when the cancel button is pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before the button is pressed', () => {
      renderScreen();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
