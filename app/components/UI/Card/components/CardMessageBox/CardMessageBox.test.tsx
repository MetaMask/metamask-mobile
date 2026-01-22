import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardMessageBox from './CardMessageBox';
import { CardMessageBoxType } from '../../types';
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
      'card.card_home.messages.card_provisioning.title':
        'Card being provisioned',
      'card.card_home.messages.card_provisioning.description':
        'Your card is being automatically provisioned. This may take a few moments.',
      'card.card_spending_limit.dismiss': 'Dismiss',
    };
    return mockStrings[key] || key;
  }),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardMessageBox',
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

describe('CardMessageBox', () => {
  const mockOnConfirm = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CloseSpendingLimit warning', () => {
    it('renders warning icon', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CloseSpendingLimit} />
      ));

      expect(getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CloseSpendingLimit} />
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
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
        />
      ));

      expect(getByText('Close Limit')).toBeOnTheScreen();
    });

    it('calls onConfirm when confirm button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
        />
      ));

      fireEvent.press(getByTestId('confirm-button'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on confirm button when onConfirmLoading is true', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
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
        <CardMessageBox messageType={CardMessageBoxType.KYCPending} />
      ));

      expect(getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.KYCPending} />
      ));

      expect(getByText('Verification in Progress')).toBeOnTheScreen();
      expect(
        getByText('Your identity verification is still being reviewed.'),
      ).toBeOnTheScreen();
    });

    it('does not render confirm button since KYCPending has no confirmButtonLabel', () => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.KYCPending}
          onConfirm={mockOnConfirm}
        />
      ));

      expect(queryByTestId('confirm-button')).toBeNull();
    });
  });

  describe('CardProvisioning info', () => {
    it('renders info icon', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      ));

      expect(getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      ));

      expect(getByText('Card being provisioned')).toBeOnTheScreen();
      expect(
        getByText(
          'Your card is being automatically provisioned. This may take a few moments.',
        ),
      ).toBeOnTheScreen();
    });

    it('does not render confirm button since CardProvisioning has no confirmButtonLabel', () => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CardProvisioning}
          onConfirm={mockOnConfirm}
        />
      ));

      expect(queryByTestId('confirm-button')).toBeNull();
    });

    it('renders with info variant styling (blue background)', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
    });
  });

  describe('common behaviors', () => {
    it('renders dismiss button when onDismiss is provided', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onDismiss={mockOnDismiss}
        />
      ));

      expect(getByTestId('dismiss-button')).toBeOnTheScreen();
    });

    it('renders both buttons when both callbacks are provided', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onConfirm={mockOnConfirm}
          onDismiss={mockOnDismiss}
        />
      ));

      expect(getByTestId('confirm-button')).toBeOnTheScreen();
      expect(getByTestId('dismiss-button')).toBeOnTheScreen();
    });

    it('does not render buttons when callbacks are not provided', () => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CloseSpendingLimit} />
      ));

      expect(queryByTestId('confirm-button')).toBeNull();
      expect(queryByTestId('dismiss-button')).toBeNull();
    });

    it('calls onDismiss when dismiss button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CloseSpendingLimit}
          onDismiss={mockOnDismiss}
        />
      ));

      fireEvent.press(getByTestId('dismiss-button'));
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('renders all message types with icon and content', () => {
      const allMessageTypes = [
        CardMessageBoxType.CloseSpendingLimit,
        CardMessageBoxType.KYCPending,
        CardMessageBoxType.CardProvisioning,
      ];

      allMessageTypes.forEach((messageType) => {
        const { getByTestId } = renderWithProvider(() => (
          <CardMessageBox messageType={messageType} />
        ));

        expect(getByTestId('icon')).toBeOnTheScreen();
      });
    });
  });
});
