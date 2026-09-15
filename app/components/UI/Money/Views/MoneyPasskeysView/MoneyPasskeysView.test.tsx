import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyPasskeysView from './MoneyPasskeysView';
import { MoneyPasskeysViewTestIds } from './MoneyPasskeysView.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockHasPasskey = false;
let mockEntryPoint: 'security' | 'finish_setup' = 'security';
let mockPasskeys = [
  {
    name: 'Passkey #1 - 1Password',
    method: 'one_password',
    createdAt: new Date(2026, 8, 2, 12),
  },
];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { entryPoint: mockEntryPoint },
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    isTaskComplete: () => mockHasPasskey,
    passkeys: mockPasskeys,
  }),
}));

describe('MoneyPasskeysView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPasskey = false;
    mockEntryPoint = 'security';
    mockPasskeys = [
      {
        name: 'Passkey #1 - 1Password',
        method: 'one_password',
        createdAt: new Date(2026, 8, 2, 12),
      },
    ];
  });

  it('shows concise passkey benefits without descriptions', () => {
    const { getByText, queryByText } = renderWithProvider(
      <MoneyPasskeysView />,
    );

    expect(getByText('Protect your account with a passkey')).toBeOnTheScreen();
    expect(
      getByText(
        'Get an extra layer of protection in case you lose your wallet or your login is compromised.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Log in with Face ID')).toBeOnTheScreen();
    expect(getByText('Syncs across devices automatically')).toBeOnTheScreen();
    expect(getByText('Verify Money account transfers')).toBeOnTheScreen();
    expect(queryByText('Use Face ID to unlock and approve.')).toBeNull();
    expect(
      queryByText('Your passkey stays available through your device account.'),
    ).toBeNull();
    expect(queryByText('Confirm transfers with your passkey.')).toBeNull();
  });

  it('opens the passkey creation sheet when Add passkey is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyPasskeysView />);
    fireEvent.press(getByTestId(MoneyPasskeysViewTestIds.ADD_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { returnToMoneyHome: false },
    });
  });

  it('offers authenticator setup only from finish setup', () => {
    const securityView = renderWithProvider(<MoneyPasskeysView />);

    expect(
      securityView.queryByTestId(
        MoneyPasskeysViewTestIds.ADD_AUTHENTICATOR_BUTTON,
      ),
    ).toBeNull();
    securityView.unmount();

    mockEntryPoint = 'finish_setup';
    const { getByTestId } = renderWithProvider(<MoneyPasskeysView />);

    fireEvent.press(
      getByTestId(MoneyPasskeysViewTestIds.ADD_AUTHENTICATOR_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'finish_setup',
    });
  });

  it('shows a folded passkey row after a passkey has been created', () => {
    mockHasPasskey = true;

    const { getByText, getByTestId } = renderWithProvider(
      <MoneyPasskeysView />,
    );

    expect(getByText('Passkey #1 - 1Password')).toBeOnTheScreen();
    expect(getByText('Last used today')).toBeOnTheScreen();
    expect(getByTestId(MoneyPasskeysViewTestIds.ADD_BUTTON)).toBeOnTheScreen();
  });

  it('renders multiple passkeys with their selected methods', () => {
    mockHasPasskey = true;
    mockPasskeys = [
      ...mockPasskeys,
      {
        name: 'Passkey #2 - iCloud Keychain',
        method: 'icloud',
        createdAt: new Date(2026, 8, 3, 12),
      },
    ];

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyPasskeysView />,
    );

    expect(getByText('Passkey #1 - 1Password')).toBeOnTheScreen();
    expect(getByText('Passkey #2 - iCloud Keychain')).toBeOnTheScreen();
  });

  it('opens passkey details from a folded passkey row', () => {
    mockHasPasskey = true;
    const { getByTestId } = renderWithProvider(<MoneyPasskeysView />);

    fireEvent.press(getByTestId(`${MoneyPasskeysViewTestIds.PASSKEY_ROW}-1`));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.PASSKEY_DETAILS, {
      passkeyIndex: 0,
    });
  });
});
