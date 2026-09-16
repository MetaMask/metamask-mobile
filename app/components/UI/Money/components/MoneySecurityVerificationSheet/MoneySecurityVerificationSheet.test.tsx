import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySecurityVerificationSheet from './MoneySecurityVerificationSheet';
import { MoneySecurityVerificationSheetTestIds } from './MoneySecurityVerificationSheet.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDeletePasskey = jest.fn();
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
let mockIsAuthenticatorAdded = true;
let mockIsSmsAdded = false;
let mockShowMethodChooser = false;
let mockDefaultVerificationMethod: 'passkeys' | 'authenticator' | 'sms' =
  'passkeys';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
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
    passkeyCount: mockPasskeyCount,
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
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON),
    );
    act(() => jest.advanceTimersByTime(700));

    expect(mockCompletePrototypeMoneySend).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      mockShowSuccessToast,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockCloseBottomSheet).not.toHaveBeenCalled();
  });

  it('launches the configured transaction method before showing the chooser', () => {
    mockAction = { type: 'verify-transaction' };
    mockIsSmsAdded = true;
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    expect(getByText('Passkey')).toBeOnTheScreen();
    expect(queryByTestId('mock-header-back')).not.toBeOnTheScreen();
    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_VERIFY_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_METHOD),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneySecurityVerificationSheetTestIds.SMS_METHOD),
    ).not.toBeOnTheScreen();
  });

  it('shows the default method as primary after the initial method is dismissed', () => {
    mockAction = { type: 'verify-transaction' };
    mockIsSmsAdded = true;
    const { getByTestId, getByText } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(getByTestId('mock-header-close'));

    expect(getByText('or')).toBeOnTheScreen();
    expect(getByText('Passkey')).toBeOnTheScreen();
    expect(getByText('Authenticator app')).toBeOnTheScreen();
    expect(getByText('SMS')).toBeOnTheScreen();
    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.PASSKEY_METHOD),
    ).toHaveProp('accessibilityState', { selected: true });
    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.AUTHENTICATOR_METHOD),
    ).toHaveProp('accessibilityState', { selected: false });
    expect(
      getByTestId(MoneySecurityVerificationSheetTestIds.SMS_METHOD),
    ).toHaveProp('accessibilityState', { selected: false });

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

  it('opens the fallback chooser when the initial method sheet is dismissed', () => {
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
    mockIsSmsAdded = true;
    mockShowMethodChooser = true;
    const { getByTestId } = renderWithProvider(
      <MoneySecurityVerificationSheet />,
    );

    fireEvent.press(getByTestId('mock-header-close'));

    expect(mockShowSuccessToast).toHaveBeenCalledWith(
      'Transaction needs to be verified before sending funds.',
      'error',
    );
  });

  it('does not show the error while routing from the chooser to SMS', () => {
    mockAction = { type: 'verify-transaction' };
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
