import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySecurityVerificationView from './MoneySecurityVerificationView';
import { MoneySecurityVerificationViewTestIds } from './MoneySecurityVerificationView.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDeletePasskey = jest.fn();
const mockRemoveAuthenticator = jest.fn();
const mockRemoveSms = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
const mockShowSuccessToast = jest.fn();

let mockAction: MoneySecurityVerificationAction = {
  type: 'disable-transaction-verification',
};
let mockPasskeyCount = 1;
let mockIsAuthenticatorAdded = true;
let mockIsSmsAdded = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({ params: { action: mockAction } }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    deletePasskey: mockDeletePasskey,
    passkeyCount: mockPasskeyCount,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isAuthenticatorAdded: mockIsAuthenticatorAdded,
    isSmsAdded: mockIsSmsAdded,
    removeAuthenticator: mockRemoveAuthenticator,
    removeSms: mockRemoveSms,
    setTransactionVerificationEnabled: mockSetTransactionVerificationEnabled,
  }),
}));

jest.mock('../../hooks/useMoneySecurityToast', () => ({
  useMoneySecurityToast: () => mockShowSuccessToast,
}));

describe('MoneySecurityVerificationView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAction = { type: 'disable-transaction-verification' };
    mockPasskeyCount = 1;
    mockIsAuthenticatorAdded = true;
    mockIsSmsAdded = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('verifies with a remaining passkey before removing authenticator', () => {
    mockAction = { type: 'remove-authenticator' };
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationView />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationViewTestIds.PASSKEY_VERIFY_BUTTON),
    );
    act(() => jest.advanceTimersByTime(700));

    expect(mockRemoveAuthenticator).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Authenticator app removed',
    });
  });

  it('verifies with authenticator before disabling transaction verification', () => {
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationView />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationViewTestIds.AUTHENTICATOR_METHOD),
    );
    fireEvent.changeText(
      getByTestId(MoneySecurityVerificationViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY);
  });

  it('uses an authenticator code before deleting the last passkey', () => {
    mockAction = { type: 'delete-passkey', passkeyIndex: 0 };
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneySecurityVerificationViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(mockDeletePasskey).toHaveBeenCalledWith(0);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.PASSKEYS, {
      entryPoint: 'security',
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Passkey deleted');
  });

  it('rejects the demo invalid code', () => {
    mockPasskeyCount = 0;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneySecurityVerificationViewTestIds.CODE_INPUT),
      '000000',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(getByText('This code is not correct. Try again.')).toBeOnTheScreen();
    expect(mockSetTransactionVerificationEnabled).not.toHaveBeenCalled();
  });
});
