import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySmsSetupView from './MoneySmsSetupView';
import { MoneySmsSetupViewTestIds } from './MoneySmsSetupView.testIds';
import type { MoneySecurityVerificationAction } from '../../types/navigation';
import { completePrototypeMoneySend } from '../../utils/completePrototypeMoneySend';

const mockAddSms = jest.fn();
const mockDeletePasskey = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockMarkTaskComplete = jest.fn();
const mockRemoveAuthenticator = jest.fn();
const mockRemoveSms = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
const mockShowToast = jest.fn();
let mockRouteParams: {
  returnToMoneyHome?: boolean;
  initialStep?: 'phone' | 'verify';
  verificationAction?: MoneySecurityVerificationAction;
  fallbackToMethodChooser?: boolean;
  showCloseButton?: boolean;
} = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    addSms: mockAddSms,
    removeAuthenticator: mockRemoveAuthenticator,
    removeSms: mockRemoveSms,
    setTransactionVerificationEnabled: mockSetTransactionVerificationEnabled,
    smsPhoneNumber: '+15555550182',
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    deletePasskey: mockDeletePasskey,
    markTaskComplete: mockMarkTaskComplete,
  }),
}));

jest.mock('../../hooks/useMoneySecurityToast', () => ({
  useMoneySecurityToast: () => mockShowToast,
}));

jest.mock('../../utils/completePrototypeMoneySend');

const renderView = () => renderWithProvider(<MoneySmsSetupView />);

describe('MoneySmsSetupView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collects a phone number and sends a verification code', () => {
    const { getByTestId, getByText } = renderView();

    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.PHONE_INPUT),
      '4155550123',
    );
    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.CONTINUE_BUTTON));

    expect(
      getByText('Enter the 6-digit code sent to +1 ••• ••• 0123.'),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneySmsSetupViewTestIds.CODE_ENTRY)).toHaveStyle({
      marginTop: 16,
    });
  });

  it('shows a toast after resending the code', () => {
    const { getByTestId, getByText } = renderView();

    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.PHONE_INPUT),
      '4155550123',
    );
    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.CONTINUE_BUTTON));
    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.RESEND_BUTTON));

    expect(getByText('Resend code')).toBeOnTheScreen();
    expect(getByTestId(MoneySmsSetupViewTestIds.RESEND_BUTTON)).toHaveProp(
      'accessibilityRole',
      'button',
    );
    expect(mockShowToast).toHaveBeenCalledWith('Code resent');
  });

  it('automatically completes after any six-digit code', () => {
    const { getByTestId } = renderView();

    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.PHONE_INPUT),
      '4155550123',
    );
    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.CONTINUE_BUTTON));
    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(mockAddSms).toHaveBeenCalledWith('+14155550123');
    expect(mockMarkTaskComplete).toHaveBeenCalledWith('recovery_method');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MANAGE_SECURITY, {
      successToast: 'SMS verification added',
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows an inline error for the prototype invalid code', () => {
    const { getByTestId, getByText } = renderView();

    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.PHONE_INPUT),
      '4155550123',
    );
    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.CONTINUE_BUTTON));
    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.CODE_INPUT),
      '000000',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(getByText('This code is not correct. Try again.')).toBeOnTheScreen();
    expect(getByTestId(MoneySmsSetupViewTestIds.CODE_INPUT)).toHaveProp(
      'value',
      '',
    );
    expect(mockAddSms).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('returns to Money home after finish-setup SMS recovery is added', () => {
    mockRouteParams = { returnToMoneyHome: true };
    const { getByTestId } = renderView();

    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.PHONE_INPUT),
      '4155550123',
    );
    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.CONTINUE_BUTTON));
    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockGoBack).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));
    expect(mockShowToast).toHaveBeenCalledWith('SMS verification added');
  });

  it('shows transaction SMS verification as a full screen with a top-right close button', () => {
    mockRouteParams = {
      initialStep: 'verify',
      verificationAction: { type: 'verify-transaction' },
      showCloseButton: true,
    };
    const { getByTestId, queryByTestId } = renderView();

    expect(getByTestId(MoneySmsSetupViewTestIds.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(MoneySmsSetupViewTestIds.BACK_BUTTON)).toHaveProp(
      'accessibilityLabel',
      'Close',
    );
    expect(
      queryByTestId(MoneySmsSetupViewTestIds.PHONE_INPUT),
    ).not.toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneySmsSetupViewTestIds.BACK_BUTTON));

    expect(mockShowToast).toHaveBeenCalledWith(
      'Verify this transaction to send funds.',
      'error',
    );
  });

  it('returns selected SMS verification to the method chooser without a toast', () => {
    mockRouteParams = {
      initialStep: 'verify',
      verificationAction: { type: 'verify-transaction' },
      fallbackToMethodChooser: true,
    };
    const { getByTestId } = renderView();

    const backButton = getByTestId(MoneySmsSetupViewTestIds.BACK_BUTTON);
    expect(backButton).toHaveProp('accessibilityLabel', 'Back');
    fireEvent.press(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: { type: 'verify-transaction' },
        showMethodChooser: true,
      },
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('completes transaction verification from the full-screen SMS page', () => {
    mockRouteParams = {
      initialStep: 'verify',
      verificationAction: { type: 'verify-transaction' },
    };
    const { getByTestId } = renderView();

    fireEvent.changeText(
      getByTestId(MoneySmsSetupViewTestIds.CODE_INPUT),
      '123456',
    );
    act(() => jest.advanceTimersByTime(250));

    expect(completePrototypeMoneySend).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      mockShowToast,
    );
  });
});
