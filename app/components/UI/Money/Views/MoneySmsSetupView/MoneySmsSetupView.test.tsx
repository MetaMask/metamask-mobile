import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySmsSetupView from './MoneySmsSetupView';
import { MoneySmsSetupViewTestIds } from './MoneySmsSetupView.testIds';

const mockAddSms = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockMarkTaskComplete = jest.fn();
const mockShowToast = jest.fn();
let mockReturnToMoneyHome = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { returnToMoneyHome: mockReturnToMoneyHome },
  }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    addSms: mockAddSms,
  }),
}));

jest.mock('../../hooks/useMoneyFinishSetup', () => ({
  useMoneyFinishSetup: () => ({
    markTaskComplete: mockMarkTaskComplete,
  }),
}));

jest.mock('../../hooks/useMoneySecurityToast', () => ({
  useMoneySecurityToast: () => mockShowToast,
}));

const renderView = () => renderWithProvider(<MoneySmsSetupView />);

describe('MoneySmsSetupView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockReturnToMoneyHome = false;
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
      successToast: 'SMS added',
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
    mockReturnToMoneyHome = true;
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
    expect(mockShowToast).toHaveBeenCalledWith('SMS added');
  });
});
