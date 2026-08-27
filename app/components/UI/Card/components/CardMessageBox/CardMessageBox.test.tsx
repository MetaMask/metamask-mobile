import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardMessageBox from './CardMessageBox';
import { CardMessageBoxType } from '../../types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string | number>) => {
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
      'card.card_home.warnings.pending_verification.title':
        'Finish setting up your card',
      'card.card_home.warnings.pending_verification.description':
        'You have pending verification steps to complete before your card can be enabled.',
      'card.card_home.warnings.pending_verification.confirm_button_label':
        'Continue verification',
      'card.card_spending_limit.dismiss': 'Dismiss',
      'card.card_authentication.auth_prompt_info':
        'Log in to your card account to access this feature.',
      'card.cashback_screen.funding_required.title': 'Set up Linea funding',
      'card.cashback_screen.funding_required.description':
        'You need at least one approved funding source on Linea before redeeming cashback.',
      'card.cashback_screen.funding_required.confirm_button_label':
        'Set up funding',
      'card.cashback_screen.money_account_required.title':
        'Set up Money Account',
      'card.cashback_screen.money_account_required.description':
        'You need a linked Money Account before redeeming cashback.',
      'card.cashback_screen.money_account_required.confirm_button_label':
        'Set up Money Account',
      'card.credit_banner.title': 'Refund balance: {{amount}}',
      'card.credit_banner.description':
        'Spend it or move it to your Money account to keep earning on your balance.',
      'card.credit_banner.confirm_button_label': 'Move funds',
    };
    let value = mockStrings[key] || key;
    if (params) {
      Object.entries(params).forEach(([name, replacement]) => {
        value = value.replace(`{{${name}}}`, String(replacement));
      });
    }
    return value;
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
    it('renders warning banner', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CloseSpendingLimit} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
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
    it('renders warning banner', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.KYCPending} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
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

      expect(queryByTestId('confirm-button')).not.toBeOnTheScreen();
    });
  });

  describe('CardProvisioning info', () => {
    it('renders info banner', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
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

      expect(queryByTestId('confirm-button')).not.toBeOnTheScreen();
    });

    it('renders with info variant styling (blue background)', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox messageType={CardMessageBoxType.CardProvisioning} />
      ));

      expect(getByTestId('card-message-box')).toBeOnTheScreen();
    });
  });

  describe('PendingVerification warning', () => {
    it('renders title, description, and continue CTA', () => {
      const { getByText, getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.PendingVerification}
          onConfirm={mockOnConfirm}
        />
      ));

      expect(getByText('Finish setting up your card')).toBeOnTheScreen();
      expect(
        getByText(
          'You have pending verification steps to complete before your card can be enabled.',
        ),
      ).toBeOnTheScreen();
      expect(getByText('Continue verification')).toBeOnTheScreen();

      fireEvent.press(getByTestId('confirm-button'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('CashbackFundingRequired warning', () => {
    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CashbackFundingRequired}
        />
      ));

      expect(getByText('Set up Linea funding')).toBeOnTheScreen();
      expect(
        getByText(
          'You need at least one approved funding source on Linea before redeeming cashback.',
        ),
      ).toBeOnTheScreen();
    });

    it('calls onConfirm when the funding setup button is pressed', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CashbackFundingRequired}
          onConfirm={mockOnConfirm}
        />
      ));

      fireEvent.press(getByText('Set up funding'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('CashbackMoneyAccountRequired warning', () => {
    it('renders title and description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CashbackMoneyAccountRequired}
        />
      ));

      expect(getByText('Set up Money Account')).toBeOnTheScreen();
      expect(
        getByText('You need a linked Money Account before redeeming cashback.'),
      ).toBeOnTheScreen();
    });

    it('calls onConfirm when the Money Account setup button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CashbackMoneyAccountRequired}
          onConfirm={mockOnConfirm}
        />
      ));

      fireEvent.press(getByTestId('confirm-button'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('CreditAvailable info', () => {
    it('interpolates the amount into the title and renders the description', () => {
      const { getByText } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CreditAvailable}
          values={{ amount: '$10.86' }}
        />
      ));

      expect(getByText('Refund balance: $10.86')).toBeOnTheScreen();
      expect(
        getByText(
          'Spend it or move it to your Money account to keep earning on your balance.',
        ),
      ).toBeOnTheScreen();
    });

    it('calls onConfirm when the Move funds button is pressed', () => {
      const { getByTestId } = renderWithProvider(() => (
        <CardMessageBox
          messageType={CardMessageBoxType.CreditAvailable}
          values={{ amount: '$10.86' }}
          onConfirm={mockOnConfirm}
        />
      ));

      fireEvent.press(getByTestId('confirm-button'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
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

      expect(queryByTestId('confirm-button')).not.toBeOnTheScreen();
      expect(queryByTestId('dismiss-button')).not.toBeOnTheScreen();
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

    it('renders all message types as banners', () => {
      const allMessageTypes = [
        CardMessageBoxType.CloseSpendingLimit,
        CardMessageBoxType.KYCPending,
        CardMessageBoxType.CardProvisioning,
        CardMessageBoxType.AuthPrompt,
        CardMessageBoxType.CashbackFundingRequired,
        CardMessageBoxType.CashbackMoneyAccountRequired,
      ];

      allMessageTypes.forEach((messageType) => {
        const { getByTestId } = renderWithProvider(() => (
          <CardMessageBox messageType={messageType} />
        ));

        expect(getByTestId('card-message-box')).toBeOnTheScreen();
      });
    });
  });
});
