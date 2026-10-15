import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySecurityVerificationSheet from './MoneySecurityVerificationSheet';
import { MoneySecurityVerificationSheetTestIds } from './MoneySecurityVerificationSheet.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockParentGoBack = jest.fn();
const mockParentReset = jest.fn();
const mockDeletePasskey = jest.fn();
const mockRemoveEmail = jest.fn();
const mockRemoveAuthenticator = jest.fn();
const mockRemoveSms = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
const mockShowSuccessToast = jest.fn();
const mockCompletePrototypeMoneySend = jest.fn();
const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());

let mockAction: MoneySecurityVerificationAction = {
  type: 'disable-transaction-verification',
};
let mockPasskeyCount = 1;
let mockIsEmailVerified = false;
let mockMoneyEmail = 'alex@example.com';
let mockIsAuthenticatorAdded = true;
let mockIsSmsAdded = false;
let mockShowMethodChooser = false;
let mockDefaultVerificationMethod: 'passkeys' | 'authenticator' | 'sms' =
  'passkeys';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    getParent: () => ({
      goBack: mockParentGoBack,
      navigate: mockNavigate,
      reset: mockParentReset,
    }),
    goBack: mockGoBack,
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
  useRoute: () => ({
    params: {
      action: mockAction,
      showMethodChooser: mockShowMethodChooser,
    },
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    deletePasskey: mockDeletePasskey,
    isEmailVerified: mockIsEmailVerified,
    moneyEmail: mockMoneyEmail,
    passkeyCount: mockPasskeyCount,
    passkeys: [{ method: 'passwords' }],
    removeEmail: mockRemoveEmail,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    isAuthenticatorAdded: mockIsAuthenticatorAdded,
    isSmsAdded: mockIsSmsAdded,
    defaultVerificationMethod: mockDefaultVerificationMethod,
    removeAuthenticator: mockRemoveAuthenticator,
    removeSms: mockRemoveSms,
    setTransactionVerificationEnabled: mockSetTransactionVerificationEnabled,
  }),
}));

jest.mock('../../hooks/useMoneySecurityToast', () => ({
  useMoneySecurityToast: () => mockShowSuccessToast,
}));

jest.mock('../../utils/completePrototypeMoneySend', () => ({
  completePrototypeMoneySend: (...args: unknown[]) =>
    mockCompletePrototypeMoneySend(...args),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        {
          children,
          goBack,
          testID,
        }: {
          children: React.ReactNode;
          goBack?: () => void;
          testID?: string;
        },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return (
          <View testID={testID}>
            {children}
            {goBack && (
              <Pressable testID="mock-sheet-dismiss" onPress={goBack} />
            )}
          </View>
        );
      },
    ),
    BottomSheetHeader: ({
      children,
      onBack,
      onClose,
    }: {
      children: React.ReactNode;
      onBack?: () => void;
      onClose?: () => void;
    }) => (
      <View>
        {children}
        {onBack && <Pressable testID="mock-header-back" onPress={onBack} />}
        {onClose && <Pressable testID="mock-header-close" onPress={onClose} />}
      </View>
    ),
  };
});

describe('MoneySecurityVerificationSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAction = { type: 'disable-transaction-verification' };
    mockPasskeyCount = 1;
    mockIsEmailVerified = false;
    mockMoneyEmail = 'alex@example.com';
    mockIsAuthenticatorAdded = true;
    mockIsSmsAdded = false;
    mockShowMethodChooser = false;
    mockDefaultVerificationMethod = 'passkeys';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('verifies in a bottom sheet with a remaining passkey', () => {
    mockAction = { type: 'remove-authenticator' };
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByText('Choose a security method to continue.'),
    ).not.toBeOnTheScreen();
    expect(getByText('Signing in')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(1200));
    expect(getByText('Done')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(900));

    expect(mockRemoveAuthenticator).toHaveBeenCalledTimes(1);
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Authenticator app removed',
    });
  });

  it('uses the updated verification chooser when removing an authenticator app', () => {
    mockAction = { type: 'remove-authenticator' };
    mockIsEmailVerified = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('Confirm with 2-step verification')).toBeOnTheScreen();
    expect(getByText('Verify with passkey')).toBeOnTheScreen();
    expect(getByText('Get a verification code')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.EMAIL_METHOD),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          name: Routes.MONEY.EMAIL_CODE_VERIFICATION,
          params: {
            email: 'alex@example.com',
            verificationAction: { type: 'remove-authenticator' },
          },
        }),
      }),
    );
  });

  it('uses the updated verification chooser with SMS when email is unavailable', () => {
    mockAction = { type: 'remove-authenticator' };
    mockIsSmsAdded = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('Confirm with 2-step verification')).toBeOnTheScreen();
    expect(getByText('Verify with passkey')).toBeOnTheScreen();
    expect(getByText('Get a verification code')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.EMAIL_METHOD),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SMS_SETUP, {
      initialStep: 'verify',
      verificationAction: { type: 'remove-authenticator' },
    });
  });

  it('removes email after passkey verification', () => {
    mockAction = { type: 'remove-email' };
    mockIsEmailVerified = true;
    mockIsAuthenticatorAdded = false;
    renderWithProvider(<MoneySecurityVerificationSheet />);

    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));

    expect(mockRemoveEmail).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Email removed',
    });
  });

  it('returns to Money with a toast after disabling from More', () => {
    mockAction = {
      type: 'disable-transaction-verification',
      returnToMoneyHome: true,
    };
    mockIsAuthenticatorAdded = false;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));
    act(() => jest.advanceTimersByTime(300));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      '2-step verification is off',
    );
  });

  it('stays on the existing Settings page after disabling', () => {
    mockAction = {
      type: 'disable-transaction-verification',
      returnToPrevious: true,
    };
    mockIsAuthenticatorAdded = false;
    renderWithProvider(<MoneySecurityVerificationSheet />);

    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));
    act(() => jest.advanceTimersByTime(300));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      '2-step verification is off',
    );
  });

  it('enables verification after confirming with the registered email', () => {
    mockAction = { type: 'enable-transaction-verification' };
    mockPasskeyCount = 0;
    mockIsEmailVerified = true;
    mockIsAuthenticatorAdded = false;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.changeText(
      getByTestId(MoneySecurityVerificationSheetTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(1000));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      '2-step verification is on',
    );
  });

  it('opens full-page authenticator verification from the updated chooser', () => {
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.EMAIL_METHOD),
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

  it('immediately opens authenticator verification when it is the only method', () => {
    mockAction = { type: 'delete-passkey', passkeyIndex: 0 };
    renderWithProvider(<MoneySecurityVerificationSheet />);

    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'security',
      initialStep: 'verify',
      verificationAction: {
        type: 'delete-passkey',
        passkeyIndex: 0,
      },
    });
  });

  it('completes a prototype transaction after passkey verification', () => {
    mockAction = { type: 'verify-transaction' };
    mockIsAuthenticatorAdded = false;
    const { getByTestId, queryByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));
    expect(
      queryByTestId(MoneySecurityVerificationSheetTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(50));

    expect(mockCompletePrototypeMoneySend).toHaveBeenCalledWith(
      expect.objectContaining({ reset: mockParentReset }),
      mockShowSuccessToast,
    );
    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockCloseBottomSheet).not.toHaveBeenCalled();
  });

  it('shows the transaction verification design', () => {
    mockAction = { type: 'verify-transaction', amountFiat: '42.5' };
    mockIsEmailVerified = true;
    mockIsSmsAdded = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('Confirm with 2-step verification')).toBeOnTheScreen();
    expect(
      getByText('Verify it’s you to send $42.50 to Account A.'),
    ).toBeOnTheScreen();
    expect(getByText('Verify with passkey')).toBeOnTheScreen();
    expect(getByText('Get a verification code')).toBeOnTheScreen();
    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('opens passkey verification from the new design', () => {
    mockAction = { type: 'verify-transaction' };
    mockIsEmailVerified = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON),
    );

    expect(getByText('Sign in')).toBeOnTheScreen();
    expect(
      getByText(
        'Sign in to “MetaMask” with your passkey for “a••••@example.com” saved in “Passwords”?',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Signing in')).toBeOnTheScreen();
  });

  it('shows the new design when turning on 2-step verification', () => {
    mockAction = { type: 'enable-transaction-verification' };
    mockIsEmailVerified = true;
    const { getByText, queryByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('Confirm with 2-step verification')).toBeOnTheScreen();
    expect(getByText('Verify with passkey')).toBeOnTheScreen();
    expect(getByText('Get a verification code')).toBeOnTheScreen();
    expect(
      queryByText('Verify it’s you to send $20.00 to Account A.'),
    ).not.toBeOnTheScreen();
  });

  it('stays on the previous Settings screen after passkey verification', () => {
    mockAction = {
      type: 'enable-transaction-verification',
      returnToPrevious: true,
    };
    mockIsEmailVerified = true;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON),
    );
    act(() => jest.advanceTimersByTime(1200));
    act(() => jest.advanceTimersByTime(900));
    act(() => jest.advanceTimersByTime(300));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(true);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      '2-step verification is on',
    );
  });

  it('shows the new design when turning off 2-step verification', () => {
    mockAction = { type: 'disable-transaction-verification' };
    mockIsEmailVerified = true;
    const { getByText, queryByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('Confirm with 2-step verification')).toBeOnTheScreen();
    expect(getByText('Verify with passkey')).toBeOnTheScreen();
    expect(getByText('Get a verification code')).toBeOnTheScreen();
    expect(
      queryByText('Verify it’s you to send $20.00 to Account A.'),
    ).not.toBeOnTheScreen();
  });

  it('opens email verification when getting a verification code', () => {
    mockAction = { type: 'verify-transaction' };
    mockIsEmailVerified = true;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.EMAIL_METHOD),
    );

    expect(mockCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockParentReset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        {
          name: Routes.HOME_TABS,
          params: {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          },
        },
        {
          name: Routes.MONEY.EMAIL_CODE_VERIFICATION,
          params: {
            email: 'alex@example.com',
            verificationAction: { type: 'verify-transaction' },
          },
        },
      ],
    });
  });

  it('shows all configured methods in the fallback chooser', () => {
    mockAction = { type: 'verify-transaction' };
    mockPasskeyCount = 0;
    mockIsSmsAdded = true;
    mockShowMethodChooser = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('or')).toBeOnTheScreen();
    expect(getByText('Authenticator app')).toBeOnTheScreen();
    expect(getByText('SMS')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'security',
      initialStep: 'verify',
      verificationAction: { type: 'verify-transaction' },
      fallbackToMethodChooser: true,
      showCloseButton: false,
    });
    fireEvent.press(getByTestId('mock-sheet-dismiss'));
    expect(mockShowSuccessToast).not.toHaveBeenCalled();
  });

  it('opens the fallback chooser when the initial method is dismissed', () => {
    mockAction = { type: 'verify-transaction' };
    mockIsSmsAdded = true;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(getByTestId('mock-sheet-dismiss'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: { type: 'verify-transaction' },
        showMethodChooser: true,
      },
    });
    expect(mockShowSuccessToast).not.toHaveBeenCalled();
  });

  it('shows the error after the fallback chooser is dismissed', () => {
    mockAction = { type: 'verify-transaction' };
    mockPasskeyCount = 0;
    mockIsSmsAdded = true;
    mockShowMethodChooser = true;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(getByTestId('mock-header-close'));

    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      'Verify this transaction to send funds',
      'error',
    );
  });

  it('does not show the error while routing from the chooser to SMS', () => {
    mockAction = { type: 'verify-transaction' };
    mockPasskeyCount = 0;
    mockIsSmsAdded = true;
    mockShowMethodChooser = true;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.SMS_METHOD),
    );
    fireEvent.press(getByTestId('mock-sheet-dismiss'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SMS_SETUP, {
      initialStep: 'verify',
      verificationAction: { type: 'verify-transaction' },
      fallbackToMethodChooser: true,
      showCloseButton: false,
    });
    expect(mockShowSuccessToast).not.toHaveBeenCalled();
  });

  it('opens directly into the only available transaction method', () => {
    mockAction = { type: 'verify-transaction' };
    mockPasskeyCount = 0;
    mockIsAuthenticatorAdded = false;
    mockIsSmsAdded = true;
    renderWithProvider(<MoneySecurityVerificationSheet />);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SMS_SETUP, {
      initialStep: 'verify',
      verificationAction: { type: 'verify-transaction' },
      fallbackToMethodChooser: false,
      showCloseButton: true,
    });
    expect(mockShowSuccessToast).not.toHaveBeenCalled();
  });
});
