import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SmartTransactionsEnabledBanner from './SmartTransactionsEnabledBanner';
import useSmartTransactionsEnabled from '../../../../hooks/useSmartTransactionsEnabled/useSmartTransactionsEnabled';

jest.mock('../../../../hooks/useSmartTransactionsEnabled/useSmartTransactionsEnabled');
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('SmartTransactionsEnabledBanner', () => {
  beforeEach(() => {
    (useSmartTransactionsEnabled as jest.Mock).mockReturnValue({
      isEnabled: true,
      isMigrationApplied: true,
    });
  });

  it('renders nothing when STX is not enabled', () => {
    (useSmartTransactionsEnabled as jest.Mock).mockReturnValue({
      isEnabled: false,
      isMigrationApplied: true,
    });

    const { queryByTestId } = render(<SmartTransactionsEnabledBanner />);
    expect(queryByTestId('smart-transactions-enabled-banner')).toBeNull();
  });

  it('renders nothing when migration is not applied', () => {
    (useSmartTransactionsEnabled as jest.Mock).mockReturnValue({
      isEnabled: true,
      isMigrationApplied: false,
    });

    const { queryByTestId } = render(<SmartTransactionsEnabledBanner />);
    expect(queryByTestId('smart-transactions-enabled-banner')).toBeNull();
  });

  it('renders banner when STX is enabled and migration is applied', () => {
    const { getByTestId, getByText } = render(<SmartTransactionsEnabledBanner />);

    expect(getByTestId('smart-transactions-enabled-banner')).toBeDefined();
    expect(getByText('smart_transactions_enabled.title')).toBeDefined();
    expect(getByText('smart_transactions_enabled.link')).toBeDefined();
  });

  it('calls onClose when close button is pressed', () => {
    const onCloseMock = jest.fn();
    const { getByTestId } = render(
      <SmartTransactionsEnabledBanner onClose={onCloseMock} />,
    );

    fireEvent.press(getByTestId('banner-close-button-icon'));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
