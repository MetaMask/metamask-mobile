import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardWarningBox from './CardWarningBox';
import { CardWarning } from '../../types';
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
      'card.card_home.warnings.need_delegation.title': 'Delegation Required',
      'card.card_home.warnings.need_delegation.description':
        'You need to delegate tokens to proceed.',
      'card.card_home.warnings.need_delegation.confirm_button_label':
        'Delegate Now',
      'card.card_home.warnings.frozen.title': 'Card Frozen',
      'card.card_home.warnings.frozen.description':
        'Your card has been frozen. Contact support for assistance.',
      'card.card_home.warnings.blocked.title': 'Card Blocked',
      'card.card_home.warnings.blocked.description':
        'Your card has been blocked. Contact support for assistance.',
      'card.card_home.warnings.no_card.title': 'No Card Available',
      'card.card_home.warnings.no_card.description':
        'You do not have a card yet. Order one to get started.',
      'card.card_home.warnings.dismiss_button_label': 'Dismiss',
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

  it('renders warning icon for visible warnings', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.CloseSpendingLimit} />
    ));

    expect(getByTestId('icon')).toBeOnTheScreen();
  });

  it('does not render warning box for NoCard warning', () => {
    const { queryByTestId } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.NoCard} />
    ));

    expect(queryByTestId('icon')).toBeNull();
  });

  it('does not render warning box for NeedDelegation warning', () => {
    const { queryByTestId } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.NeedDelegation} />
    ));

    expect(queryByTestId('icon')).toBeNull();
  });

  it('renders CloseSpendingLimit warning with title and description', () => {
    const { getByText } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.CloseSpendingLimit} />
    ));

    expect(getByText('Close Spending Limit')).toBeOnTheScreen();
    expect(
      getByText(
        'You are approaching your spending limit. Consider closing it.',
      ),
    ).toBeOnTheScreen();
  });

  it('renders Frozen warning with title and description', () => {
    const { getByText } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.Frozen} />
    ));

    expect(getByText('Card Frozen')).toBeOnTheScreen();
    expect(
      getByText('Your card has been frozen. Contact support for assistance.'),
    ).toBeOnTheScreen();
  });

  it('renders Blocked warning with title and description', () => {
    const { getByText } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.Blocked} />
    ));

    expect(getByText('Card Blocked')).toBeOnTheScreen();
    expect(
      getByText('Your card has been blocked. Contact support for assistance.'),
    ).toBeOnTheScreen();
  });

  it('renders confirm button when onConfirm is provided', () => {
    const { getByText } = renderWithProvider(() => (
      <CardWarningBox
        warning={CardWarning.CloseSpendingLimit}
        onConfirm={mockOnConfirm}
      />
    ));

    expect(getByText('Close Limit')).toBeOnTheScreen();
  });

  it('renders dismiss button when onDismiss is provided', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardWarningBox
        warning={CardWarning.CloseSpendingLimit}
        onDismiss={mockOnDismiss}
      />
    ));

    expect(getByTestId('dismiss-button')).toBeOnTheScreen();
  });

  it('renders both buttons when both callbacks are provided', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardWarningBox
        warning={CardWarning.CloseSpendingLimit}
        onConfirm={mockOnConfirm}
        onDismiss={mockOnDismiss}
      />
    ));

    expect(getByTestId('confirm-button')).toBeOnTheScreen();
    expect(getByTestId('dismiss-button')).toBeOnTheScreen();
  });

  it('does not render buttons when callbacks are not provided', () => {
    const { queryByTestId } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.CloseSpendingLimit} />
    ));

    expect(queryByTestId('confirm-button')).toBeNull();
    expect(queryByTestId('dismiss-button')).toBeNull();
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardWarningBox
        warning={CardWarning.CloseSpendingLimit}
        onConfirm={mockOnConfirm}
      />
    ));

    fireEvent.press(getByTestId('confirm-button'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardWarningBox
        warning={CardWarning.CloseSpendingLimit}
        onDismiss={mockOnDismiss}
      />
    ));

    fireEvent.press(getByTestId('dismiss-button'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on confirm button when onConfirmLoading is true', () => {
    const { getByTestId } = renderWithProvider(() => (
      <CardWarningBox
        warning={CardWarning.CloseSpendingLimit}
        onConfirm={mockOnConfirm}
        onConfirmLoading
      />
    ));

    const confirmButton = getByTestId('confirm-button');
    expect(confirmButton).toBeOnTheScreen();
  });

  it('renders visible warnings with icon and content', () => {
    const visibleWarnings = [
      CardWarning.CloseSpendingLimit,
      CardWarning.Frozen,
      CardWarning.Blocked,
    ];

    visibleWarnings.forEach((warning) => {
      const { getByTestId } = renderWithProvider(() => (
        <CardWarningBox warning={warning} />
      ));

      expect(getByTestId('icon')).toBeOnTheScreen();
    });
  });

  it('does not render warning box content for NoCard and NeedDelegation types', () => {
    const hiddenWarnings = [CardWarning.NoCard, CardWarning.NeedDelegation];

    hiddenWarnings.forEach((warning) => {
      const { queryByTestId } = renderWithProvider(() => (
        <CardWarningBox warning={warning} />
      ));

      expect(queryByTestId('icon')).toBeNull();
    });
  });

  it('does not render confirm button for Frozen warning when onConfirm provided', () => {
    const { queryByTestId } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.Frozen} onConfirm={mockOnConfirm} />
    ));

    expect(queryByTestId('confirm-button')).toBeNull();
  });

  it('does not render confirm button for Blocked warning when onConfirm provided', () => {
    const { queryByTestId } = renderWithProvider(() => (
      <CardWarningBox warning={CardWarning.Blocked} onConfirm={mockOnConfirm} />
    ));

    expect(queryByTestId('confirm-button')).toBeNull();
  });
});
