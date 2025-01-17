import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SmartTransactionsMigrationBanner from './SmartTransactionsMigrationBanner';
import useSmartTransactionsEnabled from '../../../../hooks/useSmartTransactionsEnabled/useSmartTransactionsEnabled';

jest.mock('../../../../hooks/useSmartTransactionsEnabled/useSmartTransactionsEnabled');
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

describe('SmartTransactionsMigrationBanner', () => {
  const mockDismissBanner = jest.fn();

  beforeEach(() => {
    (useSmartTransactionsEnabled as jest.Mock).mockReturnValue({
      shouldShowBanner: true,
      dismissBanner: mockDismissBanner,
    });
    mockDismissBanner.mockClear();
  });

  it('renders nothing when shouldShowBanner is false', () => {
    (useSmartTransactionsEnabled as jest.Mock).mockReturnValue({
      shouldShowBanner: false,
      dismissBanner: mockDismissBanner,
    });

    const { queryByTestId } = render(<SmartTransactionsMigrationBanner />);
    expect(queryByTestId('smart-transactions-enabled-banner')).toBeNull();
  });

  it('renders banner when shouldShowBanner is true', () => {
    const { getByTestId, getByText } = render(<SmartTransactionsMigrationBanner />);

    expect(getByTestId('smart-transactions-enabled-banner')).toBeDefined();
    expect(getByText('smart_transactions_enabled.title')).toBeDefined();
    expect(getByText('smart_transactions_enabled.link')).toBeDefined();
  });

  it('calls dismissBanner when close button is pressed', () => {
    const { getByTestId } = render(<SmartTransactionsMigrationBanner />);

    fireEvent.press(getByTestId('banner-close-button-icon'));
    expect(mockDismissBanner).toHaveBeenCalled();
  });

  it('accepts and applies custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <SmartTransactionsMigrationBanner style={customStyle} />,
    );

    const banner = getByTestId('smart-transactions-enabled-banner');
    expect(banner.props.style).toMatchObject(expect.objectContaining(customStyle));
  });
});
