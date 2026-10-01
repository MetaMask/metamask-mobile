import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CancelStayStep from './CancelStayStep';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import { MAX_STAY_FEEDBACK_LENGTH } from '../CancelMembership.constants';
import { strings } from '../../../../../../../locales/i18n';

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderStep = (
  overrides: Partial<React.ComponentProps<typeof CancelStayStep>> = {},
) => {
  const props: React.ComponentProps<typeof CancelStayStep> = {
    stayFeedback: '',
    onStayFeedbackChange: jest.fn(),
    onBack: jest.fn(),
    onKeepMembership: jest.fn(),
    onCancelConfirm: jest.fn(),
    isSubmitting: false,
    errorMessage: null,
    ...overrides,
  };
  const utils = render(<CancelStayStep {...props} />);
  return { ...utils, props };
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancelStayStep', () => {
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

    it('renders the stay question title from i18n', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION),
      ).toHaveTextContent(strings('pro_hub.cancel_membership.stay_question'));
    });

    it('does not render the reasons list', () => {
      const { queryByTestId } = renderStep();

      expect(queryByTestId(CancelMembershipTestIds.REASONS_LIST)).toBeNull();
    });
  });

  // ── Stay feedback input ───────────────────────────────────────────────────

  describe('stay feedback input', () => {
    it('renders the stay input with the i18n placeholder', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      ).toHaveProp(
        'placeholder',
        strings('pro_hub.cancel_membership.stay_question_placeholder'),
      );
    });

    it('renders the current stay feedback value', () => {
      const { getByTestId } = renderStep({ stayFeedback: 'Lower price' });

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      ).toHaveProp('value', 'Lower price');
    });

    it('limits the stay input to the max feedback length', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      ).toHaveProp('maxLength', MAX_STAY_FEEDBACK_LENGTH);
    });

    it('calls onStayFeedbackChange when the stay input text changes', () => {
      const { getByTestId, props } = renderStep();

      fireEvent.changeText(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
        'Lower price',
      );

      expect(props.onStayFeedbackChange).toHaveBeenCalledWith('Lower price');
    });
  });

  // ── Bottom actions ─────────────────────────────────────────────────────────

  describe('bottom actions', () => {
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
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls onBack when pressed', () => {
      const { getByTestId, props } = renderStep();

      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

      expect(props.onBack).toHaveBeenCalledTimes(1);
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
