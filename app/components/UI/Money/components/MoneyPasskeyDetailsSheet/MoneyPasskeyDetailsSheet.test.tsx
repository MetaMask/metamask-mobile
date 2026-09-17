import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyPasskeyDetailsSheet from './MoneyPasskeyDetailsSheet';
import { MoneyPasskeyDetailsSheetTestIds } from './MoneyPasskeyDetailsSheet.testIds';

const mockRenamePasskey = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

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

describe('MoneyPasskeyDetailsSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows passkey metadata and renames the passkey', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneyPasskeyDetailsSheet />,
    );

    expect(getByText('Passkey #1 - 1Password')).toBeOnTheScreen();
    expect(getByText('Added Sep 2, 2026 at 12:00 PM')).toBeOnTheScreen();
    expect(queryByText('Last used')).not.toBeOnTheScreen();
    expect(queryByText('Today')).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.RENAME_BUTTON));
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

  it('opens the delete confirmation bottom sheet', () => {
    const { getByTestId } = renderWithProvider(<MoneyPasskeyDetailsSheet />);

    fireEvent.press(getByTestId(MoneyPasskeyDetailsSheetTestIds.DELETE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.DELETE_PASSKEY_SHEET,
      params: { passkeyIndex: 0 },
    });
  });
});
