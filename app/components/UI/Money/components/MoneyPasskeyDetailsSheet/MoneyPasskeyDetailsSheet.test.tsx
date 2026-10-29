import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyPasskeyDetailsSheet from './MoneyPasskeyDetailsSheet';
import { MoneyPasskeyDetailsSheetTestIds } from './MoneyPasskeyDetailsSheet.testIds';

const mockRenamePasskey = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockIsSocialLogin = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { passkeyIndex: 0 },
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    passkeys: [
      {
        name: 'Passkey #1 - 1Password',
        method: 'one_password',
        createdAt: new Date(2026, 8, 2, 12),
      },
    ],
    renamePasskey: mockRenamePasskey,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isSocialLogin: mockIsSocialLogin,
  }),
}));

describe('MoneyPasskeyDetailsSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsSocialLogin = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows passkey metadata and renames the passkey', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneyPasskeyDetailsSheet />,
    );

    expect(getByText('Passkey #1 - 1Password')).toBeOnTheScreen();
    expect(queryByText('Passkey details')).not.toBeOnTheScreen();
    expect(queryByText('Details')).not.toBeOnTheScreen();
    expect(getByText('Created')).toBeOnTheScreen();
    expect(getByText('Sep 2, 2026')).toBeOnTheScreen();
    expect(getByText('Last used')).toBeOnTheScreen();
    expect(getByText('Today')).toBeOnTheScreen();
    expect(queryByText('Wallet recovery')).not.toBeOnTheScreen();
    expect(getByText('Verifying Money transactions')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.RENAME_BUTTON));
    expect(
      getByTestId(MoneyPasskeyDetailsSheetTestIds.KEYBOARD),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyPasskeyDetailsSheetTestIds.NAME_INPUT).props.autoFocus,
    ).toBe(true);
    fireEvent.changeText(
      getByTestId(MoneyPasskeyDetailsSheetTestIds.NAME_INPUT),
      'Travel wallet',
    );
    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.SAVE_BUTTON));

    expect(mockRenamePasskey).toHaveBeenCalledWith(0, 'Travel wallet');
  });

  it('shows wallet recovery usage for social-login users', () => {
    mockIsSocialLogin = true;
    const { getByText } = renderWithProvider(<MoneyPasskeyDetailsSheet />);

    expect(getByText('Wallet recovery')).toBeOnTheScreen();
  });

  it('cancels a rename with the back button without saving', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <MoneyPasskeyDetailsSheet />,
    );

    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.RENAME_BUTTON));
    fireEvent.changeText(
      getByTestId(MoneyPasskeyDetailsSheetTestIds.NAME_INPUT),
      'Unsaved name',
    );
    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.BACK_BUTTON));

    expect(
      queryByTestId(MoneyPasskeyDetailsSheetTestIds.NAME_INPUT),
    ).toBeNull();
    expect(getByText('Passkey #1 - 1Password')).toBeOnTheScreen();
    expect(mockRenamePasskey).not.toHaveBeenCalled();
  });

  it('opens the delete confirmation bottom sheet', () => {
    const { getByTestId } = renderWithProvider(<MoneyPasskeyDetailsSheet />);

    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.DELETE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.DELETE_PASSKEY_SHEET,
      params: { passkeyIndex: 0 },
    });
  });
});
