import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../../component-library/components/Toast';
import ClipboardManager from '../../../../../core/ClipboardManager';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyAuthenticatorView from './MoneyAuthenticatorView';
import { MoneyAuthenticatorViewTestIds } from './MoneyAuthenticatorView.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAddAuthenticator = jest.fn();
const mockDeletePasskey = jest.fn();
const mockRemoveSms = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
const mockMarkTaskComplete = jest.fn();
const mockShowToast = jest.fn();
let mockEntryPoint: 'finish_setup' | 'security' = 'security';
let mockIsSocialLogin = false;
let mockInitialStep: 'setup' | 'verify' | undefined;
let mockVerificationAction: MoneySecurityVerificationAction | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      entryPoint: mockEntryPoint,
      initialStep: mockInitialStep,
      verificationAction: mockVerificationAction,
    },
  }),
}));

jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="qr-code" />;
});

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    deletePasskey: mockDeletePasskey,
    markTaskComplete: mockMarkTaskComplete,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    addAuthenticator: mockAddAuthenticator,
    isSocialAdded: false,
    isSocialLogin: mockIsSocialLogin,
    removeSms: mockRemoveSms,
    setTransactionVerificationEnabled: mockSetTransactionVerificationEnabled,
  }),
}));

const renderView = () =>
  renderWithProvider(
    <ToastContext.Provider
      value={{
        toastRef: {
          current: {
            showToast: mockShowToast,
            closeToast: jest.fn(),
          },
        },
      }}
    >
      <MoneyAuthenticatorView />
    </ToastContext.Provider>,
  );

describe('MoneyAuthenticatorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntryPoint = 'security';
    mockIsSocialLogin = false;
    mockInitialStep = undefined;
    mockVerificationAction = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows manual setup and opens the QR code sheet', async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = renderView();

    expect(queryByText('Set up an authenticator app')).not.toBeOnTheScreen();
    expect(
      getByText('JBSW Y3DP EHPK 3PXP KRSX G5DS\nMFRG GZDF'),
    ).toBeOnTheScreen();
    expect(getByText('How to set up')).toBeOnTheScreen();
    expect(
      getByText(
        'Download an authenticator app, add a new account manually, and paste the setup key.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Setup key')).toBeOnTheScreen();
    expect(queryByText('Or')).not.toBeOnTheScreen();
    expect(getByText('Copy key')).toBeOnTheScreen();
    expect(queryByTestId('qr-code')).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyAuthenticatorViewTestIds.QR_SETUP_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.AUTHENTICATOR_KEY_SHEET,
      params: { entryPoint: 'security' },
    });

    fireEvent.press(getByTestId(MoneyAuthenticatorViewTestIds.COPY_BUTTON));
    await waitFor(() =>
      expect(ClipboardManager.setString).toHaveBeenCalledWith(
        'JBSWY3DPEHPK3PXPKRSXG5DSMFRGGZDF',
      ),
    );
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            expect.objectContaining({
              label: 'Copied',
            }),
          ],
        }),
      ),
    );

    expect(
      getByText('Open your authenticator app and enter the 6-digit code.'),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyAuthenticatorViewTestIds.CODE_ENTRY)).toHaveStyle({
      marginTop: 16,
    });
  });

  it('accepts any six-digit code and completes setup', async () => {
    jest.useFakeTimers();
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(MoneyAuthenticatorViewTestIds.COPY_BUTTON));
    await waitFor(() =>
      expect(
        getByTestId(MoneyAuthenticatorViewTestIds.CODE_INPUT),
      ).toBeOnTheScreen(),
    );
    fireEvent.changeText(
      getByTestId(MoneyAuthenticatorViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(mockAddAuthenticator).toHaveBeenCalledTimes(1);
    expect(mockMarkTaskComplete).toHaveBeenCalledWith('recovery_method');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Authenticator app added',
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows an inline error for the prototype invalid code', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText } = renderView();

    fireEvent.press(getByTestId(MoneyAuthenticatorViewTestIds.COPY_BUTTON));
    await waitFor(() =>
      expect(
        getByTestId(MoneyAuthenticatorViewTestIds.CODE_INPUT),
      ).toBeOnTheScreen(),
    );
    fireEvent.changeText(
      getByTestId(MoneyAuthenticatorViewTestIds.CODE_INPUT),
      '000000',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(getByText('This code is not correct. Try again.')).toBeOnTheScreen();
    expect(getByTestId(MoneyAuthenticatorViewTestIds.CODE_INPUT)).toHaveProp(
      'value',
      '',
    );
    expect(mockAddAuthenticator).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('completes a security action from full-page authenticator verification', () => {
    jest.useFakeTimers();
    mockInitialStep = 'verify';
    mockVerificationAction = {
      type: 'disable-transaction-verification',
    };
    const { getByTestId } = renderView();

    fireEvent.changeText(
      getByTestId(MoneyAuthenticatorViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY);
    expect(mockAddAuthenticator).not.toHaveBeenCalled();
  });

  it('does not offer social login from the SRP finish-setup entry point', () => {
    mockEntryPoint = 'finish_setup';
    const { queryByTestId, queryByText } = renderView();

    expect(queryByText('Add social instead')).toBeNull();
    expect(
      queryByTestId(MoneyAuthenticatorViewTestIds.ALTERNATIVE_BUTTON),
    ).toBeNull();
  });

  it('offers SMS recovery to social-login users', () => {
    mockEntryPoint = 'finish_setup';
    mockIsSocialLogin = true;

    const { getByTestId, getByText } = renderView();

    expect(getByText('Use SMS instead')).toBeOnTheScreen();
    fireEvent.press(
      getByTestId(MoneyAuthenticatorViewTestIds.ALTERNATIVE_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SMS_SETUP, {
      returnToMoneyHome: true,
    });
    expect(mockMarkTaskComplete).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
