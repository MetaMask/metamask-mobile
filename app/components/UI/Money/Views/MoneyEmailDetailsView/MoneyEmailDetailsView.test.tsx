import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyEmailDetailsView from './MoneyEmailDetailsView';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockIsSocialLogin = true;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    emailCreatedAt: new Date('2026-09-17T11:23:00'),
    isEmailVerified: true,
    moneyEmail: 'account1@gmail.com',
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isSocialLogin: mockIsSocialLogin,
  }),
}));

describe('MoneyEmailDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialLogin = true;
  });

  it('shows synchronized email details and social-login usage', () => {
    const { getByText, queryByText } = renderWithProvider(
      <MoneyEmailDetailsView />,
    );

    expect(queryByText('Email')).not.toBeOnTheScreen();
    expect(getByText('account1@gmail.com')).toBeOnTheScreen();
    expect(getByText('Created')).toBeOnTheScreen();
    expect(getByText('Sep 17, 2026')).toBeOnTheScreen();
    expect(queryByText('Last used')).not.toBeOnTheScreen();
    expect(getByText('Wallet recovery')).toBeOnTheScreen();
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('omits wallet recovery for SRP users', () => {
    mockIsSocialLogin = false;
    const { queryByText } = renderWithProvider(<MoneyEmailDetailsView />);

    expect(queryByText('Wallet recovery')).not.toBeOnTheScreen();
  });

  it('opens the remove-email confirmation', () => {
    const { getByTestId } = renderWithProvider(<MoneyEmailDetailsView />);

    fireEvent.press(getByTestId('money-email-details-remove-button'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.REMOVE_EMAIL_SHEET,
    });
  });
});
