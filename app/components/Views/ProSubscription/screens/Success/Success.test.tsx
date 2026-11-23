import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Success from './Success';
import { SuccessTestIds } from './Success.testIds';
import { strings } from '../../../../../../locales/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSuccess = jest.fn();

const renderSuccess = (props?: {
  isContinuing?: boolean;
  continueError?: string;
}) => render(<Success onSuccess={mockOnSuccess} {...props} />);

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Success', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('shows the CTA as busy while continuing', () => {
      const { getByTestId } = renderSuccess({ isContinuing: true });

      expect(getByTestId(SuccessTestIds.CTA_BUTTON)).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ busy: true, disabled: true }),
      );
    });

    it('shows the continue error banner', () => {
      const message = strings('pro_subscription.success.continue_error');
      const { getByTestId } = renderSuccess({ continueError: message });

      expect(getByTestId(SuccessTestIds.CONTINUE_ERROR)).toHaveTextContent(
        message,
      );
    });

    it('does not show the continue error banner before a failure', () => {
      const { queryByTestId } = renderSuccess();

      expect(queryByTestId(SuccessTestIds.CONTINUE_ERROR)).toBeNull();
    });

    it('announces the continue error', () => {
      const message = strings('pro_subscription.success.continue_error');
      const announceSpy = jest.spyOn(
        AccessibilityInfo,
        'announceForAccessibility',
      );

      renderSuccess({ continueError: message });

      expect(announceSpy).toHaveBeenCalledWith(message);
    });

    it('does not announce a continue error before a failure', () => {
      const announceSpy = jest.spyOn(
        AccessibilityInfo,
        'announceForAccessibility',
      );

      renderSuccess();

      expect(announceSpy).not.toHaveBeenCalled();
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
