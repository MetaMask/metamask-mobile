import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardWarningBox from './CardWarningBox';
import { CardWarningBoxType } from '../../types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.card_home.warnings.close_spending_limit.title':
        'Close Spending Limit',
      'card.card_home.warnings.close_spending_limit.description':
        'You are approaching your spending limit. Consider closing it.',
      'card.card_home.warnings.close_spending_limit.confirm_button_label':
        'Close Limit',
      'card.card_home.warnings.kyc_pending.title': 'Verification in Progress',
      'card.card_home.warnings.kyc_pending.description':
        'Your identity verification is still being reviewed.',
      'card.card_spending_limit.dismiss': 'Dismiss',
    };
    return mockStrings[key] || key;
  }),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardWarningBox',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardWarningBox', () => {
  const mockOnConfirm = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CloseSpendingLimit warning', () => {
    it('renders warning icon', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox warning={CardWarningBoxType.CloseSpendingLimit} />
      ));

      expect(getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardWarningBox warning={CardWarningBoxType.CloseSpendingLimit} />
      ));

      expect(getByText('Close Spending Limit')).toBeOnTheScreen();
      expect(
        getByText(
          'You are approaching your spending limit. Consider closing it.',
        ),
      ).toBeOnTheScreen();
    });

    it('renders confirm button when onConfirm is provided', () => {
      const { getByText } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
        />
      ));

      expect(getByText('Close Limit')).toBeOnTheScreen();
    });

    it('calls onConfirm when confirm button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
        />
      ));

      fireEvent.press(getByTestId('confirm-button'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on confirm button when onConfirmLoading is true', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
          onConfirmLoading
        />
      ));

      const confirmButton = getByTestId('confirm-button');
      expect(confirmButton).toBeOnTheScreen();
    });
  });

  describe('KYCPending warning', () => {
    it('renders warning icon', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox warning={CardWarningBoxType.KYCPending} />
      ));

      expect(getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardWarningBox warning={CardWarningBoxType.KYCPending} />
      ));

      expect(getByText('Verification in Progress')).toBeOnTheScreen();
      expect(
        getByText('Your identity verification is still being reviewed.'),
      ).toBeOnTheScreen();
    });

    it('does not render confirm button since KYCPending has no confirmButtonLabel', () => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.KYCPending}
          onConfirm={mockOnConfirm}
        />
      ));

      expect(queryByTestId('confirm-button')).toBeNull();
    });
  });

  describe('common behaviors', () => {
    it('renders dismiss button when onDismiss is provided', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
          onDismiss={mockOnDismiss}
        />
      ));

      expect(getByTestId('dismiss-button')).toBeOnTheScreen();
    });

    it('renders both buttons when both callbacks are provided', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
          onDismiss={mockOnDismiss}
        />
      ));

      expect(getByTestId('confirm-button')).toBeOnTheScreen();
      expect(getByTestId('dismiss-button')).toBeOnTheScreen();
    });

    it('does not render buttons when callbacks are not provided', () => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardWarningBox warning={CardWarningBoxType.CloseSpendingLimit} />
      ));

      expect(queryByTestId('confirm-button')).toBeNull();
      expect(queryByTestId('dismiss-button')).toBeNull();
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox
          warning={CardWarningBoxType.CloseSpendingLimit}
          onDismiss={mockOnDismiss}
        />
      ));

      fireEvent.press(getByTestId('dismiss-button'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('renders all warning types with icon and content', () => {
      const allWarningTypes = [
        CardWarningBoxType.CloseSpendingLimit,
        CardWarningBoxType.KYCPending,
      ];

      allWarningTypes.forEach((warning) => {
        const { getByTestId } = renderWithProvider(() => (
          <CardWarningBox warning={warning} />
        ));

        expect(getByTestId('icon')).toBeOnTheScreen();
      });
    });
  });
});
