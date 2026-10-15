import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneyEmailCodeVerificationView from './MoneyEmailCodeVerificationView';
import { MoneyEmailCodeVerificationViewTestIds } from './MoneyEmailCodeVerificationView.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockMarkEmailVerified = jest.fn();
const mockRemoveAuthenticator = jest.fn();
const mockRemoveSms = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
const mockShowSuccessToast = jest.fn();
const mockCompletePrototypeMoneySend = jest.fn();
let mockVerificationAction: MoneySecurityVerificationAction | undefined;
let mockReturnToSecurity = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      email: 'cool@gmail.com',
      verificationAction: mockVerificationAction,
      returnToSecurity: mockReturnToSecurity,
    },
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    markEmailVerified: mockMarkEmailVerified,
    passkeyCount: 1,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
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

describe('MoneyEmailCodeVerificationView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockVerificationAction = undefined;
    mockReturnToSecurity = false;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('accepts any six-digit code other than the prototype error codes', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    expect(
      getByText(
        'We sent a 6-digit code to c•••l@gmail.com. Enter it below to verify your email.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
    ).toHaveProp('keyboardType', 'phone-pad');

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockMarkEmailVerified).toHaveBeenCalledWith('cool@gmail.com');

    act(() => jest.advanceTimersByTime(300));
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Email verified');
  });

  it('shows the incorrect-code message for 000000', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '000000',
    );

    expect(
      getByText('That code isn’t right. Check it and try again.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
    ).toHaveProp('value', '');
  });

  it('shows the expired state for 999999 and gets a new code', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '999999',
    );

    expect(
      getByText('Your verification code expired, get a new code.'),
    ).toBeOnTheScreen();
    fireEvent.press(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.RESEND_BUTTON),
    );
    expect(getByText('Resend code in 30s')).toBeOnTheScreen();
  });

  it('enables resend after 30 seconds', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );
    const resendButton = getByTestId(
      MoneyEmailCodeVerificationViewTestIds.RESEND_BUTTON,
    );

    expect(getByText('Resend code in 30s')).toBeOnTheScreen();
    expect(resendButton).toBeDisabled();

    act(() => jest.advanceTimersByTime(30000));

    expect(getByText('Resend code')).toBeOnTheScreen();
    expect(resendButton).not.toBeDisabled();
  });

  it('pastes a random valid prototype code and verifies it', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.press(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.PASTE_BUTTON),
    );

    expect(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
    ).toHaveProp('value', '500000');
    expect(mockMarkEmailVerified).toHaveBeenCalledWith('cool@gmail.com');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('completes transaction verification with an email code', () => {
    mockVerificationAction = { type: 'verify-transaction' };
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockCompletePrototypeMoneySend).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      mockShowSuccessToast,
    );
    expect(mockMarkEmailVerified).not.toHaveBeenCalled();
  });

  it('returns to Settings after adding email from Settings', () => {
    mockReturnToSecurity = true;
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockMarkEmailVerified).toHaveBeenCalledWith('cool@gmail.com');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Email verified',
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.HOME_TABS,
      expect.anything(),
    );
  });

  it('enables 2-step verification with an email code', () => {
    mockVerificationAction = { type: 'enable-transaction-verification' };
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockMarkEmailVerified).not.toHaveBeenCalled();
  });

  it('returns to the previous screen after enabling from Settings', () => {
    mockVerificationAction = {
      type: 'enable-transaction-verification',
      returnToPrevious: true,
    };
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(true);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.HOME_TABS,
      expect.anything(),
    );
  });

  it('disables 2-step verification with an email code', () => {
    mockVerificationAction = {
      type: 'disable-transaction-verification',
      returnToMoneyHome: true,
    };
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockMarkEmailVerified).not.toHaveBeenCalled();
  });

  it('removes an authenticator app with an email code', () => {
    mockVerificationAction = { type: 'remove-authenticator' };
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockRemoveAuthenticator).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'Authenticator app removed',
    });
    expect(mockMarkEmailVerified).not.toHaveBeenCalled();
  });

  it('removes SMS with an email code', () => {
    mockVerificationAction = { type: 'remove-sms' };
    const { getByTestId } = renderWithProvider(
      <MoneyEmailCodeVerificationView />,
    );

    fireEvent.changeText(
      getByTestId(MoneyEmailCodeVerificationViewTestIds.CODE_INPUT),
      '123456',
    );

    expect(mockRemoveSms).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'SMS removed',
    });
    expect(mockMarkEmailVerified).not.toHaveBeenCalled();
  });
});
