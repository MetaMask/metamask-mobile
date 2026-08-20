import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CancelSurveyStep from './CancelSurveyStep';
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

const renderStep = (
  overrides: Partial<React.ComponentProps<typeof CancelSurveyStep>> = {},
) => {
  const props: React.ComponentProps<typeof CancelSurveyStep> = {
    selectedReasonId: null,
    onReasonSelect: jest.fn(),
    onBack: jest.fn(),
    onKeepMembership: jest.fn(),
    onCancelConfirm: jest.fn(),
    ...overrides,
  };
  const utils = render(<CancelSurveyStep {...props} />);
  return { ...utils, props };
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancelSurveyStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the back button', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.BACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderStep();

      expect(getByTestId(CancelMembershipTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.cancel_membership.title'),
      );
    });

    it('renders the subtitle from i18n', () => {
      const { getByTestId } = renderStep();

      expect(getByTestId(CancelMembershipTestIds.SUBTITLE)).toHaveTextContent(
        strings('pro_hub.cancel_membership.subtitle'),
      );
    });
  });

  // ── Stats card ─────────────────────────────────────────────────────────────

  describe('stats card', () => {
    it('renders the stats card', () => {
      const { getByTestId } = renderStep();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toBeOnTheScreen();
    });

    it('shows earned as member value', () => {
      const { getByTestId } = renderStep();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(MOCK_CANCEL_STATS.earnedAsMember),
      );
    });

    it('shows membership cost value', () => {
      const { getByTestId } = renderStep();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(MOCK_CANCEL_STATS.membershipCost),
      );
    });

    it('shows earned as member label from i18n', () => {
      const { getByTestId } = renderStep();

      // Use toRegex for partial match — the card contains multiple text nodes.
      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(strings('pro_hub.cancel_membership.earned_as_member')),
      );
    });

    it('shows membership cost label from i18n', () => {
      const { getByTestId } = renderStep();

      expect(getByTestId(CancelMembershipTestIds.STATS_CARD)).toHaveTextContent(
        toRegex(strings('pro_hub.cancel_membership.membership_cost')),
      );
    });
  });

  // ── Reason options ─────────────────────────────────────────────────────────

  describe('reason options', () => {
    it('renders the reasons list', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.REASONS_LIST),
      ).toBeOnTheScreen();
    });

    it('renders all 5 reason items', () => {
      const { getByTestId } = renderStep();

      CANCEL_REASONS.forEach((reason) => {
        expect(getByTestId(getCancelReasonTestId(reason.id))).toBeOnTheScreen();
      });
    });

    it('renders each reason item with the correct i18n label', () => {
      const { getByTestId } = renderStep();

      CANCEL_REASONS.forEach((reason) => {
        expect(getByTestId(getCancelReasonTestId(reason.id))).toHaveTextContent(
          strings(reason.labelKey),
        );
      });
    });

    it('shows the checkmark for the selected reason', () => {
      const firstReason = CANCEL_REASONS[0];
      const { getByTestId } = renderStep({
        selectedReasonId: firstReason.id,
      });

      expect(
        getByTestId(getCancelReasonCheckmarkTestId(firstReason.id)),
      ).toBeOnTheScreen();
    });

    it('shows no checkmarks when no reason is selected', () => {
      const { queryByTestId } = renderStep();

      CANCEL_REASONS.forEach((reason) => {
        expect(
          queryByTestId(getCancelReasonCheckmarkTestId(reason.id)),
        ).toBeNull();
      });
    });

    it('calls onReasonSelect with the pressed reason id', () => {
      const firstReason = CANCEL_REASONS[0];
      const { getByTestId, props } = renderStep();

      fireEvent.press(getByTestId(getCancelReasonTestId(firstReason.id)));

      expect(props.onReasonSelect).toHaveBeenCalledWith(firstReason.id);
    });
  });

  // ── Bottom actions ─────────────────────────────────────────────────────────

  describe('bottom actions', () => {
    it('renders the keep membership button with i18n label', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.KEEP_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the cancel button with i18n label', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.CANCEL_BUTTON),
      ).toBeOnTheScreen();
    });

    it('calls onKeepMembership when keep membership is pressed', () => {
      const { getByTestId, props } = renderStep();

      fireEvent.press(getByTestId(CancelMembershipTestIds.KEEP_BUTTON));

      expect(props.onKeepMembership).toHaveBeenCalledTimes(1);
    });

    it('calls onCancelConfirm when the cancel button is pressed', () => {
      const { getByTestId, props } = renderStep();

      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(props.onCancelConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onKeepMembership before any button is pressed', () => {
      const { props } = renderStep();

      expect(props.onKeepMembership).not.toHaveBeenCalled();
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls onBack when pressed', () => {
      const { getByTestId, props } = renderStep();

      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

      expect(props.onBack).toHaveBeenCalledTimes(1);
    });

    it('does not call onBack before the button is pressed', () => {
      const { props } = renderStep();

      expect(props.onBack).not.toHaveBeenCalled();
    });
  });
});
