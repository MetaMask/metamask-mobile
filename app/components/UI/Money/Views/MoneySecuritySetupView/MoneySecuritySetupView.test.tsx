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

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));
jest.mock(
  '../../../../../fonts/GrotzecCond-Bold.otf',
  () => 'GrotzecCond-Bold',
);
jest.mock('rive-react-native', () =>
  jest.requireActual('../../../../../__mocks__/rive-react-native'),
);

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

  it('shows benefits before the required methods', () => {
    const { getByText, queryByText, getByTestId } = renderWithProvider(
      <MoneySecuritySetupView />,
    );

    expect(getByText('Protect your\nMoney account')).toBeOnTheScreen();
    expect(
      getByText(
        'Confirm it’s you before money moves, adding protection even if your password or recovery phrase is compromised.',
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Passkey')).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON),
    );

    expect(getByText('Set up 2-step verification')).toBeOnTheScreen();
    expect(
      getByText(
        'Use two methods to confirm it’s you, so you have a backup if one isn’t available.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Passkey')).toBeOnTheScreen();
    expect(getByText('Use your face or fingerprint.')).toBeOnTheScreen();
    expect(getByText('Authenticator app')).toBeOnTheScreen();
    expect(
      getByText('Get codes from an app like Google Authenticator.'),
    ).toBeOnTheScreen();
    expect(getByText('Get started')).toBeOnTheScreen();
  });

  it('opens the Add passkey sheet when Get started is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneySecuritySetupView />);

    fireEvent.press(
      getByTestId(MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON),
    );
    fireEvent.press(
      getByTestId(MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { continueToAuthenticatorSetup: true },
    });
  });

  it('returns to Money from a resumed methods step', () => {
    mockPasskeyCount = 1;
    const { getByTestId } = renderWithProvider(<MoneySecuritySetupView />);

    fireEvent.press(getByTestId(MoneySecuritySetupViewTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('returns to Money when Not now is pressed on the splash', () => {
    const { getByTestId } = renderWithProvider(<MoneySecuritySetupView />);

    fireEvent.press(getByTestId(MoneySecuritySetupViewTestIds.NOT_NOW_BUTTON));

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
