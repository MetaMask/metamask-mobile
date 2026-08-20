import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CancelSuccessStep from './CancelSuccessStep';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import { MOCK_CANCELLATION_END_DATE } from '../CancelMembership.constants';
import { strings } from '../../../../../../../locales/i18n';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const renderStep = (onDone: () => void = jest.fn()) =>
  render(<CancelSuccessStep onDone={onDone} />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancelSuccessStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the check icon box', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_CHECK_ICON_BOX),
      ).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
      ).toHaveTextContent(strings('pro_hub.cancel_membership.success.title'));
    });

    it('renders the description containing the prefix from i18n', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_DESCRIPTION),
      ).toHaveTextContent(
        toRegex(
          strings('pro_hub.cancel_membership.success.description_prefix'),
        ),
      );
    });

    it('renders the description containing the end date', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_DESCRIPTION),
      ).toHaveTextContent(toRegex(MOCK_CANCELLATION_END_DATE));
    });

    it('renders the description containing the suffix from i18n', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_DESCRIPTION),
      ).toHaveTextContent(
        toRegex(
          strings('pro_hub.cancel_membership.success.description_suffix'),
        ),
      );
    });

    it('renders the done button with the correct i18n label', () => {
      const { getByTestId } = renderStep();

      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON),
      ).toHaveTextContent(strings('pro_hub.cancel_membership.success.done'));
    });
  });

  // ── Done button ────────────────────────────────────────────────────────────

  describe('done button', () => {
    it('calls onDone when pressed', () => {
      const onDone = jest.fn();
      const { getByTestId } = renderStep(onDone);

      fireEvent.press(getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON));

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });
});
