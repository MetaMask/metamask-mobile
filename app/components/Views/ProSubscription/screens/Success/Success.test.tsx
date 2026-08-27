import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Success from './Success';
import { SuccessTestIds } from './Success.testIds';
import { strings } from '../../../../../../locales/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSuccess = jest.fn();

const renderSuccess = () => render(<Success onSuccess={mockOnSuccess} />);

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Success', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderSuccess();

      expect(getByTestId(SuccessTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the icon placeholder box', () => {
      const { getByTestId } = renderSuccess();

      expect(getByTestId(SuccessTestIds.ICON_PLACEHOLDER)).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderSuccess();

      expect(getByTestId(SuccessTestIds.TITLE)).toBeOnTheScreen();
    });

    it('renders the description from i18n', () => {
      const { getByTestId } = renderSuccess();

      expect(getByTestId(SuccessTestIds.DESCRIPTION)).toHaveTextContent(
        strings('pro_subscription.success.description'),
      );
    });

    it('renders the CTA button with correct label', () => {
      const { getByTestId } = renderSuccess();

      expect(getByTestId(SuccessTestIds.CTA_BUTTON)).toHaveTextContent(
        strings('pro_subscription.success.cta'),
      );
    });
  });

  // ── Callbacks ──────────────────────────────────────────────────────────────

  describe('Callbacks', () => {
    it('calls onSuccess when the CTA button is pressed', () => {
      const { getByTestId } = renderSuccess();

      fireEvent.press(getByTestId(SuccessTestIds.CTA_BUTTON));

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('does not call onSuccess before the button is pressed', () => {
      renderSuccess();

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
