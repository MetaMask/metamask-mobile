import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CANCELLATION_REASONS } from '@metamask/subscription-controller';
import CancelSurveyStep from './CancelSurveyStep';
import {
  CancelMembershipTestIds,
  getCancelReasonCheckmarkTestId,
  getCancelReasonTestId,
} from '../CancelMembership.testIds';
import { CANCEL_REASONS } from '../CancelMembership.constants';
import { strings } from '../../../../../../../locales/i18n';

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderStep = (
  overrides: Partial<React.ComponentProps<typeof CancelSurveyStep>> = {},
) => {
  const props: React.ComponentProps<typeof CancelSurveyStep> = {
    selectedReasonId: null,
    onReasonSelect: jest.fn(),
    onBack: jest.fn(),
    onKeepMembership: jest.fn(),
    onCancelConfirm: jest.fn(),
    isSubmitting: false,
    errorMessage: null,
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

    it('does not render the stay question', () => {
      const { queryByTestId } = renderStep({
        selectedReasonId: CANCEL_REASONS[0].id,
      });

      expect(queryByTestId(CancelMembershipTestIds.STAY_QUESTION)).toBeNull();
      expect(
        queryByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      ).toBeNull();
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

    it('renders all 6 reason items', () => {
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

    it('renders other as the last reason', () => {
      const { getAllByRole } = renderStep();

      const radios = getAllByRole('radio');

      expect(radios[radios.length - 1]).toHaveProp(
        'testID',
        getCancelReasonTestId(CANCELLATION_REASONS.OTHER),
      );
    });

    it('keeps the same reason order after a reason is selected', () => {
      const { getAllByRole, rerender, props } = renderStep();
      const orderBeforeSelect = getAllByRole('radio').map(
        (item) => item.props.testID,
      );

      rerender(
        <CancelSurveyStep {...props} selectedReasonId={CANCEL_REASONS[0].id} />,
      );

      expect(getAllByRole('radio').map((item) => item.props.testID)).toEqual(
        orderBeforeSelect,
      );
    });
  });

  // ── Bottom actions ─────────────────────────────────────────────────────────

  describe('bottom actions', () => {
    it('renders the keep membership button with i18n label', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.KEEP_BUTTON),
      ).toHaveTextContent(strings('pro_hub.cancel_membership.keep_membership'));
    });

    it('renders the cancel button with i18n label', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.CANCEL_BUTTON),
      ).toHaveTextContent(strings('pro_hub.cancel_membership.cancel'));
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

    it('calls onCancelConfirm when cancel is pressed after a reason is selected', () => {
      const firstReason = CANCEL_REASONS[0];
      const { getByTestId, props } = renderStep({
        selectedReasonId: firstReason.id,
      });

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

  // ── Cancellation state ────────────────────────────────────────────────────

  describe('cancellation state', () => {
    it('shows the cancellation error', () => {
      const errorMessage = 'Cancellation failed';
      const { getByTestId } = renderStep({ errorMessage });

      expect(
        getByTestId(CancelMembershipTestIds.ERROR_MESSAGE),
      ).toHaveTextContent(errorMessage);
    });

    it('hides the error message when there is none', () => {
      const { queryByTestId } = renderStep();

      expect(queryByTestId(CancelMembershipTestIds.ERROR_MESSAGE)).toBeNull();
    });

    it('disables both actions while cancellation is submitting', () => {
      const { getByTestId } = renderStep({ isSubmitting: true });

      expect(getByTestId(CancelMembershipTestIds.KEEP_BUTTON)).toBeDisabled();
      expect(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON)).toBeDisabled();
    });

    it('disables the back button while cancellation is submitting', () => {
      const { getByTestId } = renderStep({ isSubmitting: true });

      expect(getByTestId(CancelMembershipTestIds.BACK_BUTTON)).toBeDisabled();
    });
  });
});
