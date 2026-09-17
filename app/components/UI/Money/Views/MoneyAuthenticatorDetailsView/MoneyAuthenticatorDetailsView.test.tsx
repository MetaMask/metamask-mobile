import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyAuthenticatorDetailsView from './MoneyAuthenticatorDetailsView';
import { MoneyAuthenticatorDetailsViewTestIds } from './MoneyAuthenticatorDetailsView.testIds';

const mockNavigate = jest.fn();
let mockIsSocialAdded = true;
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
    authenticatorCreatedAt: new Date(2026, 8, 3, 12),
    isAuthenticatorAdded: true,
    isSocialAdded: mockIsSocialAdded,
    isSocialLogin: mockIsSocialLogin,
  }),
}));

describe('MoneyAuthenticatorDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialAdded = true;
    mockIsSocialLogin = false;
  });

  it('hides wallet recovery for an SRP wallet without linked social login', () => {
    mockIsSocialAdded = false;
    const { getByText, queryByText } = renderWithProvider(
      <MoneyAuthenticatorDetailsView />,
    );

    expect(queryByText('Wallet recovery')).not.toBeOnTheScreen();
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('shows compact metadata and usage details', () => {
    const { getByText, queryByText } = renderWithProvider(
      <MoneyAuthenticatorDetailsView />,
    );

    expect(getByText('Google Authenticator')).toBeOnTheScreen();
    expect(getByText('Added Sep 3, 2026 at 12:00 PM')).toBeOnTheScreen();
    expect(queryByText('Active')).not.toBeOnTheScreen();
    expect(queryByText('Last used')).not.toBeOnTheScreen();
    expect(queryByText('Today')).not.toBeOnTheScreen();
    expect(getByText('Wallet recovery')).toBeOnTheScreen();
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();
  });

  it('opens the remove authenticator confirmation sheet', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyAuthenticatorDetailsView />,
    );

    fireEvent.press(
      getByTestId(MoneyAuthenticatorDetailsViewTestIds.REMOVE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.REMOVE_AUTHENTICATOR_SHEET,
    });
  });
});
