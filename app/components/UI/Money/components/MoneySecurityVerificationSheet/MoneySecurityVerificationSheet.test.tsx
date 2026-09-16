import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySecurityVerificationSheet from './MoneySecurityVerificationSheet';
import { MoneySecurityVerificationSheetTestIds } from './MoneySecurityVerificationSheet.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';

const mockNavigate = jest.fn();
const mockDeletePasskey = jest.fn();
const mockRemoveAuthenticator = jest.fn();
const mockRemoveSms = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
const mockShowSuccessToast = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

let mockAction: MoneySecurityVerificationAction = {
  type: 'disable-transaction-verification',
};
let mockPasskeyCount = 1;
let mockIsAuthenticatorAdded = true;
let mockIsSmsAdded = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
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

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

describe('MoneySecurityVerificationSheet', () => {
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

  it('verifies in a bottom sheet with a remaining passkey', () => {
    mockAction = { type: 'remove-authenticator' };
    const { getByTestId, queryByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByText('Choose a security method to continue.'),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON),
    );
    act(() => jest.advanceTimersByTime(700));

    expect(mockRemoveAuthenticator).toHaveBeenCalledTimes(1);
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Authenticator app removed',
    });
  });

  it('opens full-page authenticator verification from the sheet', () => {
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD),
    );
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'security',
      initialStep: 'verify',
      verificationAction: {
        type: 'disable-transaction-verification',
      },
    });
  });

  it('opens authenticator verification before deleting the last passkey', () => {
    mockAction = { type: 'delete-passkey', passkeyIndex: 0 };
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'security',
      initialStep: 'verify',
      verificationAction: {
        type: 'delete-passkey',
        passkeyIndex: 0,
      },
    });
  });

  it('rejects the demo invalid code', () => {
    mockPasskeyCount = 0;
    mockIsAuthenticatorAdded = false;
    mockIsSmsAdded = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.changeText(
      getByTestId(MoneySecurityVerificationSheetTestIds.CODE_INPUT),
      '000000',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(getByText('This code is not correct. Try again.')).toBeOnTheScreen();
    expect(mockSetTransactionVerificationEnabled).not.toHaveBeenCalled();
  });
});
