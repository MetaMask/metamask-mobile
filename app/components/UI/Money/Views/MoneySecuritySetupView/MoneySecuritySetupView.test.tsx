import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySecuritySetupView from './MoneySecuritySetupView';
import { MoneySecuritySetupViewTestIds } from './MoneySecuritySetupView.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockPasskeyCount = 0;
let mockIsAuthenticatorAdded = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    passkeyCount: mockPasskeyCount,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isAuthenticatorAdded: mockIsAuthenticatorAdded,
  }),
}));

describe('MoneySecuritySetupView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPasskeyCount = 0;
    mockIsAuthenticatorAdded = false;
  });

  it('matches the 2-step verification setup content', () => {
    const { getByText } = renderWithProvider(<MoneySecuritySetupView />);

    expect(getByText('Set up 2-step verification')).toBeOnTheScreen();
    expect(
      getByText(
        "We'll set up a few ways to confirm it’s you. If you lose access to one method, you can use another.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Passkey')).toBeOnTheScreen();
    expect(
      getByText('Confirm with your device or password manager'),
    ).toBeOnTheScreen();
    expect(getByText('Authenticator app')).toBeOnTheScreen();
    expect(
      getByText('Use a 6-digit code from your authenticator app'),
    ).toBeOnTheScreen();
    expect(getByText('Get started')).toBeOnTheScreen();
  });

  it('opens the Add passkey sheet when Get started is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneySecuritySetupView />);

    fireEvent.press(
      getByTestId(MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { continueToAuthenticatorSetup: true },
    });
  });

  it('returns to Money when the back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneySecuritySetupView />);

    fireEvent.press(getByTestId(MoneySecuritySetupViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows completed passkey and authenticator details', () => {
    mockPasskeyCount = 1;
    mockIsAuthenticatorAdded = true;
    const { getByText } = renderWithProvider(<MoneySecuritySetupView />);

    expect(getByText('Saved to this device')).toBeOnTheScreen();
    expect(getByText('Added to this account')).toBeOnTheScreen();
  });

  it('continues to authenticator setup when a passkey is already added', () => {
    mockPasskeyCount = 1;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecuritySetupView />,
    );

    expect(getByText('Continue')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'protect_money',
    });
  });
});
