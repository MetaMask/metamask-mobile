import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySmsDetailsView from './MoneySmsDetailsView';
import { MoneySmsDetailsViewTestIds } from './MoneySmsDetailsView.testIds';

const mockNavigate = jest.fn();
let mockIsSocialLogin = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isSmsAdded: true,
    isSocialLogin: mockIsSocialLogin,
    smsCreatedAt: new Date(2026, 8, 8, 12),
    smsPhoneNumber: '+14155550123',
  }),
}));

describe('MoneySmsDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialLogin = false;
  });

  it('shows the phone, metadata, and usages', () => {
    const { getByText, queryByText } = renderWithProvider(
      <MoneySmsDetailsView />,
    );

    expect(getByText('+1 ••• ••• 0123')).toBeOnTheScreen();
    expect(queryByText('Verified phone number')).not.toBeOnTheScreen();
    expect(getByText('Created')).toBeOnTheScreen();
    expect(getByText('Sep 8, 2026')).toBeOnTheScreen();
    expect(queryByText('Last used')).not.toBeOnTheScreen();
    expect(queryByText('Today')).not.toBeOnTheScreen();
    expect(queryByText('Wallet recovery')).not.toBeOnTheScreen();
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('shows wallet recovery usage for social-login users', () => {
    mockIsSocialLogin = true;
    const { getByText } = renderWithProvider(<MoneySmsDetailsView />);

    expect(getByText('Wallet recovery')).toBeOnTheScreen();
  });

  it('opens the remove SMS confirmation sheet', () => {
    const { getByTestId } = renderWithProvider(<MoneySmsDetailsView />);

    fireEvent.press(getByTestId(MoneySmsDetailsViewTestIds.REMOVE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.REMOVE_SMS_SHEET,
    });
  });
});
